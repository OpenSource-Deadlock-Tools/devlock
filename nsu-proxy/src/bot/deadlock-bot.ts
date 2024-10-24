import {
  CMsgClientToGCGetMatchMetaData,
  CMsgClientToGCGetMatchMetaDataResponse,
  EGCCitadelClientMessages,
} from "@nsu-proxy/deadlock-protos/citadel_gcmessages_client";
import { logger, type Logger } from "../log.js";
import { SteamAdapter } from "../steam/steam-adapter.js";
import { sleep } from "../util.js";
import path from "path";
import type { BotAccountDetails } from "../common.js";

export interface DeadlockBotOpts {
  account: BotAccountDetails;
  saveTokenDirectory: string;
}

export class DeadlockBot {
  private gc: SteamAdapter;
  private logger: Logger;
  private opts: DeadlockBotOpts;

  public constructor(opts: DeadlockBotOpts) {
    this.opts = opts;
    this.gc = DeadlockBot.makeGC(opts);
    this.logger = logger.child({ scope: `bot ${opts.account.username}` });
  }

  public async resetInitializeWithRetry({
    baseSleepTime,
    maxRetries,
  }: {
    baseSleepTime: number;
    maxRetries: number;
  }): Promise<boolean> {
    let retries = 0;

    while (true) {
      retries += 1;
      const sleepTime = baseSleepTime * retries;

      try {
        this.logger.debug(`Attempt #${retries}: reset/initialize with ${sleepTime}ms delay`, {
          retries,
        });
        await this.reset(sleepTime);
        await this.initialize();

        return true;
      } catch (error) {
        if (retries > maxRetries) {
          this.logger.error(
            error,
            "Final error during reset/initialize loop, after all retries exhausted. Failing out",
            { retries },
          );
          throw error;
        }
        this.logger.warn(error, "Error during reset/initialize with retries", {
          retries,
        });
      }
    }
  }

  public async reset(sleepTime: number) {
    this.gc[Symbol.dispose]();
    await sleep(sleepTime);
    this.gc = DeadlockBot.makeGC(this.opts);
  }

  public async initialize(): Promise<void> {
    this.logger.info("Logging in");
    await this.gc.login();
    this.logger.info("Deadlock boot sequence");
    await this.gc.deadlockInitialization();
  }

  public async invokeJob({
    messageType,
    timeoutMillis,
    data,
  }: {
    messageType: number;
    timeoutMillis: number;
    data: Buffer;
  }): Promise<Buffer> {
    this.logger.info("Invoking job for message type: %s", messageType);

    const response = await this.gc.pclient.jobGC({
      type: messageType,
      data,
      opts: {
        signal: AbortSignal.timeout(timeoutMillis),
      },
    });

    return response;
  }

  public async fetchMatch(matchId: bigint): Promise<CMsgClientToGCGetMatchMetaDataResponse> {
    this.logger.info("Fetching metadata for %s", matchId);
    const matchMetaDataResponse = await this.gc.pclient.jobGC({
      type: EGCCitadelClientMessages.k_EMsgClientToGCGetMatchMetaData,
      data: CMsgClientToGCGetMatchMetaData.toBinary({
        match_id: matchId,
      }),
    });

    const decoded = CMsgClientToGCGetMatchMetaDataResponse.fromBinary(matchMetaDataResponse);
    return decoded;
  }

  private static makeGC(opts: DeadlockBotOpts) {
    return new SteamAdapter({
      account: opts.account,
      saveTokenPath: path.join(opts.saveTokenDirectory, `${opts.account.username}_token.txt`),
    });
  }

  [Symbol.dispose]() {
    this.gc[Symbol.dispose]();
  }
}
