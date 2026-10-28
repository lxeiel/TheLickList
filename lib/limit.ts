// Runs async tasks with at most `limit` in flight; the rest wait their turn.
// The photo picker uses it so a phone never decodes a dozen full-size photos
// at once.
export function createLimiter(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    // A finishing task hands its slot straight to the next waiter, so the
    // count never drops for a newcomer to slip in.
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
