import { expect, test } from "vitest";
import { pickSnap, stepSize, tapSize } from "./sheet";

const snaps = { collapsed: 160, default: 400, full: 740 };

test("pickSnap goes to the nearest size on a slow release", () => {
  expect(pickSnap(snaps, 150, 0)).toBe("collapsed");
  expect(pickSnap(snaps, 300, 0)).toBe("default");
  expect(pickSnap(snaps, 560, 0)).toBe("default");
  expect(pickSnap(snaps, 600, 0)).toBe("full");
  expect(pickSnap(snaps, 900, 0)).toBe("full");
});

test("pickSnap follows a flick to the next size in its direction", () => {
  // Just above default, flicked up: full, not back to default.
  expect(pickSnap(snaps, 420, 0.8)).toBe("full");
  // Just below full, flicked down: default.
  expect(pickSnap(snaps, 720, -0.8)).toBe("default");
  // Flicked down from default: collapsed.
  expect(pickSnap(snaps, 390, -0.8)).toBe("collapsed");
  // Nothing past the ends.
  expect(pickSnap(snaps, 760, 0.8)).toBe("full");
  expect(pickSnap(snaps, 140, -0.8)).toBe("collapsed");
});

test("stepSize moves one size and stops at the ends", () => {
  expect(stepSize("collapsed", 1)).toBe("default");
  expect(stepSize("default", 1)).toBe("full");
  expect(stepSize("full", 1)).toBe("full");
  expect(stepSize("full", -1)).toBe("default");
  expect(stepSize("collapsed", -1)).toBe("collapsed");
});

test("tapSize toggles half and collapsed, and brings full back to half", () => {
  expect(tapSize("default")).toBe("collapsed");
  expect(tapSize("collapsed")).toBe("default");
  expect(tapSize("full")).toBe("default");
});
