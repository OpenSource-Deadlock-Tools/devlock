// @generated by protobuf-ts 2.9.4 with parameter use_proto_field_name
// @generated from protobuf file "steammessages_cloud.steamworkssdk.proto" (syntax proto2)
// tslint:disable
import type { RpcTransport } from "@protobuf-ts/runtime-rpc";
import type { ServiceInfo } from "@protobuf-ts/runtime-rpc";
import { Cloud } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_Delete_Response } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_Delete_Request } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_EnumerateUserFiles_Response } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_EnumerateUserFiles_Request } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_GetFileDetails_Response } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_GetFileDetails_Request } from "./steammessages_cloud.steamworkssdk.js";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
import type { CCloud_GetUploadServerInfo_Response } from "./steammessages_cloud.steamworkssdk.js";
import type { CCloud_GetUploadServerInfo_Request } from "./steammessages_cloud.steamworkssdk.js";
import type { UnaryCall } from "@protobuf-ts/runtime-rpc";
import type { RpcOptions } from "@protobuf-ts/runtime-rpc";
/**
 * @generated from protobuf service Cloud
 */
export interface ICloudClient {
	/**
	 * @generated from protobuf rpc: GetUploadServerInfo(CCloud_GetUploadServerInfo_Request) returns (CCloud_GetUploadServerInfo_Response);
	 */
	getUploadServerInfo(
		input: CCloud_GetUploadServerInfo_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_GetUploadServerInfo_Request, CCloud_GetUploadServerInfo_Response>;
	/**
	 * @generated from protobuf rpc: GetFileDetails(CCloud_GetFileDetails_Request) returns (CCloud_GetFileDetails_Response);
	 */
	getFileDetails(
		input: CCloud_GetFileDetails_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_GetFileDetails_Request, CCloud_GetFileDetails_Response>;
	/**
	 * @generated from protobuf rpc: EnumerateUserFiles(CCloud_EnumerateUserFiles_Request) returns (CCloud_EnumerateUserFiles_Response);
	 */
	enumerateUserFiles(
		input: CCloud_EnumerateUserFiles_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_EnumerateUserFiles_Request, CCloud_EnumerateUserFiles_Response>;
	/**
	 * @generated from protobuf rpc: Delete(CCloud_Delete_Request) returns (CCloud_Delete_Response);
	 */
	delete(input: CCloud_Delete_Request, options?: RpcOptions): UnaryCall<CCloud_Delete_Request, CCloud_Delete_Response>;
}
/**
 * @generated from protobuf service Cloud
 */
export class CloudClient implements ICloudClient, ServiceInfo {
	typeName = Cloud.typeName;
	methods = Cloud.methods;
	options = Cloud.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * @generated from protobuf rpc: GetUploadServerInfo(CCloud_GetUploadServerInfo_Request) returns (CCloud_GetUploadServerInfo_Response);
	 */
	getUploadServerInfo(
		input: CCloud_GetUploadServerInfo_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_GetUploadServerInfo_Request, CCloud_GetUploadServerInfo_Response> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CCloud_GetUploadServerInfo_Request, CCloud_GetUploadServerInfo_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetFileDetails(CCloud_GetFileDetails_Request) returns (CCloud_GetFileDetails_Response);
	 */
	getFileDetails(
		input: CCloud_GetFileDetails_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_GetFileDetails_Request, CCloud_GetFileDetails_Response> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CCloud_GetFileDetails_Request, CCloud_GetFileDetails_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: EnumerateUserFiles(CCloud_EnumerateUserFiles_Request) returns (CCloud_EnumerateUserFiles_Response);
	 */
	enumerateUserFiles(
		input: CCloud_EnumerateUserFiles_Request,
		options?: RpcOptions,
	): UnaryCall<CCloud_EnumerateUserFiles_Request, CCloud_EnumerateUserFiles_Response> {
		const method = this.methods[2],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CCloud_EnumerateUserFiles_Request, CCloud_EnumerateUserFiles_Response>(
			"unary",
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: Delete(CCloud_Delete_Request) returns (CCloud_Delete_Response);
	 */
	delete(input: CCloud_Delete_Request, options?: RpcOptions): UnaryCall<CCloud_Delete_Request, CCloud_Delete_Response> {
		const method = this.methods[3],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<CCloud_Delete_Request, CCloud_Delete_Response>("unary", this._transport, method, opt, input);
	}
}