import { beforeEach, expect, test, vi } from "vitest";

const calls: string[][] = [];
let failOn = -1;

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    from: () => ({
      delete: () => ({
        in: async (_column: string, chunk: string[]) => {
          calls.push(chunk);
          return { error: calls.length - 1 === failOn ? new Error("db down") : null };
        },
      }),
    }),
  }),
}));

const { deleteRecommendations } = await import("./recommendations");

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);

beforeEach(() => {
  calls.length = 0;
  failOn = -1;
});

test("deleteRecommendations deletes in chunks of 100", async () => {
  await deleteRecommendations(ids(200));
  expect(calls.map((c) => c.length)).toEqual([100, 100]);
  expect(calls.flat()).toEqual(ids(200));
});

test("deleteRecommendations sends a small list as one chunk", async () => {
  await deleteRecommendations(ids(3));
  expect(calls).toHaveLength(1);
});

test("deleteRecommendations stops at the first error", async () => {
  failOn = 0;
  await expect(deleteRecommendations(ids(250))).rejects.toThrow("db down");
  expect(calls).toHaveLength(1);
});
