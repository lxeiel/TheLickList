import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sealData } from "iron-session";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";
const LOGIN_KEY = "test-login-key";
let proxy: typeof import("./proxy").proxy;

beforeAll(async () => {
  process.env.SESSION_SECRET = TEST_SECRET;
  ({ proxy } = await import("./proxy"));
});

beforeEach(() => {
  process.env.LOGIN_KEY = LOGIN_KEY;
});

async function request(path: string, session?: object) {
  const headers = new Headers();
  if (session) {
    headers.set("cookie", `lick-list-session=${await sealData(session, { password: TEST_SECRET })}`);
  }
  return new NextRequest(`http://localhost${path}`, { headers });
}

// Shown the site's ordinary 404 page, with a 404 status.
function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost/_not-found");
  expect(res.headers.get("location")).toBeNull();
}

function expectThrough(res: Response) {
  expect(res.headers.get("x-middleware-next")).toBe("1");
  expect(res.headers.get("x-middleware-rewrite")).toBeNull();
}

describe("admin pages", () => {
  it("are a 404 for a visitor with no session, with no pointer to the login page", async () => {
    expectNotFound(await proxy(await request("/reborn")));
  });

  it("are a 404 for a non-admin session", async () => {
    expectNotFound(await proxy(await request("/reborn", {})));
  });

  it("are a 404 for any other path under /reborn", async () => {
    expectNotFound(await proxy(await request("/reborn/anything")));
  });

  it("reject a cookie sealed with a different secret", async () => {
    const headers = new Headers({
      cookie: `lick-list-session=${await sealData({ isAdmin: true }, { password: "x".repeat(40) })}`,
    });
    expectNotFound(await proxy(new NextRequest("http://localhost/reborn", { headers })));
  });

  it("let a logged-in admin through", async () => {
    expectThrough(await proxy(await request("/reborn", { isAdmin: true })));
  });
});

describe("the login page", () => {
  it("opens with the right key", async () => {
    expectThrough(await proxy(await request(`/reborn/login?key=${LOGIN_KEY}`)));
  });

  it.each([["no key", ""], ["a wrong key", "?key=nope"], ["a blank key", "?key="]])(
    "is a 404 with %s",
    async (_, query) => {
      expectNotFound(await proxy(await request(`/reborn/login${query}`)));
    },
  );

  it("is a 404 even for an admin without the key", async () => {
    expectNotFound(await proxy(await request("/reborn/login", { isAdmin: true })));
  });

  it("never opens while LOGIN_KEY is unset", async () => {
    delete process.env.LOGIN_KEY;
    expectNotFound(await proxy(await request("/reborn/login?key=")));
  });
});
