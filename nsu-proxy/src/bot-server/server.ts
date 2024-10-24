import { RateLimiterMemory } from "rate-limiter-flexible";
import fs from "node:fs/promises";
import { parse } from "@std/yaml";
import * as base64 from "@std/encoding/base64";
import { serve, type ServerType } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger as $logger } from "../log.js";
import { apiReference } from "@scalar/hono-api-reference";
import serveEmojiFavicon from "stoker/middlewares/serve-emoji-favicon";
import { BotManager } from "../bot/bot-manager.js";
import { setTimeout } from "node:timers";
import { bearerAuth } from "hono/bearer-auth";
import { logger as logMiddleware } from "hono/logger";
import { assert } from "@std/assert";
import path from "node:path";
import { fileExists } from "../util.js";

const errorSchema = z.object({
  message: z.string().describe("Error message describing what went wrong"),
});

const invokePoolRoute = createRoute({
  method: "post",
  path: "/pool/invoke-job",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            messageType: z.number().positive().describe("The protobuf message type"),
            timeoutMillis: z
              .number()
              .positive()
              .min(1000)
              .describe("Timeout before returning a timeout error, in milliseconds"),

            rateLimit: z.object({
              messagePeriodMillis: z
                .number()
                .positive()
                .describe(
                  "The period at which a given steam user can query this messageType. After fulfilling this job, the invoked steam-user will not respond until after this duration has passed.",
                ),

              globalPeriodMillis: z
                .number()
                .optional()
                .describe("(Non-functional WIP) A global cooldown period for this steam-user after handling this job.")
                .openapi({ deprecated: true }),
            }),

            limitBufferingBehavior: z
              .enum(["wait", "too_many_requests"])
              .describe(
                "This instructs the server on how to respond when there is no user to serve a messageType yet.\n\n'wait' sleeps until a user is available, and 'too_many_requests' responds with a 429 to be retried by the client.",
              ),
            data: z.string().base64().describe("Base64-encoded binary protobuf message"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "The raw protobuf response",
      content: {
        "application/json": {
          schema: z.object({
            data: z.string().base64().describe("Base64-encoded binary protobuf response message"),
          }),
        },
      },
    },
    500: {
      description: "Internal error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    401: {
      description: "Access token is missing or invalid",
    },
    429: {
      description: "Rate limit",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

const adminUpdateConfigRoute = createRoute({
  method: "post",
  path: "/admin/update-config",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            configYaml: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "OK, update started",
    },
    500: {
      description: "Internal error",
    },
    400: {
      description: "Invalid request",
      schema: z.object({ message: z.string() }),
    },
    401: {
      description: "Access token is missing or invalid",
    },
  },
});

const configSchema = z.object({
  accounts: z.array(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      httpProxy: z.string().optional(),
      socksProxy: z.string().optional(),
    }),
  ),
  authorizedBearers: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});

type Config = z.TypeOf<typeof configSchema>;

async function getConfig(configStoreDir: string): Promise<Config> {
  const configPath = path.join(configStoreDir, "config.json");

  if (await fileExists(configPath)) {
    const contents = await fs.readFile(configPath, { encoding: "utf8" });
    const cfg = configSchema.parse(JSON.parse(contents));
    return cfg;
  }

  return DEFAULT_CONFIG;
}
async function writeConfig(configStoreDir: string, cfg: Config): Promise<void> {
  const configPath = path.join(configStoreDir, "config.json");

  await fs.mkdir(configStoreDir, { recursive: true });

  const content = JSON.stringify(cfg, null, 2);
  await fs.writeFile(configPath, content, { encoding: "utf8" });
}

const DEFAULT_CONFIG: Config = {
  authorizedBearers: [],
  accounts: [],
};

interface EnvConfig {
  nodeEnv: string;
  adminKey: string;
  tokensCacheDir: string;
  configStoreDir: string;
}

function getEnv(): EnvConfig {
  assert(typeof process.env.NODE_ENV === "string", "NODE_ENV env must be defined");
  assert(typeof process.env.ADMIN_KEY === "string", "ADMIN_KEY env must be defined");
  assert(typeof process.env.TOKENS_CACHE_DIR === "string", "TOKENS_CACHE_PATH env must be defined");
  assert(typeof process.env.CONFIG_STORE_DIR === "string", "CONFIG_STORE_DIR env must be defined");

  const env: EnvConfig = {
    nodeEnv: process.env.NODE_ENV,
    adminKey: process.env.ADMIN_KEY,
    tokensCacheDir: process.env.TOKENS_CACHE_DIR,
    configStoreDir: process.env.CONFIG_STORE_DIR,
  };

  assert(env.adminKey.length >= 5, "ADMIN_KEY must not be empty (> 5 chars)");
  assert(env.nodeEnv !== "", "NODE_ENV must not be empty");

  return env;
}

