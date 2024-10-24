import { Kysely, SqliteDialect, sql } from "kysely";
import Database from "better-sqlite3";
import { DeadlockBot } from "./deadlock-bot.js";
import { logger, type Logger } from "../log.js";
import { Cron } from "croner";
import { sleep } from "../util.js";
import { assert } from "@std/assert";
import type { BotAccountDetails } from "../common.js";

export interface InvokeJobOpts {
  messageType: number;
  timeoutMillis: number;
  rateLimitMillis: number;
  data: Buffer;
}

export interface BotManagerOpts {
  relogCron: string;
  resetSleepTime: number;
  saveTokenDirectory: string;
}

export interface RateLimitInfo {
  suggestedIntervalMillis: number;
  timeUntilNextMillis: number;
}

export type InvokeJobResponse =
  | {
      ok: true;
      username: string;
      data: Buffer;
    }
  | { ok: false; error: "RATE_LIMIT"; message: string }
  | { ok: false; error: "OTHER_ERROR"; message: string };

/**
 * A robust BotManager which handles the lifecycle of DeadlockBots, including handling per-message
 * type rate limits.
 */
export class BotManager {
  private bots = new Map<string, DeadlockBot>();
  private logger: Logger;
  private db: BMDatabase;
  // private resetJob?: Cron = undefined;
  private jobs: Cron[] = [];

  private syncingMillis: number | null = null;

  private opts: BotManagerOpts;

  constructor(opts: BotManagerOpts) {
    this.opts = opts;
    this.logger = logger.child({ scope: "BotManager" });
    this.db = new BMDatabase();
  }

  // TODO: Add live re-sync.. kind of complicated with jobs that may be running though
  // public optsUpdate(opts: BotManagerOpts) {
  // 	this.opts = opts;
  // 	this.initializeJobs();
  // }

  public async init() {
    await this.db.up();
    this.initializeJobs();
  }

  public async syncBotAccounts(accounts: BotAccountDetails[]) {
    const now = Date.now();

    if (this.syncingMillis) {
      const prevDate = new Date(this.syncingMillis).toISOString();
      this.logger.warn(`Sync: Already syncing (at ${prevDate}), failing`);
      return;
    }
    this.syncingMillis = now;

    try {
      const newUsernames = accounts.map((x) => x.username);

      const existingBots = await this.db.listAccounts();
      const existingUsernames = existingBots.map((x) => x.username);

      const toDelete = existingUsernames.filter((x) => !newUsernames.includes(x));
      const toAdd = accounts.filter((x) => !existingUsernames.includes(x.username));

      this.logger.info(`Sync: Adding ${toAdd.length} accounts, removing ${toDelete.length} accounts`);

      for (const acc of toAdd) {
        await this.addBot(acc);
      }

      for (const username of toDelete) {
        await this.removeBot(username);
      }
    } finally {
      this.syncingMillis = null;
    }
  }

  public async addBotAccount(account: BotAccountDetails) {
    return await this.addBot(account);
  }

