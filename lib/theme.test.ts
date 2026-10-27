import { expect, test } from "vitest";
import { themeScript } from "./theme";

// Runs the inline <head> script against a fake window/document and returns
// the theme it applied.
function run({ stored, prefersDark, storageThrows = false }: {
  stored: string | null;
  prefersDark: boolean;
  storageThrows?: boolean;
}): string | undefined {
  const dataset: Record<string, string> = {};
  const window = {
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error("SecurityError");
        return stored;
      },
    },
    matchMedia: (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" && prefersDark }),
  };
  const document = { documentElement: { dataset } };
  new Function("window", "document", themeScript)(window, document);
  return dataset.theme;
}

test("stored choice wins", () => {
  expect(run({ stored: "dark", prefersDark: false })).toBe("dark");
  expect(run({ stored: "light", prefersDark: true })).toBe("light");
});

test("follows the device when nothing is stored", () => {
  expect(run({ stored: null, prefersDark: true })).toBe("dark");
  expect(run({ stored: null, prefersDark: false })).toBe("light");
});

test("ignores garbage in storage", () => {
  expect(run({ stored: "purple", prefersDark: false })).toBe("light");
});

test("themeScript falls back to the device when localStorage throws", () => {
  expect(run({ stored: "dark", prefersDark: true, storageThrows: true })).toBe("dark");
  expect(run({ stored: "dark", prefersDark: false, storageThrows: true })).toBe("light");
});
