import { expect, test } from "vitest";
import { createLimiter } from "./limit";

test("runs at most `limit` tasks at once and resolves every task", async () => {
  const run = createLimiter(2);
  let running = 0;
  let peak = 0;
  const task = (value: number) => async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;
    return value;
  };

  const results = await Promise.all([1, 2, 3, 4, 5].map((n) => run(task(n))));

  expect(results).toEqual([1, 2, 3, 4, 5]);
  expect(peak).toBe(2);
});

test("a failing task frees its slot for the next one", async () => {
  const run = createLimiter(1);
  const failed = run(async () => {
    throw new Error("boom");
  });
  await expect(failed).rejects.toThrow("boom");
  await expect(run(async () => "next")).resolves.toBe("next");
});

test("a task started as another finishes can't jump the queue past the limit", async () => {
  const run = createLimiter(1);
  let running = 0;
  let peak = 0;
  const task = async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;
  };

  const first = run(task);
  const queued = run(task);
  // Starts the moment the first task settles, while the queued one is waking.
  const late = first.then(() => run(task));

  await Promise.all([first, queued, late]);
  expect(peak).toBe(1);
});
