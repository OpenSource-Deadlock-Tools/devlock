import fs from "node:fs/promises";
import { logger } from "../log.js";
import { CMsgClientToGCGetActiveMatchesResponse } from "@nsu-proxy/deadlock-protos/citadel_gcmessages_client";
import { BotClient } from "../bot-client/client.js";
import { assert } from "@std/assert";

async function main() {
  const MATCH_ID = 21919828;

  const url = process.env.NODE_ENV === "production" ? process.env.PROD_API_URL : "http://localhost:4245";
  const token = process.env.NODE_ENV === "production" ? process.env.PROD_API_KEY : "NSUP-DEV-KEY";
  assert(url, "url must be defined");
  assert(token, "token must be defined");

  const client = new BotClient({
    url,
    token,
  });

  await client.getMatch(BigInt(MATCH_ID));

  const activeMatches = await client.getActiveMatches();

  if (activeMatches) {
    const amJson = CMsgClientToGCGetActiveMatchesResponse.toJson(activeMatches);
    await fs.writeFile("./active-matches.json", JSON.stringify(amJson, null, 2), { encoding: "utf8" });
  }
  console.log("Active matches", activeMatches?.active_matches.length);

  const notSpectated = activeMatches?.active_matches.find((x) => x.spectators !== undefined && x.spectators === 0);

  if (notSpectated?.lobby_id) {
    await client.spectateMatch(notSpectated.lobby_id);
  }
}

main().catch((e: Error) => {
  logger.error(e, "Got top-level exception");
  console.error(e);
});
