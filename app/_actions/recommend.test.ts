import { beforeEach, expect, test, vi } from "vitest";

vi.mock("botid/server", () => ({ checkBotId: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/recommendations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recommendations")>()),
  countRecentFromIp: vi.fn(),
  countWaiting: vi.fn(),
  insertRecommendation: vi.fn(),
}));

process.env.SESSION_SECRET = "test-secret";

const { checkBotId } = await import("botid/server");
const { headers } = await import("next/headers");
const { countRecentFromIp, countWaiting, insertRecommendation, hashIp } =
  await import("@/lib/recommendations");
const { submitRecommendationAction } = await import("./recommend");

const valid = { name: " ZZ Test Rec ", maps_url: "", notes: "Kaya toast", from_name: "" };
const generic = { error: "Couldn't send that. Try again." };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = "test-secret";
  vi.mocked(checkBotId).mockResolvedValue({ isBot: false } as never);
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? "1.2.3.4" : null),
  } as never);
  vi.mocked(countRecentFromIp).mockResolvedValue(0);
  vi.mocked(countWaiting).mockResolvedValue(0);
  vi.mocked(insertRecommendation).mockResolvedValue();
});

test("a bot is refused and nothing is saved", async () => {
  vi.mocked(checkBotId).mockResolvedValue({ isBot: true } as never);
  expect(await submitRecommendationAction(valid)).toEqual(generic);
  expect(insertRecommendation).not.toHaveBeenCalled();
});

test("a filled trap field looks like success but saves nothing", async () => {
  expect(await submitRecommendationAction({ ...valid, website: "x" })).toEqual({ ok: true });
  expect(insertRecommendation).not.toHaveBeenCalled();
  expect(countRecentFromIp).not.toHaveBeenCalled();
  expect(countWaiting).not.toHaveBeenCalled();
});

test("the 11th rec in an hour is refused", async () => {
  vi.mocked(countRecentFromIp).mockResolvedValue(10);
  expect(await submitRecommendationAction(valid)).toEqual({
    error: "That's a lot of recs! Try again in a bit.",
  });
  expect(insertRecommendation).not.toHaveBeenCalled();
});

test("the hourly window is the last hour, by IP hash", async () => {
  await submitRecommendationAction(valid);
  const [hash, since] = vi.mocked(countRecentFromIp).mock.calls[0];
  expect(hash).toBe(hashIp("1.2.3.4", "test-secret"));
  expect(Math.abs(since.getTime() - (Date.now() - 3_600_000))).toBeLessThan(1000);
});

test("a full inbox refuses new recs", async () => {
  vi.mocked(countWaiting).mockResolvedValue(200);
  expect(await submitRecommendationAction(valid)).toEqual({
    error: "My inbox is full right now, try again later.",
  });
  expect(insertRecommendation).not.toHaveBeenCalled();
});

test("an invalid rec is refused with its message", async () => {
  expect(
    await submitRecommendationAction({ ...valid, name: "x".repeat(101) }),
  ).toEqual({ error: "Spot name is too long" });
  expect(insertRecommendation).not.toHaveBeenCalled();
});

test("a valid rec is saved trimmed with the hashed IP", async () => {
  expect(await submitRecommendationAction(valid)).toEqual({ ok: true });
  expect(insertRecommendation).toHaveBeenCalledWith(
    { name: "ZZ Test Rec", maps_url: null, notes: "Kaya toast", from_name: null },
    hashIp("1.2.3.4", "test-secret"),
  );
});

test("a failed save reports the generic error", async () => {
  vi.mocked(insertRecommendation).mockRejectedValue(new Error("db down"));
  expect(await submitRecommendationAction(valid)).toEqual(generic);
});

test("a missing SESSION_SECRET reports the generic error and saves nothing", async () => {
  delete process.env.SESSION_SECRET;
  expect(await submitRecommendationAction(valid)).toEqual(generic);
  expect(insertRecommendation).not.toHaveBeenCalled();
});
