import { expect, test } from "vitest";
import { listboxKey } from "./listbox";

test("arrows move the highlight and wrap around the ends", () => {
  expect(listboxKey("ArrowDown", 0, 3)).toEqual({ move: 1 });
  expect(listboxKey("ArrowDown", 2, 3)).toEqual({ move: 0 });
  expect(listboxKey("ArrowUp", 1, 3)).toEqual({ move: 0 });
  expect(listboxKey("ArrowUp", 0, 3)).toEqual({ move: 2 });
});

test("Home and End jump to the first and last option", () => {
  expect(listboxKey("Home", 2, 4)).toEqual({ move: 0 });
  expect(listboxKey("End", 0, 4)).toEqual({ move: 3 });
});

test("Enter and Space pick the highlighted option", () => {
  expect(listboxKey("Enter", 1, 3)).toEqual({ pick: 1 });
  expect(listboxKey(" ", 2, 3)).toEqual({ pick: 2 });
});

test("Escape closes; Tab closes without taking the key", () => {
  expect(listboxKey("Escape", 1, 3)).toEqual({ close: "escape" });
  expect(listboxKey("Tab", 1, 3)).toEqual({ close: "tab" });
});

test("other keys do nothing", () => {
  expect(listboxKey("a", 1, 3)).toBeNull();
  expect(listboxKey("ArrowLeft", 1, 3)).toBeNull();
});