  /**
   * Setup long-running jobs
   */
  private initializeJobs(): void {
    this.killJobs();
    // Relog job using cron string
    const relogJob = new Cron(this.opts.relogCron, { protect: true }, async () => {
      try {
        this.logger.info("Starting relog job");
        const accounts = await this.db.listAccounts();

        for (const account of accounts) {
          const { username } = account;
          try {
            const bot = this.bots.get(username);
            if (!bot) {
              this.logger.error(`Bot doesn't exist in bots: ${username}`);
              continue;
            }
            if (account.status === "READY" || account.status === "PREPARING") {
              // Pause accounts while we reset them
              await this.db.setAccountStatus(account.username, "PAUSED");
            }
            // Wait 2 seconds to hopefully let other queries going through this account go through
            await sleep(2000);
            this.logger.info(`Relogging bot ${username}`);

            // Use .reset() for relogging
            await bot.reset(this.opts.resetSleepTime);
            await bot.initialize();

            await this.db.setAccountStatus(account.username, "READY");
          } catch (error: any) {
            this.logger.error(`Error relogging bot ${username}: ${error.message}`);
            // If it's already failed, don't try again
            if (account.status === "FAILED") {
              continue;
            }
            // Update status to PAUSED and add to reset queue
            await this.db.setAccountStatus(username, "PAUSED");
          }
        }
      } catch (error: any) {
        this.logger.error(error, `Error in relog job: ${error.message}`);
      }
    });
    this.jobs.push(relogJob);

    // Soft reset job running every 2minutes
    // Resets "paused" accounts
    const softResetJob = new Cron("0 */1 * * * *", { protect: true }, async () => {
      try {
        this.logger.debug("Starting soft reset job");
        const pausedAccounts = await this.db.listAccounts({
          status: "PAUSED",
        });
        const usernames = pausedAccounts.map((x) => x.username);

        for (const username of usernames) {
          const bot = this.bots.get(username);
          if (!bot) {
            this.logger.error(`Bot ${username} not found in bots map`);
            continue;
          }

          try {
            await bot.resetInitializeWithRetry({
              baseSleepTime: 10_000,
              maxRetries: 5,
            });

            // If successful, set status to READY
            await this.db.setAccountStatus(username, "READY");

            this.logger.info(`[Soft reset] Bot ${username} has been reset and is READY`);
          } catch (error: any) {
            this.logger.error(`[Soft Reset] Error resetting bot ${username}: ${error.message}`);
            // Set to failed to maybe be picked up by relog job
            await this.db.setAccountStatus(username, "FAILED");
          }
        }
      } catch (error: any) {
        this.logger.error(error, `Error in reset job: ${error.message}`);
      }
    });
    this.jobs.push(softResetJob);

    // Hard job running every 5 minutes
    // Resets "FAILED" accounts
    const hardResetJob = new Cron("0 */15 * * * *", { protect: true }, async () => {
      try {
        this.logger.debug("Starting hard reset job");
        const failedAccounts = await this.db.listAccounts({
          status: "FAILED",
        });
        const usernames = failedAccounts.map((x) => x.username);

        for (const username of usernames) {
          const bot = this.bots.get(username);
          if (!bot) {
            this.logger.error(`Bot ${username} not found in bots map`);
            continue;
          }

          try {
            await bot.resetInitializeWithRetry({
              baseSleepTime: 30_000,
              maxRetries: 5,
            });
            // If successful, set status to READY
            await this.db.setAccountStatus(username, "READY");

            this.logger.info(`[Hard reset] Bot ${username} has been reset and is READY`);
          } catch (error: any) {
            this.logger.error(`[Hard Reset] Error resetting bot ${username}: ${error.message}`);
            // Set to failed to maybe be picked up by relog job
            await this.db.setAccountStatus(username, "FAILED");
          }
        }
      } catch (error: any) {
        this.logger.error(error, `Error in reset job: ${error.message}`);
      }
    });
    this.jobs.push(hardResetJob);
  }

  private killJobs() {
    for (const j of this.jobs) {
      j.stop();
    }
  }

  private async removeBot(username: string) {
    await this.db.setAccountStatus(username, "DEAD");

    const bot = this.bots.get(username);
    if (!bot) return;

    bot[Symbol.dispose]();
    await sleep(500);

    this.bots.delete(username);

    await this.db.removeAccount(username);
  }

  private async addBot(account: BotAccountDetails) {
    try {
      // Add account to the database with initial status PREPARING
      await this.db.addAccount({
        ...account,
        status: "PREPARING",
        statusUpdatedAtMillis: Date.now(),
      });

      // Create a DeadlockBot instance for this account
      const bot = new DeadlockBot({
        account,
        saveTokenDirectory: this.opts.saveTokenDirectory,
      });

      // Store the bot in the bots map
      this.bots.set(account.username, bot);

      // Initialize the bot
      await bot.initialize();

      this.db.setAccountStatus(account.username, "READY");
    } catch (error: any) {
      this.logger.error(error, `Error adding bot account ${account.username}: ${error.message}`);
      // Update the bot's status in the database
      await this.db.setAccountStatus(account.username, "PAUSED");
    }
  }

