#!/usr/bin/env node
import { Command } from "commander";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyEdits, modify, parse } from "jsonc-parser";

type Target = "opencode" | "claude-code";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function output(data: unknown): void { process.stdout.write(`${JSON.stringify({ data })}\n`); }
function fail(error: unknown): void { process.stderr.write(`${JSON.stringify({ error: { code: "INSTALL_FAILED", message: error instanceof Error ? error.message : String(error) } })}\n`); }

async function copyAsset(relative: string, destination: string, force: boolean): Promise<void> {
  if (existsSync(destination) && !force) throw new Error(`${destination} already exists; rerun with --force to replace it`);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(packageRoot, "assets", relative), destination, { force: Boolean(force) });
}

async function installOpenCode(root: string, force: boolean): Promise<string[]> {
  const installed = [".opencode/agents/forge-business-analyst.md", ".opencode/agents/forge-spec-author.md", ".opencode/agents/forge-design-reviewer.md", ".opencode/agents/forge-architect.md", ".opencode/agents/forge-test-engineer.md", ".opencode/agents/forge-implementer.md", ".opencode/agents/forge-merge-manager.md", ".opencode/agents/forge-ship.md"];
  for (const file of installed) await copyAsset(`opencode/agents/${file.split("/").pop()}`, join(root, file), force);
  const configPath = join(root, ".opencode", "opencode.jsonc");
  await mkdir(dirname(configPath), { recursive: true });
  const existing = existsSync(configPath) ? await readFile(configPath, "utf8") : "{\n  \"$schema\": \"https://opencode.ai/config.json\"\n}\n";
  const parsed = parse(existing);
  if (parsed === undefined) throw new Error(`${configPath} is not valid JSONC`);
  let updated = applyEdits(existing, modify(existing, ["commands", "forge:analyze"], {
    description: "Analyse a feature request and propose business stories",
    agent: "forge-business-analyst",
    template: "Analyse and propose the following feature request. Follow the business-analyst workflow and ask questions before creating tickets.\n\n$ARGUMENTS",
  }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
  updated = applyEdits(updated, modify(updated, ["commands", "forge:propose"], {
    description: "Create a draft business specification from a ticket",
    agent: "forge-spec-author",
    template: "Create a draft specification. If a ticket ID is supplied, use it; otherwise list ready tickets and ask the user to choose. Follow the spec-author workflow.\n\n$ARGUMENTS",
  }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
  updated = applyEdits(updated, modify(updated, ["commands", "forge:design"], {
    description: "Create and approve product design and an optional local prototype for the active draft",
    agent: "forge-design-reviewer",
    template: "Create a product design for the active draft specification. Decide with the user whether an interactive prototype is required, and do not approve anything without the user's explicit confirmation.\n\n$ARGUMENTS",
  }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
  updated = applyEdits(updated, modify(updated, ["commands", "forge:architect"], {
    description: "Create an approved technical plan and task breakdown for the active draft",
    agent: "forge-architect",
    template: "Inspect the existing system read-only and create a technical plan for the active Forge draft. Do not create tracker tickets. Ask for approval before each artifact.\n\n$ARGUMENTS",
  }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
  for (const [name, agent, description, template] of [["forge:test", "forge-test-engineer", "Create test plan and tests", "Create approved test plan, quality gates and red tests for the active draft."], ["forge:implement", "forge-implementer", "Implement approved draft", "Implement approved technical tasks and make quality gates green."], ["forge:merge", "forge-merge-manager", "Merge approved Forge draft", "Run forge-merge after all approved artifacts and quality gates pass."], ["forge:ship", "forge-ship", "Run Forge delivery pipeline", "Select a ready ticket when no ID is supplied and coordinate the Forge delivery pipeline without business analysis."]] as const) updated = applyEdits(updated, modify(updated, ["commands", name], { description, agent, template: `${template}\n\n$ARGUMENTS` }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
  await writeFile(configPath, updated, "utf8");
  installed.push(".opencode/opencode.jsonc");
  return installed;
}

async function installClaudeCode(root: string, force: boolean): Promise<string[]> {
  const files = [".claude/commands/forge/analyze.md", ".claude/commands/forge/propose.md", ".claude/commands/forge/design.md", ".claude/commands/forge/architect.md", ".claude/commands/forge/test.md", ".claude/commands/forge/implement.md", ".claude/commands/forge/ship.md", ".claude/hooks/forge-propose-guard.mjs", ".claude/hooks/forge-architect-guard.mjs"];
  for (const file of files) await copyAsset(`claude-code/${file}`, join(root, file), force);
  return files;
}

const program = new Command().name("forge-it").description("Forge It installer").exitOverride();
program.configureOutput({ writeErr: () => undefined });
program.command("install")
  .requiredOption("--target <target>", "opencode or claude-code")
  .option("--root <path>", "repository root", process.cwd())
  .option("--force", "replace Forge It files that already exist")
  .action(async (options) => {
    const target = options.target as Target;
    if (target !== "opencode" && target !== "claude-code") throw new Error("--target must be opencode or claude-code");
    const root = resolve(options.root);
    const installed = target === "opencode" ? await installOpenCode(root, options.force) : await installClaudeCode(root, options.force);
    output({ target, installed, commands: ["/forge:analyze", "/forge:propose", "/forge:design", "/forge:architect"], requiredEnvironment: ["VIKUNJA_URL", "VIKUNJA_TOKEN", "VIKUNJA_DEFAULT_PROJECT_ID"] });
  });
program.parseAsync().catch((error: unknown) => { fail(error); process.exitCode = 1; });
