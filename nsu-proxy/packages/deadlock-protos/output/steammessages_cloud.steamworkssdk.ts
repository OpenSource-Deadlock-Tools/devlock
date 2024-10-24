// @generated by protobuf-ts 2.9.4 with parameter use_proto_field_name
// @generated from protobuf file "steammessages_cloud.steamworkssdk.proto" (syntax proto2)
// tslint:disable
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
/**
 * @generated from protobuf message CCloud_GetUploadServerInfo_Request
 */
export interface CCloud_GetUploadServerInfo_Request {
	/**
	 * @generated from protobuf field: optional uint32 appid = 1;
	 */
	appid?: number;
}
/**
 * @generated from protobuf message CCloud_GetUploadServerInfo_Response
 */
export interface CCloud_GetUploadServerInfo_Response {
	/**
	 * @generated from protobuf field: optional string server_url = 1;
	 */
	server_url?: string;
}
/**
 * @generated from protobuf message CCloud_GetFileDetails_Request
 */
export interface CCloud_GetFileDetails_Request {
	/**
	 * @generated from protobuf field: optional uint64 ugcid = 1;
	 */
	ugcid?: bigint;
	/**
	 * @generated from protobuf field: optional uint32 appid = 2;
	 */
	appid?: number;
}
/**
 * @generated from protobuf message CCloud_UserFile
 */
export interface CCloud_UserFile {
	/**
	 * @generated from protobuf field: optional uint32 appid = 1;
	 */
	appid?: number;
	/**
	 * @generated from protobuf field: optional uint64 ugcid = 2;
	 */
	ugcid?: bigint;
	/**
	 * @generated from protobuf field: optional string filename = 3;
	 */
	filename?: string;
	/**
	 * @generated from protobuf field: optional uint64 timestamp = 4;
	 */
	timestamp?: bigint;
	/**
	 * @generated from protobuf field: optional uint32 file_size = 5;
	 */
	file_size?: number;
	/**
	 * @generated from protobuf field: optional string url = 6;
	 */
	url?: string;
	/**
	 * @generated from protobuf field: optional fixed64 steamid_creator = 7;
	 */
	steamid_creator?: bigint;
}
/**
 * @generated from protobuf message CCloud_GetFileDetails_Response
 */
export interface CCloud_GetFileDetails_Response {
	/**
	 * @generated from protobuf field: optional CCloud_UserFile details = 1;
	 */
	details?: CCloud_UserFile;
}
/**
 * @generated from protobuf message CCloud_EnumerateUserFiles_Request
 */
export interface CCloud_EnumerateUserFiles_Request {
	/**
	 * @generated from protobuf field: optional uint32 appid = 1;
	 */
	appid?: number;
	/**
	 * @generated from protobuf field: optional bool extended_details = 2;
	 */
	extended_details?: boolean;
	/**
	 * @generated from protobuf field: optional uint32 count = 3;
	 */
	count?: number;
	/**
	 * @generated from protobuf field: optional uint32 start_index = 4;
	 */
	start_index?: number;
}
/**
 * @generated from protobuf message CCloud_EnumerateUserFiles_Response
 */
export interface CCloud_EnumerateUserFiles_Response {
	/**
	 * @generated from protobuf field: repeated CCloud_UserFile files = 1;
	 */
	files: CCloud_UserFile[];
	/**
	 * @generated from protobuf field: optional uint32 total_files = 2;
	 */
	total_files?: number;
}
/**
 * @generated from protobuf message CCloud_Delete_Request
 */
export interface CCloud_Delete_Request {
	/**
	 * @generated from protobuf field: optional string filename = 1;
	 */
	filename?: string;
	/**
	 * @generated from protobuf field: optional uint32 appid = 2;
	 */
	appid?: number;
}
/**
 * @generated from protobuf message CCloud_Delete_Response
 */
