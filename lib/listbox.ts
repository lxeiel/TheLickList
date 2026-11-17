// What a key does inside an open single-choice listbox (the sort menu):
// arrows move the highlight (wrapping around), Home/End jump to the ends,
// Enter/Space pick, Escape and Tab close. Null for keys it ignores.
export type ListboxAction = { move: number } | { pick: number } | { close: "escape" | "tab" } | null;

export function listboxKey(key: string, active: number, count: number): ListboxAction {
  switch (key) {
    case "ArrowDown":
      return { move: (active + 1) % count };
    case "ArrowUp":
      return { move: (active - 1 + count) % count };
    case "Home":
      return { move: 0 };
    case "End":
      return { move: count - 1 };
    case "Enter":
    case " ":
      return { pick: active };
    case "Escape":
      return { close: "escape" };
    case "Tab":
      return { close: "tab" };
    default:
      return null;
  }
}
