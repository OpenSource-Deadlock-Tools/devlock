import path from "path";
import fs from "node:fs/promises";
import SteamUser from "steam-user";
import { SteamPClient } from "./steam-promise-client.js";
import { logger } from "../log.js";
import { fileExists } from "../util.js";
import { CMsgCitadelClientHello, EGCCitadelClientMessages } from "@nsu-proxy/deadlock-protos/citadel_gcmessages_client";
import { EGCBaseClientMsg } from "@nsu-proxy/deadlock-protos/gcsystemmsgs";
import { ECitadelRegionMode } from "@nsu-proxy/deadlock-protos/citadel_gcmessages_common";
import type { BotAccountDetails } from "../common.js";

export const DEADLOCK_APP_ID = 1422450;
export const DEFAULT_TIMEOUT = 5000;
export const STARTUP_TIMEOUT = 15000;
export const TEN_MINUETS = 10 * 60 * 1000;

export interface SteamGCOpts {
  account: BotAccountDetails;
  saveTokenPath: string;
}

export class SteamAdapter {
  #rawClient: SteamUser;
  #rawpClient: SteamPClient;

  private opts: SteamGCOpts;

  private abc: AbortController;

  public constructor(opts: SteamGCOpts) {
    this.abc = new AbortController();
    // this.abc.signal.addEventListener("abort", (ev) => {
    //   logger.warn("Got abort event from SteamGC", { ev });
    // });
    this.#rawClient = SteamAdapter.makeSteamUser(opts, this.abc);
    this.#rawpClient = new SteamPClient(this.#rawClient, DEADLOCK_APP_ID);
    this.opts = opts;
  }

  public get client() {
    this.abc.signal.throwIfAborted();
    return this.#rawClient;
  }

  public get pclient() {
    this.abc.signal.throwIfAborted();
    return this.#rawpClient;
  }

  public async login() {
    const loggedIn = this.pclient.waitFor({
      event: "loggedOn",
      opts: {
        signal: AbortSignal.timeout(STARTUP_TIMEOUT),
      },
    });

    if (await fileExists(this.opts.saveTokenPath)) {
      const refreshToken = await fs.readFile(this.opts.saveTokenPath, {
        encoding: "utf8",
      });
      logger.debug("Sending logOn with token");
      this.client.logOn({
        clientOS: SteamUser.EOSType.Win10,
        autoRelogin: true,
        refreshToken,
      });
    } else {
      logger.debug("Sending logOn with username/password");
      this.client.logOn({
        clientOS: SteamUser.EOSType.Win10,
        autoRelogin: true,
        accountName: this.opts.account.username,
        password: this.opts.account.password,
      });
    }

    await loggedIn;
  }

  public async deadlockInitialization() {
    const pLaunched = this.pclient.waitFor({
      event: "appLaunched",
      opts: { signal: AbortSignal.timeout(5_000) },
    });

    this.client.gamesPlayed(DEADLOCK_APP_ID, true);

    const [launchAppId] = await pLaunched;

    logger.debug(`Launched Deadlock (${launchAppId})`);

    // Wait for sendGC event
    this.pclient.sendGC({
      type: EGCBaseClientMsg.k_EMsgGCClientHello,
      data: CMsgCitadelClientHello.toBinary({
        region_mode: ECitadelRegionMode.k_ECitadelRegionMode_ROW,
      }),
    });

    // Wait for a msg back about playtest status, verifying we're in
    await this.pclient.waitForGC({
      type: EGCCitadelClientMessages.k_EMsgGCToClientDevPlaytestStatus,
      opts: {
        signal: AbortSignal.timeout(20_000),
      },
    });
    logger.debug(`Successfully received playtest status heartbeat`);
  }

  private static makeSteamUser(opts: SteamGCOpts, abc: AbortController): SteamUser {
    const user = new SteamUser({
      // protocol: SteamUser.EConnectionProtocol.TCP,
      httpProxy: opts.account.httpProxy || undefined,
      socksProxy: opts.account.socksProxy || undefined,
    });

    user.on("error", (err) => {
      logger.error("Got a fatal steam error: %O", err);
      abc.abort(`Fatal steam error: ${err}`);
    });

    user.on("refreshToken", async (token: string) => {
      logger.info(`Got a new refresh token, writing to disk: len = ${token.length}`);

      await fs.mkdir(path.dirname(opts.saveTokenPath), { recursive: true });
      await fs.writeFile(opts.saveTokenPath, token, { encoding: "utf-8" });
    });

    user.on("disconnected", (err, msg) => {
      if (abc.signal.aborted) {
        logger.trace("disconnected properly after aborted");
        return;
      }

      logger.error("Got a login disonnect, automatically retrying", {
        err,
        msg,
      });
    });

    user.on("debug", (msg) => {
      logger.trace("steam-user msg: %s", msg);
    });

    return user;
  }

  [Symbol.dispose]() {
    this.abc.abort();
    this.#rawClient.logOff();
  }
}
