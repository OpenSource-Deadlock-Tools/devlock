import { logger } from "../log.js";
import { runServer } from "./server.js";

async function main() {
  await runServer();
}

main().catch((e: Error) => {
  logger.error(e, "Got top-level exception");
  console.error(e);
});
