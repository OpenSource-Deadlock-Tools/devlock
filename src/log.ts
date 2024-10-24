import pretty from "pino-pretty";
import { pino } from "pino";
import { magenta } from "colorette";

const logStream = pretty({
	colorize: true,
	colorizeObjects: true,
	minimumLevel: "trace",
	ignore: "scope,pid,hostname",
	messageFormat: (log, messageKey) => {
		const scope = log.scope ? magenta(`[${log.scope}] `) : "";
		return `${scope}${log[messageKey]}`;
	},
});

export const logger = pino(logStream);
logger.level = "trace";

export type Logger = typeof logger;
