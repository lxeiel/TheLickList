"use client";

// Runs during HTML parsing on full page loads. On the client React would
// otherwise warn about rendering a <script>; marking it text/plain there
// keeps it inert (see node_modules/next/dist/docs/01-app/02-guides/
// preventing-flash-before-hydration.md).
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