  /**
   * Dispatches a job to a bot which can serve the request, and returns the data, and associated bot username
   */
  public async invokeJob({
    messageType,
    timeoutMillis,
    rateLimitMillis,
    data,
  }: InvokeJobOpts): Promise<InvokeJobResponse> {
    const rateLimitKey = `MSG-${messageType}`;

    // Get an available account
    const account = await this.db.getAvailableAccountForRateLimitKey(rateLimitKey, rateLimitMillis);

    if (!account) {
      return {
        ok: false,
        error: "RATE_LIMIT",
        message: "No available bots for this message type due to rate limits",
      };
    }

    const username = account.username;
    const bot = this.bots.get(username);

    if (!bot) {
      return {
        ok: false,
        error: "OTHER_ERROR",
        message: `Bot with username ${username} not found`,
      };
    }

    const RETRY_BASE_SLEEP_TIME = 2;
    let retries = 0;
    while (true) {
      try {
        // Call bot.invokeJob()
        const responseData = await bot.invokeJob({
          messageType,
          timeoutMillis,
          data,
        });

        return {
          ok: true,
          username,
          data: responseData,
        };
      } catch (error: any) {
        if (retries < 3) {
          retries += 1;
          const sleepTime = RETRY_BASE_SLEEP_TIME * retries;
          const sleepMs = sleepTime * 1000;
          this.logger.warn(error, `Got error on bot, but retrying (retry #${retries}). Sleeping ${sleepTime}s`);
          await this.db.updateAccountRateLimit(username, rateLimitKey, sleepMs + rateLimitMillis);
          await sleep(sleepMs);
          continue;
        }
        this.logger.error(error, `Error invoking job on bot ${username}: ${error.message}`);

        // Set bot status to PAUSED and add to resetQueue
        await this.db.setAccountStatus(username, "PAUSED");

        return {
          ok: false,
          error: "OTHER_ERROR",
          message: error.message,
        };
      }
    }
  }

  public async [Symbol.asyncDispose]() {
    // Clear any asynchronous jobs
    this.killJobs();
    this.logger.debug("Stopped cron jobs");

    // Dispose of all the bots
    for (const bot of this.bots.values()) {
      bot[Symbol.dispose]();
    }
    // Given 1s for bots to really shutdown
    await sleep(1000);
    this.logger.debug("Stopped bots");

    // Dispose of the database
    await this.db[Symbol.asyncDispose]();
    this.logger.debug("Disposed of database");
  }
}

type AccountStatus = "READY" | "PREPARING" | "FAILED" | "PAUSED" | "DEAD";

interface AccountTable {
  /**
   * Primary key
   */
  username: string;

  /**
   * Plaintext password for the account
   */
  password: string;

  /**
   * Optional HTTP proxy for the account
   */
  httpProxy?: string;

  /**
   * Optional SOCKS proxy for the account
   */
  socksProxy?: string;

  /**
   * Default status should be "READY"
   *
   * Use "PAUSED" when resetting a bot, to be shortly reset to ready
   *
   * Use "FAILED" when a bot is determined to be out of commission for good (maybe to be retried by a long-running job)
   */
  status: AccountStatus;
  statusUpdatedAtMillis: number;
}

/**
 * Whenever an account makes an operation with a given `rateLimitKey`,
 * this table is updated to reflect that that account can't be used for that operation again
 * until `readyAt` has passed.
 *
 * When the BotManager retrieves a bot for an operation, it transactionally increases the `readyAtMillis` before
 * actually executing the operation, so that it can't be claimed by another concurrent operation.
 */
interface AccountRateLimits {
  /**
   * Effectively PRIMARY KEY(username, rateLimitKey)
   */
  username: string;
  rateLimitKey: string;

  /**
   * epoch milliseconds
   */
  readyAtMillis: number;
}

interface DBTables {
  accountRateLimits: AccountRateLimits;
  accounts: AccountTable;
}

/**
 * In-memory sqlite database for the BotManager
 */
class BMDatabase {
  private rawDb: Database.Database;
  private db: Kysely<DBTables>;

