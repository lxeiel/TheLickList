import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sealData } from "iron-session";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";
let proxy: typeof import("./proxy").proxy;

beforeAll(async () => {
  process.env.SESSION_SECRET = TEST_SECRET;
  ({ proxy } = await import("./proxy"));
});

async function request(session?: object) {
  const headers = new Headers();
  if (session) {
    headers.set("cookie", `lick-list-session=${await sealData(session, { password: TEST_SECRET })}`);
  }
  return new NextRequest("http://localhost/reborn", { headers });
}

describe("admin proxy", () => {
  it("sends a visitor with no session to the login page", async () => {
    const res = await proxy(await request());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/reborn/login");
  });

  it("sends a visitor with a non-admin session to the login page", async () => {
    const res = await proxy(await request({}));
    expect(res.headers.get("location")).toBe("http://localhost/reborn/login");
  });

  it("rejects a cookie sealed with a different secret", async () => {
    const headers = new Headers({
      cookie: `lick-list-session=${await sealData({ isAdmin: true }, { password: "x".repeat(40) })}`,
    });
    const res = await proxy(new NextRequest("http://localhost/reborn", { headers }));
    expect(res.headers.get("location")).toBe("http://localhost/reborn/login");
  });

  it("lets a logged-in admin through", async () => {
    const res = await proxy(await request({ isAdmin: true }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
