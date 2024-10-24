import { uncompress } from "snappy";
import * as base64 from "@std/encoding/base64";
import {
	CMsgClientToGCGetActiveMatches,
	CMsgClientToGCGetActiveMatchesResponse,
	CMsgClientToGCGetMatchMetaData,
	CMsgClientToGCGetMatchMetaDataResponse,
	CMsgClientToGCSpectateLobby,
	CMsgClientToGCSpectateLobbyResponse,
	EGCCitadelClientMessages,
} from "@nsu-proxy/deadlock-protos/citadel_gcmessages_client";
import { type FetchError, ofetch, type $Fetch } from "ofetch";
import { logger } from "../log.js";
import { EGCPlatform } from "@nsu-proxy/deadlock-protos/steammessages";
import { ECitadelRegionMode } from "@nsu-proxy/deadlock-protos/citadel_gcmessages_common";

export class BotClient {
	private http: $Fetch;

	public constructor({ token, url }: { token: string; url: string }) {
		this.http = ofetch.create({
			baseURL: url,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
	}

	public async spectateMatch(lobbyId: bigint): Promise<CMsgClientToGCSpectateLobbyResponse | undefined> {
		const binaryBody = CMsgClientToGCSpectateLobby.toBinary({
			lobby_id: lobbyId,
			client_platform: EGCPlatform.k_eGCPlatform_PC,
			client_version: 5261,
			region_mode: ECitadelRegionMode.k_ECitadelRegionMode_ROW,
		});

		const response = await this.req({
			messageType: EGCCitadelClientMessages.k_EMsgClientToGCSpectateLobby,
			timeoutMillis: 10_000,
			rateLimitMillis: 2_000,
			data: Buffer.from(binaryBody),
		});
		if (!response) return;

		const spectateRes = CMsgClientToGCSpectateLobbyResponse.fromBinary(Buffer.from(response));

		logger.info({ spectateRes }, "Got spectate response back");
		return spectateRes;
	}

	public async getMatch(matchId: bigint): Promise<CMsgClientToGCGetMatchMetaDataResponse | undefined> {
		const binaryBody = CMsgClientToGCGetMatchMetaData.toBinary({
			match_id: matchId,
		});

		const response = await this.req({
			messageType: EGCCitadelClientMessages.k_EMsgClientToGCGetMatchMetaData,
			timeoutMillis: 10_000,
			rateLimitMillis: 36_000,
			data: Buffer.from(binaryBody),
		});
		if (!response) return;

		const match = CMsgClientToGCGetMatchMetaDataResponse.fromBinary(Buffer.from(response));

		logger.info("Got match metadata for match_id %s: %O", matchId, match);
		return match;
	}

	public async getActiveMatches(): Promise<CMsgClientToGCGetActiveMatchesResponse | undefined> {
		const binaryBody = CMsgClientToGCGetActiveMatches.toBinary({});
		const response = await this.req({
			messageType: EGCCitadelClientMessages.k_EMsgClientToGCGetActiveMatches,
			timeoutMillis: 10_000,
			rateLimitMillis: 5_000,
			data: Buffer.from(binaryBody),
		});

		if (!response) return;

		// 7 bytes is the magic number after node-steam-user goes and removes some of the header.
		// we need to remove the 7 bytes in order to get to only the clean snappy data.
		//
		// (the total header size is 24 bytes)
		const cleanHeaderPayload = Buffer.from(response.slice(7));
		const decompressed = (await uncompress(cleanHeaderPayload, {
			asBuffer: true,
			copyOutputData: true,
		})) as Buffer;

		const activeMatches = CMsgClientToGCGetActiveMatchesResponse.fromBinary(Uint8Array.from(decompressed));

		return activeMatches;
	}

	private async req({
		messageType,
		timeoutMillis,
		data,
		rateLimitMillis,
	}: {
		messageType: number;
		timeoutMillis: number;
		rateLimitMillis: number;
		data: Buffer;
	}) {
		try {
			const response = await this.http.raw<{ data: string }>("/pool/invoke-job", {
				method: "POST",
				body: JSON.stringify({
					messageType: messageType,
					timeoutMillis: timeoutMillis,
					rateLimit: {
						messagePeriodMillis: rateLimitMillis,
					},
					limitBufferingBehavior: "too_many_requests",
					data: base64.encodeBase64(data),
				}),
				headers: {
					"Content-Type": "application/json",
					Accepts: "application/json",
				},
				responseType: "json",
			});
			const body = response._data;
			if (!body) return undefined;

			const bufData = base64.decodeBase64(body.data);

			console.log(response.headers);

			return bufData;
		} catch (error) {
			const e = error as FetchError;
			logger.error(e, "Got response error: %j", e.data);
			// logger.error(error, "Got response error: %o");
		}
	}
}