  constructor() {
    this.rawDb = new Database(":memory:");
    const dialect = new SqliteDialect({
      database: this.rawDb,
    });
    this.db = new Kysely<DBTables>({
      dialect,
    });
  }

  /**
   * Create tables, using raw sql (not Kysely query building)
   */
  public async up(): Promise<void> {
    await sql`
      CREATE TABLE accounts (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        httpProxy TEXT,
        socksProxy TEXT,
        status TEXT NOT NULL,
        statusUpdatedAtMillis INTEGER NOT NULL
      );
    `.execute(this.db);

    await sql`
      CREATE TABLE accountRateLimits (
        username TEXT NOT NULL,
        rateLimitKey TEXT NOT NULL,
        readyAtMillis INTEGER NOT NULL,
        PRIMARY KEY (username, rateLimitKey),
        FOREIGN KEY (username) REFERENCES accounts(username)
      );
    `.execute(this.db);
  }

  public async listAccounts({
    status,
    notStatus,
  }: { status?: AccountStatus; notStatus?: AccountStatus } = {}): Promise<AccountTable[]> {
    let query = this.db.selectFrom("accounts").selectAll().orderBy("statusUpdatedAtMillis", "desc");

    if (status) {
      query = query.where("status", "=", status);
    }
    if (notStatus) {
      query = query.where("status", "!=", notStatus);
    }

    const accounts = await query.execute();
    return accounts;
  }

  public async addAccount(
    account: BotAccountDetails & {
      status: AccountStatus;
      statusUpdatedAtMillis: number;
    },
  ): Promise<void> {
    await this.db
      .insertInto("accounts")
      .values({
        username: account.username,
        password: account.password,
        httpProxy: account.httpProxy,
        socksProxy: account.socksProxy,
        status: account.status,
        statusUpdatedAtMillis: account.statusUpdatedAtMillis,
      })
      .execute();
  }

  public async removeAccount(username: string): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom("accountRateLimits").where("username", "=", username).execute();

      await trx.deleteFrom("accounts").where("username", "=", username).execute();
    });
  }

  public async getAvailableAccountForRateLimitKey(
    rateLimitKey: string,
    rateLimitMillis: number,
  ): Promise<{ username: string } | null> {
    const now = Date.now();
    return await this.db.transaction().execute(async (trx) => {
      const results = await trx
        .selectFrom("accounts as a")
        .leftJoin("accountRateLimits as ar", (join) =>
          join.onRef("a.username", "=", "ar.username").on("ar.rateLimitKey", "=", rateLimitKey),
        )
        .where("a.status", "=", "READY")
        .where((eb) => eb.or([eb("ar.readyAtMillis", "<=", now), eb("ar.readyAtMillis", "is", null)]))
        .select("a.username")
        .orderBy("ar.readyAtMillis", "asc")
        .execute();

      if (results.length > 0) {
        const username = results[0].username;
        assert(username, "username should not be null");
        const readyAtMillis = now + rateLimitMillis;

        await trx
          .insertInto("accountRateLimits")
          .values({
            username,
            rateLimitKey,
            readyAtMillis,
          })
          .onConflict((oc) =>
            oc.columns(["username", "rateLimitKey"]).doUpdateSet({
              readyAtMillis,
            }),
          )
          .execute();

        return { username: results[0].username };
      }
      return null;
    });
  }

  public async updateAccountRateLimit(username: string, rateLimitKey: string, duration: number): Promise<void> {
    const newTime = Date.now() + duration;
    await this.db
      .insertInto("accountRateLimits")
      .values({
        username,
        rateLimitKey,
        readyAtMillis: newTime,
      })
      .onConflict((oc) =>
        oc.columns(["username", "rateLimitKey"]).doUpdateSet({
          readyAtMillis: newTime,
        }),
      )
      .execute();
  }

  public async setAccountStatus(username: string, status: AccountStatus): Promise<void> {
    await this.db
      .updateTable("accounts")
      .set({
        status,
        statusUpdatedAtMillis: Date.now(),
      })
      .where("username", "=", username)
      .execute();
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    await this.db.destroy();
  }
}
