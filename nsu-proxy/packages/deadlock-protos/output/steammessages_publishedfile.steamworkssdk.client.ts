// @generated by protobuf-ts 2.9.4 with parameter use_proto_field_name
// @generated from protobuf file "steammessages_publishedfile.steamworkssdk.proto" (syntax proto2)
// tslint:disable
import type { RpcTransport } from "@protobuf-ts/runtime-rpc";
import type { ServiceInfo } from "@protobuf-ts/runtime-rpc";
import { PublishedFile } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_RefreshVotingQueue_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_RefreshVotingQueue_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Update_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Update_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_GetUserFiles_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_GetUserFiles_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_GetDetails_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_GetDetails_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Publish_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Publish_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Unsubscribe_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Unsubscribe_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
import type { CPublishedFile_Subscribe_Response } from "./steammessages_publishedfile.steamworkssdk.js";
import type { CPublishedFile_Subscribe_Request } from "./steammessages_publishedfile.steamworkssdk.js";
import type { UnaryCall } from "@protobuf-ts/runtime-rpc";
import type { RpcOptions } from "@protobuf-ts/runtime-rpc";
/**
 * @generated from protobuf service PublishedFile
 */
export interface IPublishedFileClient {
	/**
	 * @generated from protobuf rpc: Subscribe(CPublishedFile_Subscribe_Request) returns (CPublishedFile_Subscribe_Response);
	 */
	subscribe(
		input: CPublishedFile_Subscribe_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Subscribe_Request, CPublishedFile_Subscribe_Response>;
	/**
	 * @generated from protobuf rpc: Unsubscribe(CPublishedFile_Unsubscribe_Request) returns (CPublishedFile_Unsubscribe_Response);
	 */
	unsubscribe(
		input: CPublishedFile_Unsubscribe_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Unsubscribe_Request, CPublishedFile_Unsubscribe_Response>;
	/**
	 * @generated from protobuf rpc: Publish(CPublishedFile_Publish_Request) returns (CPublishedFile_Publish_Response);
	 */
	publish(
		input: CPublishedFile_Publish_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Publish_Request, CPublishedFile_Publish_Response>;
	/**
	 * @generated from protobuf rpc: GetDetails(CPublishedFile_GetDetails_Request) returns (CPublishedFile_GetDetails_Response);
	 */
	getDetails(
		input: CPublishedFile_GetDetails_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_GetDetails_Request, CPublishedFile_GetDetails_Response>;
	/**
	 * @generated from protobuf rpc: GetUserFiles(CPublishedFile_GetUserFiles_Request) returns (CPublishedFile_GetUserFiles_Response);
	 */
	getUserFiles(
		input: CPublishedFile_GetUserFiles_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_GetUserFiles_Request, CPublishedFile_GetUserFiles_Response>;
	/**
	 * @generated from protobuf rpc: Update(CPublishedFile_Update_Request) returns (CPublishedFile_Update_Response);
	 */
	update(
		input: CPublishedFile_Update_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Update_Request, CPublishedFile_Update_Response>;
	/**
	 * @generated from protobuf rpc: RefreshVotingQueue(CPublishedFile_RefreshVotingQueue_Request) returns (CPublishedFile_RefreshVotingQueue_Response);
	 */
	refreshVotingQueue(
		input: CPublishedFile_RefreshVotingQueue_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_RefreshVotingQueue_Request, CPublishedFile_RefreshVotingQueue_Response>;
}
/**
 * @generated from protobuf service PublishedFile
 */
export class PublishedFileClient implements IPublishedFileClient, ServiceInfo {
	typeName = PublishedFile.typeName;
	methods = PublishedFile.methods;
	options = PublishedFile.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * @generated from protobuf rpc: Subscribe(CPublishedFile_Subscribe_Request) returns (CPublishedFile_Subscribe_Response);
	 */
	subscribe(
		input: CPublishedFile_Subscribe_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Subscribe_Request, CPublishedFile_Subscribe_Response> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_Subscribe_Request, CPublishedFile_Subscribe_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: Unsubscribe(CPublishedFile_Unsubscribe_Request) returns (CPublishedFile_Unsubscribe_Response);
	 */
	unsubscribe(
		input: CPublishedFile_Unsubscribe_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Unsubscribe_Request, CPublishedFile_Unsubscribe_Response> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_Unsubscribe_Request, CPublishedFile_Unsubscribe_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: Publish(CPublishedFile_Publish_Request) returns (CPublishedFile_Publish_Response);
	 */
	publish(
		input: CPublishedFile_Publish_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Publish_Request, CPublishedFile_Publish_Response> {
		const method = this.methods[2],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_Publish_Request, CPublishedFile_Publish_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetDetails(CPublishedFile_GetDetails_Request) returns (CPublishedFile_GetDetails_Response);
	 */
	getDetails(
		input: CPublishedFile_GetDetails_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_GetDetails_Request, CPublishedFile_GetDetails_Response> {
		const method = this.methods[3],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_GetDetails_Request, CPublishedFile_GetDetails_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetUserFiles(CPublishedFile_GetUserFiles_Request) returns (CPublishedFile_GetUserFiles_Response);
	 */
	getUserFiles(
		input: CPublishedFile_GetUserFiles_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_GetUserFiles_Request, CPublishedFile_GetUserFiles_Response> {
		const method = this.methods[4],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_GetUserFiles_Request, CPublishedFile_GetUserFiles_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: Update(CPublishedFile_Update_Request) returns (CPublishedFile_Update_Response);
	 */
	update(
		input: CPublishedFile_Update_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_Update_Request, CPublishedFile_Update_Response> {
		const method = this.methods[5],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_Update_Request, CPublishedFile_Update_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: RefreshVotingQueue(CPublishedFile_RefreshVotingQueue_Request) returns (CPublishedFile_RefreshVotingQueue_Response);
	 */
	refreshVotingQueue(
		input: CPublishedFile_RefreshVotingQueue_Request,
		options?: RpcOptions,
	): UnaryCall<CPublishedFile_RefreshVotingQueue_Request, CPublishedFile_RefreshVotingQueue_Response> {
		const method = this.methods[6],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CPublishedFile_RefreshVotingQueue_Request, CPublishedFile_RefreshVotingQueue_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
}