export interface CCloud_Delete_Response {}
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_GetUploadServerInfo_Request$Type extends MessageType<CCloud_GetUploadServerInfo_Request> {
	constructor() {
		super("CCloud_GetUploadServerInfo_Request", [
			{
				no: 1,
				name: "appid",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: { description: "App ID to which a file will be uploaded to." },
			},
		]);
	}
	create(value?: PartialMessage<CCloud_GetUploadServerInfo_Request>): CCloud_GetUploadServerInfo_Request {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_GetUploadServerInfo_Request>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_GetUploadServerInfo_Request,
	): CCloud_GetUploadServerInfo_Request {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint32 appid */ 1:
					message.appid = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_GetUploadServerInfo_Request,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint32 appid = 1; */
		if (message.appid !== undefined) writer.tag(1, WireType.Varint).uint32(message.appid);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_GetUploadServerInfo_Request
 */
export const CCloud_GetUploadServerInfo_Request = new CCloud_GetUploadServerInfo_Request$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_GetUploadServerInfo_Response$Type extends MessageType<CCloud_GetUploadServerInfo_Response> {
	constructor() {
		super("CCloud_GetUploadServerInfo_Response", [
			{
				no: 1,
				name: "server_url",
				kind: "scalar",
				localName: "server_url",
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<CCloud_GetUploadServerInfo_Response>): CCloud_GetUploadServerInfo_Response {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_GetUploadServerInfo_Response>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_GetUploadServerInfo_Response,
	): CCloud_GetUploadServerInfo_Response {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string server_url */ 1:
					message.server_url = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_GetUploadServerInfo_Response,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string server_url = 1; */
		if (message.server_url !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.server_url);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_GetUploadServerInfo_Response
 */
export const CCloud_GetUploadServerInfo_Response = new CCloud_GetUploadServerInfo_Response$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_GetFileDetails_Request$Type extends MessageType<CCloud_GetFileDetails_Request> {
	constructor() {
		super("CCloud_GetFileDetails_Request", [
			{
				no: 1,
				name: "ugcid",
				kind: "scalar",
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
				options: { description: "ID of the Cloud file to get details for." },
			},
			{
				no: 2,
				name: "appid",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: { description: "App ID the file belongs to." },
			},
		]);
	}
	create(value?: PartialMessage<CCloud_GetFileDetails_Request>): CCloud_GetFileDetails_Request {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_GetFileDetails_Request>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_GetFileDetails_Request,
	): CCloud_GetFileDetails_Request {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 ugcid */ 1:
					message.ugcid = reader.uint64().toBigInt();
					break;
				case /* optional uint32 appid */ 2:
					message.appid = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_GetFileDetails_Request,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 ugcid = 1; */
		if (message.ugcid !== undefined) writer.tag(1, WireType.Varint).uint64(message.ugcid);
		/* optional uint32 appid = 2; */
		if (message.appid !== undefined) writer.tag(2, WireType.Varint).uint32(message.appid);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_GetFileDetails_Request
 */
export const CCloud_GetFileDetails_Request = new CCloud_GetFileDetails_Request$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_UserFile$Type extends MessageType<CCloud_UserFile> {
	constructor() {
		super("CCloud_UserFile", [
			{
				no: 1,
				name: "appid",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
			},
			{
				no: 2,
				name: "ugcid",
				kind: "scalar",
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: "filename",
				kind: "scalar",
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 4,
				name: "timestamp",
				kind: "scalar",
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: "file_size",
				kind: "scalar",
				localName: "file_size",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
			},
			{
				no: 6,
				name: "url",
				kind: "scalar",
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 7,
				name: "steamid_creator",
				kind: "scalar",
				localName: "steamid_creator",
				opt: true,
				T: 6 /*ScalarType.FIXED64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<CCloud_UserFile>): CCloud_UserFile {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_UserFile>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_UserFile,
	): CCloud_UserFile {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint32 appid */ 1:
					message.appid = reader.uint32();
					break;
				case /* optional uint64 ugcid */ 2:
					message.ugcid = reader.uint64().toBigInt();
					break;
				case /* optional string filename */ 3:
					message.filename = reader.string();
					break;
				case /* optional uint64 timestamp */ 4:
					message.timestamp = reader.uint64().toBigInt();
					break;
				case /* optional uint32 file_size */ 5:
					message.file_size = reader.uint32();
					break;
				case /* optional string url */ 6:
					message.url = reader.string();
					break;
				case /* optional fixed64 steamid_creator */ 7:
					message.steamid_creator = reader.fixed64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(message: CCloud_UserFile, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
		/* optional uint32 appid = 1; */
		if (message.appid !== undefined) writer.tag(1, WireType.Varint).uint32(message.appid);
		/* optional uint64 ugcid = 2; */
		if (message.ugcid !== undefined) writer.tag(2, WireType.Varint).uint64(message.ugcid);
		/* optional string filename = 3; */
		if (message.filename !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.filename);
		/* optional uint64 timestamp = 4; */
		if (message.timestamp !== undefined) writer.tag(4, WireType.Varint).uint64(message.timestamp);
		/* optional uint32 file_size = 5; */
		if (message.file_size !== undefined) writer.tag(5, WireType.Varint).uint32(message.file_size);
		/* optional string url = 6; */
		if (message.url !== undefined) writer.tag(6, WireType.LengthDelimited).string(message.url);
		/* optional fixed64 steamid_creator = 7; */
		if (message.steamid_creator !== undefined) writer.tag(7, WireType.Bit64).fixed64(message.steamid_creator);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_UserFile
 */
export const CCloud_UserFile = new CCloud_UserFile$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_GetFileDetails_Response$Type extends MessageType<CCloud_GetFileDetails_Response> {
	constructor() {
		super("CCloud_GetFileDetails_Response", [{ no: 1, name: "details", kind: "message", T: () => CCloud_UserFile }]);
	}
	create(value?: PartialMessage<CCloud_GetFileDetails_Response>): CCloud_GetFileDetails_Response {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_GetFileDetails_Response>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_GetFileDetails_Response,
	): CCloud_GetFileDetails_Response {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional CCloud_UserFile details */ 1:
					message.details = CCloud_UserFile.internalBinaryRead(reader, reader.uint32(), options, message.details);
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_GetFileDetails_Response,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional CCloud_UserFile details = 1; */
		if (message.details)
			CCloud_UserFile.internalBinaryWrite(
				message.details,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_GetFileDetails_Response
 */
export const CCloud_GetFileDetails_Response = new CCloud_GetFileDetails_Response$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_EnumerateUserFiles_Request$Type extends MessageType<CCloud_EnumerateUserFiles_Request> {
	constructor() {
		super("CCloud_EnumerateUserFiles_Request", [
			{
				no: 1,
				name: "appid",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: { description: "App ID to enumerate the files of." },
			},
			{
				no: 2,
				name: "extended_details",
				kind: "scalar",
				localName: "extended_details",
				opt: true,
				T: 8 /*ScalarType.BOOL*/,
				options: {
					description:
						"(Optional) Get extended details back on the files found. Defaults to only returned the app Id and UGC Id of the files found.",
				},
			},
			{
				no: 3,
				name: "count",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: {
					description:
						"(Optional) Maximum number of results to return on this call. Defaults to a maximum of 500 files returned.",
				},
			},
			{
				no: 4,
				name: "start_index",
				kind: "scalar",
				localName: "start_index",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: {
					description: "(Optional) Starting index to begin enumeration at. Defaults to the beginning of the list.",
				},
			},
		]);
	}
	create(value?: PartialMessage<CCloud_EnumerateUserFiles_Request>): CCloud_EnumerateUserFiles_Request {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_EnumerateUserFiles_Request>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_EnumerateUserFiles_Request,
	): CCloud_EnumerateUserFiles_Request {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint32 appid */ 1:
					message.appid = reader.uint32();
					break;
				case /* optional bool extended_details */ 2:
					message.extended_details = reader.bool();
					break;
				case /* optional uint32 count */ 3:
					message.count = reader.uint32();
					break;
				case /* optional uint32 start_index */ 4:
					message.start_index = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_EnumerateUserFiles_Request,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint32 appid = 1; */
		if (message.appid !== undefined) writer.tag(1, WireType.Varint).uint32(message.appid);
		/* optional bool extended_details = 2; */
		if (message.extended_details !== undefined) writer.tag(2, WireType.Varint).bool(message.extended_details);
		/* optional uint32 count = 3; */
		if (message.count !== undefined) writer.tag(3, WireType.Varint).uint32(message.count);
		/* optional uint32 start_index = 4; */
		if (message.start_index !== undefined) writer.tag(4, WireType.Varint).uint32(message.start_index);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_EnumerateUserFiles_Request
 */
export const CCloud_EnumerateUserFiles_Request = new CCloud_EnumerateUserFiles_Request$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_EnumerateUserFiles_Response$Type extends MessageType<CCloud_EnumerateUserFiles_Response> {
	constructor() {
		super("CCloud_EnumerateUserFiles_Response", [
			{
				no: 1,
				name: "files",
				kind: "message",
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CCloud_UserFile,
			},
			{
				no: 2,
				name: "total_files",
				kind: "scalar",
				localName: "total_files",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
			},
		]);
	}
	create(value?: PartialMessage<CCloud_EnumerateUserFiles_Response>): CCloud_EnumerateUserFiles_Response {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.files = [];
		if (value !== undefined) reflectionMergePartial<CCloud_EnumerateUserFiles_Response>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_EnumerateUserFiles_Response,
	): CCloud_EnumerateUserFiles_Response {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated CCloud_UserFile files */ 1:
					message.files.push(CCloud_UserFile.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* optional uint32 total_files */ 2:
					message.total_files = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_EnumerateUserFiles_Response,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated CCloud_UserFile files = 1; */
		for (let i = 0; i < message.files.length; i++)
			CCloud_UserFile.internalBinaryWrite(
				message.files[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 total_files = 2; */
		if (message.total_files !== undefined) writer.tag(2, WireType.Varint).uint32(message.total_files);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_EnumerateUserFiles_Response
 */
export const CCloud_EnumerateUserFiles_Response = new CCloud_EnumerateUserFiles_Response$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_Delete_Request$Type extends MessageType<CCloud_Delete_Request> {
	constructor() {
		super("CCloud_Delete_Request", [
			{
				no: 1,
				name: "filename",
				kind: "scalar",
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 2,
				name: "appid",
				kind: "scalar",
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
				options: { description: "App ID the file belongs to." },
			},
		]);
	}
	create(value?: PartialMessage<CCloud_Delete_Request>): CCloud_Delete_Request {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_Delete_Request>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_Delete_Request,
	): CCloud_Delete_Request {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string filename */ 1:
					message.filename = reader.string();
					break;
				case /* optional uint32 appid */ 2:
					message.appid = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === "throw")
						throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
					let d = reader.skip(wireType);
					if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CCloud_Delete_Request,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string filename = 1; */
		if (message.filename !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.filename);
		/* optional uint32 appid = 2; */
		if (message.appid !== undefined) writer.tag(2, WireType.Varint).uint32(message.appid);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_Delete_Request
 */
export const CCloud_Delete_Request = new CCloud_Delete_Request$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CCloud_Delete_Response$Type extends MessageType<CCloud_Delete_Response> {
	constructor() {
		super("CCloud_Delete_Response", []);
	}
	create(value?: PartialMessage<CCloud_Delete_Response>): CCloud_Delete_Response {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CCloud_Delete_Response>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CCloud_Delete_Response,
	): CCloud_Delete_Response {
		return target ?? this.create();
	}
	internalBinaryWrite(
		message: CCloud_Delete_Response,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message CCloud_Delete_Response
 */
export const CCloud_Delete_Response = new CCloud_Delete_Response$Type();
/**
 * @generated ServiceType for protobuf service Cloud
 */
export const Cloud = new ServiceType(
	"Cloud",
	[
		{
			name: "GetUploadServerInfo",
			options: {
				method_description: "Returns the URL of the proper cloud server for a user.",
			},
			I: CCloud_GetUploadServerInfo_Request,
			O: CCloud_GetUploadServerInfo_Response,
		},
		{
			name: "GetFileDetails",
			options: { method_description: "Returns details on a Cloud file." },
			I: CCloud_GetFileDetails_Request,
			O: CCloud_GetFileDetails_Response,
		},
		{
			name: "EnumerateUserFiles",
			options: {
				method_description: "Enumerates Cloud files for a user of a given app ID. Returns up to 500 files at a time.",
			},
			I: CCloud_EnumerateUserFiles_Request,
			O: CCloud_EnumerateUserFiles_Response,
		},
		{
			name: "Delete",
			options: { method_description: "Deletes a file from the user's cloud." },
			I: CCloud_Delete_Request,
			O: CCloud_Delete_Response,
		},
	],
	{ service_description: "A service for Steam Cloud operations." },
);