async function synchronizeConfigWithManager(botManager: BotManager, config: Config) {
  await botManager.syncBotAccounts(config.accounts);
}

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 10,
});

export async function runServer() {
  const logger = $logger.child({ scope: "Server" });
  const env = getEnv();
  const stuffHolder: {
    botManager?: BotManager;
    server?: ServerType;
    closing: boolean;
  } = { closing: false };

  const stopFn = async () => {
    if (stuffHolder.closing) {
      return;
    }
    stuffHolder.closing = true;
    setTimeout(() => {
      console.error("Exiting because haven't exited in 30s after SIGINT");
      process.exit(1);
    }, 30_000);

    const server = stuffHolder.server;

    if (server) {
      server.close();
    }

    const bm = stuffHolder.botManager;
    if (bm) {
      await bm[Symbol.asyncDispose]();
      logger.info("Gracefully closed botManager on SIGINT");
    }

    process.exit(0);
  };
  process.on("SIGINT", stopFn);
  process.on("SIGTERM", stopFn);

  const cfg = await getConfig(env.configStoreDir);

  const botManager = new BotManager({
    relogCron: "0 */12 * * *",
    resetSleepTime: 20_000,
    saveTokenDirectory: env.tokensCacheDir,
  });
  stuffHolder.botManager = botManager;

  await botManager.init();

  logger.info("Creating bots");

  await synchronizeConfigWithManager(botManager, cfg);

  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            ok: false,
            errors: result.error.flatten(),
            source: "custom_error_handler",
          },
          422,
        );
      }
    },
  });

  const httpLogger = $logger.child({ scope: "HTTP" });
  app.use(logMiddleware((s, ...rest) => httpLogger.debug(s, rest)));
  app.use(serveEmojiFavicon("🎃"));

  // Rate limit middleware
  app.use("/admin/*", async (c, next) => {
    const info = getConnInfo(c);

    if (info.remote.address) {
      return await rateLimiter
        .consume(info.remote.address, 1)
        .then((_) => next())
        .catch((_) => c.json({ message: "Too many requests" }, 429));
    }
    return next();
  });

  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
  });

  app.use(
    invokePoolRoute.getRoutingPath(),
    bearerAuth({
      verifyToken: async (token, _c) => {
        return cfg.authorizedBearers.some((x) => x.key === token);
      },
    }),
  );

  app.openapi(invokePoolRoute, async (c) => {
    const { messageType, timeoutMillis, data, rateLimit } = c.req.valid("json");

    const binaryData = base64.decodeBase64(data);

    const response = await botManager.invokeJob({
      data: Buffer.from(binaryData),
      messageType: messageType,
      rateLimitMillis: rateLimit.messagePeriodMillis,
      timeoutMillis,
    });

    if (response.ok) {
      return c.json(
        {
          data: base64.encodeBase64(response.data),
        },
        200,
      );
    }

    switch (response.error) {
      case "RATE_LIMIT":
        return c.json(
          {
            message: `Couldn't find a non-rate-limited bot for messageType: ${messageType}`,
          },
          429,
        );
      case "OTHER_ERROR":
        return c.json(
          {
            message: `Error: ${response.message}`,
          },
          500,
        );
    }
  });

  app.use(
    adminUpdateConfigRoute.getRoutingPath(),
    bearerAuth({
      verifyToken: async (token, _c) => {
        return env.adminKey === token;
      },
    }),
  );
  app.openapi(adminUpdateConfigRoute, async (c) => {
    const { configYaml } = c.req.valid("json");

    try {
      const parsed = configSchema.safeParse(parse(configYaml));
      if (!parsed.success) {
        logger.warn(parsed.error, "updateConfig: Invalid config parse");
        return c.json({ message: "Failed to parse config" }, 400);
      }

      const cfg = parsed.data;

      await writeConfig(env.configStoreDir, cfg);

      // Re-read just written config
      const readCfg = await getConfig(env.configStoreDir);

      synchronizeConfigWithManager(botManager, readCfg)
        .then(() => {
          logger.info("Config synchronization finished");
        })
        .catch((error) => {
          logger.error(error, "Error during synchronization");
        });

      return c.json({}, 200);
    } catch (error: any) {
      logger.error(error, "Error updating config");
      return c.json({}, 500);
    }
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "NSU Proxy",
    },
  });

  app.get(
    "/reference",
    apiReference({
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: {
        targetKey: "javascript",
        clientKey: "fetch",
      },
      spec: {
        url: "/doc",
      },
    }),
  );

  const server = serve({
    port: 4245,
    fetch: app.fetch,
  });

  logger.info("Started server on localhost:4245");
  stuffHolder.server = server;
}
