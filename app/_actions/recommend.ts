"use server";

import { checkBotId } from "botid/server";
import { headers } from "next/headers";
import {
  REC_HOURLY_LIMIT,
  REC_INBOX_CAP,
  clientIp,
  countRecentFromIp,
  countWaiting,
  hashIp,
  insertRecommendation,
  normalizeRecommendation,
  validateRecommendation,
  type RecommendationInput,
} from "@/lib/recommendations";

const GENERIC_ERROR = "Couldn't send that. Try again.";
const HOUR_MS = 60 * 60 * 1000;

export async function submitRecommendationAction(
  // `website` is the hidden trap field: real visitors never fill it.
  input: RecommendationInput & { website?: string },
): Promise<{ ok: true } | { error: string }> {
  try {
    const verification = await checkBotId();
    if (verification.isBot) return { error: GENERIC_ERROR };

    // Looks like success so a bot has nothing to learn from.
    if (input.website) return { ok: true };

    const secret = process.env.SESSION_SECRET;
    if (!secret) return { error: GENERIC_ERROR };

    const ipHash = hashIp(clientIp(await headers()), secret);

    const recent = await countRecentFromIp(
      ipHash,
      new Date(Date.now() - HOUR_MS),
    );
    if (recent >= REC_HOURLY_LIMIT) {
      return { error: "That's a lot of recs! Try again in a bit." };
    }

    if ((await countWaiting()) >= REC_INBOX_CAP) {
      return { error: "My inbox is full right now, try again later." };
    }

    const rec = normalizeRecommendation(input);
    const problem = validateRecommendation(rec);
    if (problem) return { error: problem };

    await insertRecommendation(rec, ipHash);
    return { ok: true };
  } catch {
    return { error: GENERIC_ERROR };
  }
}
