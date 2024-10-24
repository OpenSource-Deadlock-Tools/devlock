import fs from "fs";
import { MessageType } from "@protobuf-ts/runtime";
import type SteamUser from "steam-user";

export const DEFAULT_TIMEOUT = 10000;

interface JobGCOpts {
  appIdOverride?: number;

  /**
   * Abort signal to cancel the listener early
   */
  signal?: AbortSignal;
}
interface SendGCOpts {
  appIdOverride?: number;
}
interface WaitForOpts {
  /**
   * Abort signal to cancel the listener early
   */
  signal?: AbortSignal;
}
interface WaitForGCOpts {
  appIdOverride?: number;
  /**
   * Abort signal to cancel the listener early
   */
  signal?: AbortSignal;
}

export class SteamPClient {
  public client: SteamUser;
  public appId: number;

  public constructor(client: SteamUser, appId: number) {
    this.client = client;
    this.appId = appId;
  }

  /**
   * Send a job-based message and expect a response
   */
  public async jobGC({
    type,
    data,
    opts = {},
  }: {
    type: number;
    data: Buffer | Uint8Array;
    opts?: JobGCOpts;
  }): Promise<Buffer> {
    const signal = opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT);
    const answer = new Promise<Buffer>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
      }
      this.client.sendToGC(opts.appIdOverride ?? this.appId, type, {}, Buffer.from(data), (_appId, _type, payload) => {
        resolve(payload);
      });

      signal.addEventListener("abort", () => {
        reject(new Error("jobGC aborted", { cause: signal.reason }));
      });
    });

    try {
      return await answer;
    } catch (error) {
      throw new Error("jobGC failed", { cause: error });
    }
  }

  /**
   * Send a message without expecting a response
   */
  public sendGC({
    type,
    data,
    opts = {},
  }: {
    type: number;
    data: Buffer | Uint8Array;
    opts?: SendGCOpts;
  }): void {
    this.client.sendToGC(opts.appIdOverride ?? this.appId, type, {}, Buffer.from(data));
  }

  /**
   * Wait for any event to fire, returning the result
   */
  public async waitFor<K extends keyof SteamUser.Events>({
    event,
    opts = {},
  }: {
    event: K;
    opts?: WaitForOpts;
  }): Promise<SteamUser.Events[K]> {
    const signal = opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT);

    const answer = new Promise<SteamUser.Events[K]>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
      }

      const abortFn = () => {
        reject(signal.reason);
      };

      const fn = (...args: SteamUser.Events[K]) => {
        resolve(args);
      };

      this.client.once(event, fn);

      signal.addEventListener("abort", abortFn);
    });

    try {
      return await answer;
    } catch (error) {
      throw new Error("waitFor failed", { cause: error });
    }
  }

  /**
   * Wait for a GC event of a specific type to be received, returning the result
   */
  public async waitForGC<T extends object = Buffer>({
    type,
    parseWith: parseWith,
    opts = {},
  }: T extends Buffer
    ? { type: number; parseWith?: undefined; opts?: WaitForGCOpts }
    : {
        type: number;
        parseWith: MessageType<T>;
        opts?: WaitForGCOpts;
      }): Promise<T> {
    const appId = opts.appIdOverride ?? this.appId;
    const signal = opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT);

    const answer = new Promise<Buffer>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
      }

      const fn = (receivedAppId: number, receivedType: number, payload: Buffer) => {
        if (receivedAppId === appId && receivedType === type) {
          this.client.off("receivedFromGC", fn);
          resolve(payload);
        }
      };

      // Listen for a random message from the GC to confirm the app has launched
      this.client.on("receivedFromGC", fn);

      signal.addEventListener("abort", () => {
        this.client.off("receivedFromGC", fn);
        reject(signal.reason);
      });
    });

    try {
      if (parseWith) {
        const buf = await answer;
        return parseWith.fromBinary(buf) as T; // Parse the buffer into the message type
      }

      return (await answer) as T; // Return Buffer when no protoMessage is provided
    } catch (error) {
      throw new Error("waitForGC failed", { cause: error });
    }
  }
}
