import { beforeEach, expect, test, vi } from "vitest";

vi.mock("botid/server", () => ({ checkBotId: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ login: vi.fn() }));
vi.mock("@/lib/loginAttempts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/loginAttempts")>()),
  recordLoginAttempt: vi.fn(),
  clearLoginAttempts: vi.fn(),
}));

const { checkBotId } = await import("botid/server");
const { headers } = await import("next/headers");
const { redirect } = await import("next/navigation");
const { login } = await import("@/lib/auth");
const { recordLoginAttempt, clearLoginAttempts, LOGIN_ATTEMPT_LIMIT } = await import("@/lib/loginAttempts");
const { hashIp } = await import("@/lib/recommendations");
const { loginAction } = await import("./actions");

const generic = { error: "Couldn't log in. Try again." };

function form(password: string): FormData {
  const data = new FormData();
  data.set("password", password);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = "test-secret";
  vi.mocked(checkBotId).mockResolvedValue({ isBot: false } as never);
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? "1.2.3.4" : null),
  } as never);
  vi.mocked(recordLoginAttempt).mockResolvedValue(1);
  vi.mocked(clearLoginAttempts).mockResolvedValue();
  vi.mocked(login).mockResolvedValue(false);
});

test("the right password logs in, clears the IP's tries and goes to the admin", async () => {
  vi.mocked(login).mockResolvedValue(true);
  await loginAction(form("pw"));
  expect(login).toHaveBeenCalledWith("pw");
  expect(clearLoginAttempts).toHaveBeenCalledWith(hashIp("1.2.3.4", "test-secret"));
  expect(redirect).toHaveBeenCalledWith("/reborn");
});

test("a wrong password is refused and its try stays logged", async () => {
  expect(await loginAction(form("nope"))).toEqual({ error: "Invalid credentials" });
  expect(recordLoginAttempt).toHaveBeenCalledWith(hashIp("1.2.3.4", "test-secret"));
  expect(clearLoginAttempts).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});

test("the last allowed try is still checked", async () => {
  vi.mocked(recordLoginAttempt).mockResolvedValue(LOGIN_ATTEMPT_LIMIT);
  vi.mocked(login).mockResolvedValue(true);
  await loginAction(form("pw"));
  expect(redirect).toHaveBeenCalledWith("/reborn");
});

test("over the limit, even the right password isn't checked", async () => {
  vi.mocked(recordLoginAttempt).mockResolvedValue(LOGIN_ATTEMPT_LIMIT + 1);
  vi.mocked(login).mockResolvedValue(true);
  expect(await loginAction(form("pw"))).toEqual({ error: "Too many tries. Wait a few minutes and try again." });
  expect(login).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});

test("a bot is refused before its try is logged or checked", async () => {
  vi.mocked(checkBotId).mockResolvedValue({ isBot: true } as never);
  expect(await loginAction(form("pw"))).toEqual(generic);
  expect(recordLoginAttempt).not.toHaveBeenCalled();
  expect(login).not.toHaveBeenCalled();
});

test("if the try can't be logged, the password isn't checked", async () => {
  vi.mocked(recordLoginAttempt).mockRejectedValue(new Error("db down"));
  vi.mocked(login).mockResolvedValue(true);
  expect(await loginAction(form("pw"))).toEqual(generic);
  expect(login).not.toHaveBeenCalled();
});

test("without SESSION_SECRET nothing is checked", async () => {
  delete process.env.SESSION_SECRET;
  expect(await loginAction(form("pw"))).toEqual(generic);
  expect(login).not.toHaveBeenCalled();
});

test("a failure to clear the tries doesn't block the login", async () => {
  vi.mocked(login).mockResolvedValue(true);
  vi.mocked(clearLoginAttempts).mockRejectedValue(new Error("db down"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await loginAction(form("pw"));
  expect(redirect).toHaveBeenCalledWith("/reborn");
});
