import { afterEach, beforeEach, expect, test, vi } from "vitest";

const session = { isAdmin: undefined as boolean | undefined, save: vi.fn(), destroy: vi.fn() };

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("iron-session", () => ({ getIronSession: vi.fn(async () => session) }));

const { login } = await import("./auth");

beforeEach(() => {
  vi.useFakeTimers();
  session.isAdmin = undefined;
  session.save.mockClear();
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
});

afterEach(() => {
  vi.useRealTimers();
});

// A failed login waits before answering; run the clock past it.
async function attempt(password: string): Promise<boolean> {
  const result = login(password);
  await vi.runAllTimersAsync();
  return result;
}

test("the right password logs in", async () => {
  expect(await attempt("correct horse battery staple")).toBe(true);
  expect(session.isAdmin).toBe(true);
  expect(session.save).toHaveBeenCalled();
});

test.each([["wrong"], ["correct horse battery stapl"], ["correct horse battery staple "], [""]])(
  "rejects %j",
  async (password) => {
    expect(await attempt(password)).toBe(false);
    expect(session.save).not.toHaveBeenCalled();
  },
);

test.each([[""], [undefined]])("a blank guess never matches an ADMIN_PASSWORD of %j", async (expected) => {
  if (expected === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = expected;
  expect(await attempt("")).toBe(false);
  expect(session.save).not.toHaveBeenCalled();
});

test("a wrong password waits a second before answering", async () => {
  let settled = false;
  void login("wrong").then(() => (settled = true));
  await vi.advanceTimersByTimeAsync(999);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(settled).toBe(true);
});
