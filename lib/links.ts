import type { RestaurantLink } from "./restaurants";

export const MAX_LINK_LABEL = 30;

const DEFAULT_LABEL: Record<RestaurantLink["type"], string> = {
  website: "Website",
  instagram: "Instagram",
  other: "Link",
};

// The button text for a link: Lex's own name for it ("Book a table"), or the
// link type's name when there isn't one.
export function linkLabel(link: RestaurantLink): string {
  return link.label?.trim() || DEFAULT_LABEL[link.type] || "Link";
}

// The placeholder in the admin's "Button name" box.
export function defaultLinkLabel(type: RestaurantLink["type"]): string {
  return DEFAULT_LABEL[type] ?? "Link";
}

// What gets saved: names trimmed, empty names dropped so the type's name
// shows instead.
export function normalizeLinks(links: RestaurantLink[]): RestaurantLink[] {
  return links.map(({ label, ...link }) => {
    const name = label?.trim();
    return name ? { ...link, label: name } : link;
  });
}
