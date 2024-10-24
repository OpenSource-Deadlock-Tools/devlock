import dotenv from "dotenv";
dotenv.config();

import SteamUser from "steam-user";
import { exec } from "child_process";
import { promisify } from "util";
import { getCommandLineArg, sendToGCPromise } from "./util";
import { SteamGCClient } from "./steam_gc_client";
// import {
//   EGCCitadelClientMessages,
//   CMsgClientToGCGetMatchMetaData,
//   CMsgClientToGCGetMatchMetaDataResponse,
// } from "./protobuff";
import type { Config } from "./types";

import { FileStorage } from "./src/storage";
import {
  ingestMatch,
  parseMetaBuffer,
  type Match,
  type Player,
  type PlayerMatch,
} from "./src/ingest";
import sql from "./src/sql";
import PQueue from "p-queue";
import {
  CMsgClientToGCGetMatchMetaData,
  CMsgClientToGCGetMatchMetaDataResponse,
  EGCCitadelClientMessages,
} from "./complete/citadel_gcmessages_client";

const execPromise = promisify(exec);

await sql`SELECT 1`;

async function getMatchMetaData(
  steamUser: SteamUser,
  appid: number,
  matchId: string,
  maxRetries: number = 120,
  initialDelay: number = 500,
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const matchMetaDataPayload = CMsgClientToGCGetMatchMetaData.toBinary({
      match_id: BigInt(matchId),
    });

    const matchMetaDataResponse = await sendToGCPromise(
      steamUser,
      appid,
      EGCCitadelClientMessages.k_EMsgClientToGCGetMatchMetaData,
      Buffer.from(matchMetaDataPayload),
    );

    const decoded = CMsgClientToGCGetMatchMetaDataResponse.decode(
      matchMetaDataResponse,
    ) as any;

    if (decoded.result !== 5) {
      return decoded;
    }

    let delay = Math.min(initialDelay * Math.pow(2, attempt), 60000);

    const waitTimeSeconds = delay / 1000;
    console.log(
      `[${matchId}] Rate limited. Retrying in ${waitTimeSeconds.toFixed(
        1,
      )} seconds. Attempt ${attempt + 1} of ${maxRetries}`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(
    "Max retries reached. Unable to fetch match metadata due to rate limiting.",
  );
}

function buildMetaUrl(
  matchId: BigInt,
  cluster: number,
  replaySalt: number,
  deadlockAppId: number,
) {
  return `http://replay${cluster}.valve.net/${deadlockAppId}/${matchId}_${replaySalt}.meta.bz2`;
}

async function getMetaContents(metaUrl: string): Promise<Buffer> {
  try {
    //const { stdout } = await $`curl -L ${metaUrl} | bunzip2`.quiet();
    const { stdout } = await execPromise(
      `curl -L ${metaUrl} | bunzip2`,
      //@ts-ignore
      { shell: true, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout;
  } catch (error) {
    console.error(`Error fetching meta contents from ${metaUrl}`);
    return Buffer.alloc(0);
  }
}

type QueueItem = {
  match_id: BigInt;
  state: string;
  created_at: string;
  created_by: string;
  last_updated_at: string;
  last_run_by: string;
  run_after: string | null;
  attempts: number;
  last_meta_response: any;
};

// Define more specific interfaces for each result type
interface SuccessResult {
  type: "success";
  job: {
    match: Match;
    players: Player[];
    playerMatches: PlayerMatch[];
    updatedJob: {
      match_id: bigint;
      last_meta_response: any;
      meta_url: string;
    };
  };
}

interface FailedResult {
  type: "failed";
  job: {
    match_id: bigint;
    retryAfterMins: number | null;
    metaData: any | null;
    matchMode: string | null;
  };
}

interface InflightResult {
  type: "inflight";
  job: {
    match_id: bigint;
    metaData: any;
  };
}

// Union type for WorkerResult
type WorkerResult = SuccessResult | FailedResult | InflightResult;

class MatchDataManager {
  private config: Config;
  private steamUser: SteamUser | null = null;
  private storage: FileStorage;

  constructor(config: Config, storage: FileStorage) {
    this.config = config;
    this.storage = storage;
  }

  async start(steamUser: SteamUser): Promise<void> {
    this.steamUser = steamUser;
    while (true) {
      const jobFetchT = Date.now();
      const jobs = await this.getNextJob(100);

      console.log(
        `Worker ${this.config.steamUsername} processing ${
          jobs.length
        } jobs, fetched in ${Date.now() - jobFetchT}ms`,
      );

      if (!jobs || jobs.length === 0) {
        console.log(
          `No more jobs available for worker ${this.config.steamUsername}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
        continue;
      }

      const startTime = Date.now();

      const queue = new PQueue({ concurrency: 2 });
      const results: WorkerResult[] = await Promise.all(
        jobs.map(async (job) => {
          try {
            const matchMetaData = await queue.add(() =>
              getMatchMetaData(
                steamUser,
                this.config.deadlockAppId,
                job.match_id.toString(),
              ),
            );
            console.log(
              `[${job.match_id}] ${
                matchMetaDataResponseMap[matchMetaData.result]
              }`,
            );

            if (matchMetaData.result === 5) {
              throw new Error(
                "RATE_LIMITED - should be handled in getMatchMetaData",
              );
            }
            if (
              matchMetaData.result === 0 ||
              matchMetaData.result === 2 ||
              matchMetaData.result === 6
            ) {
              return {
                type: "failed",
                job: {
                  match_id: job.match_id as bigint,
                  retryAfterMins: null,
                  metaData: matchMetaData,
                  matchMode: null,
                },
              };
            }
            if (matchMetaData.result === 3) {
              return {
                type: "failed",
                job: {
                  match_id: job.match_id as bigint,
                  retryAfterMins: 120,
                  metaData: matchMetaData,
                  matchMode: null,
                },
              };
            }
            if (matchMetaData.result === 4) {
              return {
                type: "failed",
                job: {
                  match_id: job.match_id as bigint,
                  retryAfterMins: 60,
                  metaData: matchMetaData,
                  matchMode: null,
                },
              };
            }
            if (matchMetaData.result === 7) {
              return {
                type: "inflight",
                job: {
                  match_id: job.match_id as bigint,
                  metaData: matchMetaData,
                },
              };
            }
            if (matchMetaData.result !== 1) {
              throw new Error("Unknown result from getMatchMetaData");
            }

            const metaUrl = buildMetaUrl(
              job.match_id,
              matchMetaData.cluster_id,
              matchMetaData.metadata_salt,
              this.config.deadlockAppId,
            );

            const stdout = await getMetaContents(metaUrl);
            console.log(`[${job.match_id}] meta len ${stdout.length}`);

            if (stdout.length === 0) {
              throw new Error("Empty meta file");
            }

            const upload = await this.storage.writeFile(
              `${job.match_id}.meta`,
              stdout,
            );

            const parsedFile = parseMetaBuffer(stdout);
            if (
              parsedFile.match.match_mode === `k_ECitadelMatchMode_CoopBot` ||
              parsedFile.match.match_mode ===
                `k_ECitadelMatchMode_PrivateLobby` ||
              parsedFile.match.match_mode === `k_ECitadelMatchMode_Tutorial`
            ) {
              // unrecoverable error
              console.log(`[${job.match_id}] ${parsedFile.match.match_mode}`);
              return {
                type: "failed",
                job: {
                  match_id: job.match_id as bigint,
                  retryAfterMins: null,
                  metaData: matchMetaData,
                  matchMode: parsedFile.match.match_mode || "duration_s=0",
                },
              };
            }
            if (parsedFile.match.duration_s === 0) {
              // unrecoverable error
              console.log(`[${job.match_id}] 0 duration game`);
              return {
                type: "failed",
                job: {
                  match_id: job.match_id as bigint,
                  retryAfterMins: null,
                  metaData: matchMetaData,
                  matchMode: "duration_s=0",
                },
              };
            }

            return {
              type: "success",
              job: {
                match: parsedFile.match,
                players: parsedFile.players,
                playerMatches: parsedFile.playerMatches,
                updatedJob: {
                  match_id: job.match_id as bigint,
                  last_meta_response: matchMetaData,
                  meta_url: upload,
                },
              },
            };
          } catch (error) {
            console.error(`Error processing match ${job.match_id}:`, error);
            return {
              type: "failed",
              job: {
                match_id: job.match_id as bigint,
                retryAfterMins: 1,
                metaData: null,
                matchMode: null,
              },
            };
          }
        }),
      );

      const validResults: SuccessResult["job"][] = results
        .filter((r) => r.type === "success")
        .map((s) => s.job);
      const jobsToMarkFailed: FailedResult["job"][] = results
        .filter((r) => r.type === "failed")
        .map((s) => s.job);
      const jobsToMarkInFlight: InflightResult["job"][] = results
        .filter((r) => r.type === "inflight")
        .map((s) => s.job);
      const updatedJobs = validResults.map((r) => r.updatedJob);

      const matchesToSave = validResults
        .map((r) => r.match)
        .filter((m) => m !== undefined) as Match[];
      const playersToSave = validResults
        .flatMap((r) => r.players)
        .filter((p) => p !== undefined) as Player[];
      const playerMatchesToSave = validResults
        .flatMap((r) => r.playerMatches)
        .filter((pm) => pm !== undefined) as PlayerMatch[];

      const dbSaveT = Date.now();
      console.log(
        `Saving to DB ${matchesToSave.length} matches, ${playersToSave.length} players, ${playerMatchesToSave.length} playerMatches`,
      );
      await Promise.allSettled([
        ingestMatch(matchesToSave, playersToSave, playerMatchesToSave),
        this.bulkMarkJobsFailed(jobsToMarkFailed),
        this.bulkMarkJobsInFlight(jobsToMarkInFlight),
        this.bulkUpdateJobs(updatedJobs),
      ]);
      console.log(`Saved to DB in ${Date.now() - dbSaveT}ms`);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(
        `Worker ${this.config.steamUsername} processed ${jobs.length} jobs in ${duration} seconds`,
      );
      // jobs/sec
      const jobsSecToTwoDecimals =
        Math.round((jobs.length / duration) * 100) / 100;
      console.log(
        `Worker ${this.config.steamUsername} processed ${jobsSecToTwoDecimals} jobs/sec`,
      );

      // optimal = 2 jobs/sec
    }
    console.log(`Worker ${this.config.steamUsername} finished processing jobs`);
  }

  private async getReadyJobs(limit: number): Promise<any[]> {
    return await sql`
          UPDATE queue
          SET state = 'IN_PROGRESS',
              last_run_by = ${this.config.steamUsername},
              last_updated_at = CURRENT_TIMESTAMP,
              attempts = attempts + 1
          WHERE match_id IN (
              SELECT match_id
              FROM queue
              WHERE state = 'READY' AND (run_after IS NULL OR run_after <= CURRENT_TIMESTAMP)
              ORDER BY match_id DESC
              LIMIT ${limit}
              FOR UPDATE SKIP LOCKED
          )
          RETURNING *
      `;
  }

  private async getErrorJobs(limit: number): Promise<any[]> {
    return await sql`
        UPDATE queue
        SET state = 'IN_PROGRESS',
            last_run_by = ${this.config.steamUsername},
            last_updated_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1
        WHERE match_id IN (
            SELECT match_id
            FROM queue
            WHERE state = 'ERROR' AND run_after IS NOT NULL AND run_after <= CURRENT_TIMESTAMP
            ORDER BY match_id DESC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;
  }

  private async getStuckJobs(limit: number): Promise<any[]> {
    return await sql`
        UPDATE queue
        SET state = 'IN_PROGRESS',
            last_run_by = ${this.config.steamUsername},
            last_updated_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1
        WHERE match_id IN (
            SELECT match_id
            FROM queue
            WHERE state = 'IN_PROGRESS' AND last_updated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
            ORDER BY match_id DESC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;
  }

  private async getNextJob(numberOfJobs = 100): Promise<QueueItem[]> {
    const queries = [this.getReadyJobs, this.getErrorJobs, this.getStuckJobs];

    let result: any[] = [];
    for (const query of queries) {
      if (result.length < numberOfJobs) {
        const jobs = await query.call(this, numberOfJobs - result.length);
        result = result.concat(jobs);
      } else {
        break;
      }
    }

    const res: QueueItem[] = [];
    const jobsToMarkFailed: {
      match_id: bigint;
      retryAfterMins: null;
      metaData: null;
      matchMode: null;
    }[] = [];

    for (const job of result) {
      if (job.attempts > 3) {
        jobsToMarkFailed.push({
          match_id: job.match_id as bigint,
          retryAfterMins: null,
          metaData: null,
          matchMode: null,
        });
      } else {
        res.push(job as QueueItem);
      }
    }

    await this.bulkMarkJobsFailed(jobsToMarkFailed);

    return res;
  }

  private async bulkUpdateJobs(
    jobs: Array<{
      match_id: bigint;
      meta_url: string;
      last_meta_response: any;
    }>,
  ): Promise<void> {
    if (jobs.length === 0) return;

    const updates = jobs.map((job) => [
      job.match_id,
      "DONE_META",
      job.meta_url,
      JSON.stringify(job.last_meta_response),
    ]) as any;

    const result = await sql`
    UPDATE queue
    SET 
      state = update_data.state,
      meta_url = update_data.meta_url,
      last_meta_response = update_data.last_meta_response::jsonb
    FROM (VALUES ${sql(
      updates,
    )}) AS update_data(match_id, state, meta_url, last_meta_response)
    WHERE queue.match_id = (update_data.match_id)::bigint
    RETURNING queue.match_id, queue.state, queue.meta_url, queue.last_meta_response
  `;

    console.log(`Updated ${result.count} rows`);
  }

  private async bulkMarkJobsInFlight(
    jobs: Array<{ match_id: bigint; metaData: any }>,
  ): Promise<void> {
    if (jobs.length === 0) return;

    const updates = jobs.map((job) => [
      job.match_id,
      "READY",
      JSON.stringify(job.metaData),
    ]) as any;

    const result = await sql`
    UPDATE queue
    SET 
      state = update_data.state,
      last_updated_at = CURRENT_TIMESTAMP,
      run_after = CASE
        WHEN attempts = 1 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        WHEN attempts = 2 THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
        ELSE CURRENT_TIMESTAMP + INTERVAL '75 minutes'
      END,
      last_meta_response = (update_data.last_meta_response)::jsonb
    FROM (VALUES ${sql(
      updates,
    )}) AS update_data(match_id, state, last_meta_response)
    WHERE queue.match_id = (update_data.match_id)::bigint
    RETURNING queue.match_id, queue.state, queue.run_after, queue.last_meta_response
    `;

    console.log(`Updated ${result.count} rows to in-flight state`);
  }

  private async bulkMarkJobsFailed(
    jobs: Array<{
      match_id: bigint;
      retryAfterMins: number | null;
      metaData: any;
      matchMode: string | null;
    }>,
  ): Promise<void> {
    if (jobs.length === 0) return;

    const updates = jobs.map((job) => [
      job.match_id,
      "ERROR",
      job.retryAfterMins,
      JSON.stringify(job.metaData),
      job.matchMode,
    ]) as any;

    const result = await sql`
    UPDATE queue
    SET 
      state = update_data.state,
      run_after = CASE
        WHEN update_data.retry_after_mins IS NOT NULL THEN CURRENT_TIMESTAMP + (update_data.retry_after_mins || ' minutes')::interval
        ELSE NULL
      END,
      last_meta_response = (update_data.last_meta_response)::jsonb,
      match_mode = update_data.match_mode
    FROM (VALUES ${sql(
      updates,
    )}) AS update_data(match_id, state, retry_after_mins, last_meta_response, match_mode)
    WHERE queue.match_id = (update_data.match_id)::bigint
    RETURNING queue.match_id, queue.state, queue.run_after, queue.last_meta_response, queue.match_mode
    `;

    console.log(`Updated ${result.count} rows to failed state`);
  }
}

// Main execution
const config: Config = {
  deadlockAppId: 1422450,
  maxRetries: 3,
  retryDelay: 5000,
  gcResponseTimeout: 5000,
  concurrency: Number(getCommandLineArg("--concurrency")) || 1,
  steamUsername: getCommandLineArg("--username") || process.env.STEAM_USERNAME!,
  steamPassword: getCommandLineArg("--password") || process.env.STEAM_PASSWORD!,
  start_match_id: Number(getCommandLineArg("--start")) || 0,
  end_match_id: Number(getCommandLineArg("--end")) || 0,
};

// const localFileStorage = new FileStorage({
//   type: "local",
//   basePath: "./test",
// });

const r2FileStorage = new FileStorage({
  type: "r2",
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: "tracklock",
  endpoint: process.env.R2_BUCKET!,
});

const steamGCClient = new SteamGCClient(config);
const matchDataManager = new MatchDataManager(config, r2FileStorage);

const matchMetaDataResponseMap: any = {
  0: "k_eResult_InternalError",
  1: "k_eResult_Success",
  2: "k_eResult_InvalidPermission",
  3: "k_eResult_TemporarilyDisabled",
  4: "k_eResult_TooBusy",
  5: "k_eResult_RateLimited",
  6: "k_eResult_InvalidMatch",
  7: "k_eResult_MatchInFlight",
};

// async function runFrontCrawl(steamGCClient: SteamGCClient, config: Config) {
//   while (true) {
//     try {
//       await frontCrawl(steamGCClient, config);
//     } catch (error) {
//       console.error("Error during front crawl:", error);
//     }
//     // Wait for 15 minutes before the next run
//     await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));
//   }
// }

console.log(config);

while (true) {
  try {
    await steamGCClient.login();
    console.log("Successfully logged in and received welcome message");

    // if (config.steamUsername === "ws_deadlock_01") {
    //   runFrontCrawl(steamGCClient, config);
    // }

    await matchDataManager.start(steamGCClient.getSteamUser());
  } catch (error) {
    console.error("Error during login or match retrieval:", error);
  }
}
