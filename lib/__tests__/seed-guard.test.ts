import { describe, it, expect } from "vitest";
import {
  assertDemoSeedAllowed,
  isLocalHost,
  resolveDemoPassword,
  SeedNotAllowedError,
} from "@/lib/seed-guard";

describe("demo seed guard", () => {
  it("refuses to run without an explicit opt-in", () => {
    expect(() =>
      assertDemoSeedAllowed({ mode: undefined, host: "localhost" }),
    ).toThrow(SeedNotAllowedError);
  });

  it("refuses to run when the mode is anything other than demo", () => {
    expect(() =>
      assertDemoSeedAllowed({ mode: "production", host: "localhost" }),
    ).toThrow(SeedNotAllowedError);
  });

  it("refuses to run in production even when the mode is demo", () => {
    expect(() =>
      assertDemoSeedAllowed({
        mode: "demo",
        nodeEnv: "production",
        host: "localhost",
      }),
    ).toThrow(SeedNotAllowedError);
  });

  it("refuses to run against a remote database by default", () => {
    expect(() =>
      assertDemoSeedAllowed({
        mode: "demo",
        host: "db.abcdefghijklmnopqrst.supabase.co",
      }),
    ).toThrow(SeedNotAllowedError);
  });

  it("allows a remote database only with the explicit opt-in", () => {
    expect(() =>
      assertDemoSeedAllowed({
        mode: "demo",
        allowRemote: "true",
        host: "db.abcdefghijklmnopqrst.supabase.co",
      }),
    ).not.toThrow();
  });

  it("allows a local database with the demo mode", () => {
    expect(() =>
      assertDemoSeedAllowed({ mode: "demo", host: "127.0.0.1" }),
    ).not.toThrow();
    expect(() =>
      assertDemoSeedAllowed({ mode: "demo", host: "localhost" }),
    ).not.toThrow();
  });

  it("treats an unknown host as local", () => {
    expect(isLocalHost("")).toBe(true);
    expect(isLocalHost("db.example.com")).toBe(false);
  });
});

describe("demo password", () => {
  it("generates a password when none is supplied", () => {
    const password = resolveDemoPassword(undefined, () => "generated-value");
    expect(password).toBe("generated-value");
  });

  it("uses the supplied password when there is one", () => {
    expect(resolveDemoPassword("a-long-enough-password", () => "x")).toBe(
      "a-long-enough-password",
    );
  });

  it("rejects a short supplied password", () => {
    expect(() => resolveDemoPassword("short", () => "x")).toThrow();
  });
});
