import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const asset = (path: string) => readFile(fileURLToPath(new URL(`../assets/${path}`, import.meta.url)), "utf8");

describe("business analyst adapters", () => {
  it("allows OpenCode only the Forge CLIs and web/question tools", async () => {
    const content = await asset("opencode/agents/forge-business-analyst.md");
    expect(content).toContain("resource: \"forge-spec read *\"");
    expect(content).toContain("resource: \"forge-tracker story create *\"");
    expect(content).toContain("action: websearch");
    expect(content).toContain("action: \"*\"");
    const specAuthor = await asset("opencode/agents/forge-spec-author.md");
    expect(specAuthor).toContain("forge-spec draft status");
    expect(specAuthor).toContain("forge-tracker ticket ready");
    const designReviewer = await asset("opencode/agents/forge-design-reviewer.md");
    expect(designReviewer).toContain("forge-prototype create");
    const architect = await asset("opencode/agents/forge-architect.md");
    expect(architect).toContain("resource: \"forge-architecture *\"");
  });

  it("installs the Claude command and a guard hook", async () => {
    const command = await asset("claude-code/.claude/commands/forge/propose.md");
    const guard = await asset("claude-code/.claude/hooks/forge-propose-guard.mjs");
    expect(command).toContain("forge-propose-guard.mjs");
    expect(guard).toContain("permissionDecision: \"deny\"");
    expect(guard).toContain("forge-tracker");
    expect(guard).toContain("forge-design");
    const architectGuard = await asset("claude-code/.claude/hooks/forge-architect-guard.mjs");
    expect(architectGuard).toContain("forge-architecture");
  });
});
