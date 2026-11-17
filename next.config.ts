import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next's own upgrade reminders: flag versions with a published security advisory.
    agentUpgrade: "security",
  },
};

// withBotId adds BotID's challenge rewrites.
export default withBotId(nextConfig);
