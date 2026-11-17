// Client-safe: the admin Recs tab filters with this; lib/recommendations.ts
// pulls in server-only code, so only its types are imported here.
import type { Recommendation } from "./recommendations";

// Matches the spot name, notes and from-name, ignoring case and surrounding
// spaces. A blank query matches everything.
export function matchesRecSearch(
  rec: Pick<Recommendation, "name" | "notes" | "from_name">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [rec.name, rec.notes, rec.from_name].some((field) => field?.toLowerCase().includes(q));
}

// The ids that count as selected: ticked AND currently shown by the search,
// so nothing hidden is ever dismissed unseen.
export function visibleSelection(
  recs: Pick<Recommendation, "id" | "name" | "notes" | "from_name">[],
  query: string,
  ticked: ReadonlySet<string>,
): string[] {
  return recs.filter((rec) => ticked.has(rec.id) && matchesRecSearch(rec, query)).map((rec) => rec.id);
}
