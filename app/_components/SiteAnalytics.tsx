"use client";

import { Analytics } from "@vercel/analytics/next";

// Admin pages aren't counted: the login page's address carries the secret
// key, which mustn't end up in the analytics dashboard.
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const { pathname } = new URL(event.url);
        return pathname === "/reborn" || pathname.startsWith("/reborn/") ? null : event;
      }}
    />
  );
}
