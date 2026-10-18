import { describe, expect, it } from "vitest";
import { loadConfig, resolveProjectId } from "./config.js";

describe("configuration", () => {
  it("loads required Vikunja environment", () => {
    const config = loadConfig({ VIKUNJA_URL: "https://vikunja.test/", VIKUNJA_TOKEN: "token", VIKUNJA_DEFAULT_PROJECT_ID: "42" });
    expect(config).toMatchObject({ url: "https://vikunja.test", defaultProjectId: 42, epicLabel: "epic" });
    expect(resolveProjectId(undefined, config)).toBe(42);
  });

  it("rejects missing project configuration", () => {
    expect(() => loadConfig({ VIKUNJA_URL: "https://vikunja.test", VIKUNJA_TOKEN: "token" })).toThrow("VIKUNJA_DEFAULT_PROJECT_ID");
  });
});
