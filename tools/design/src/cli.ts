#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Status = "not-started" | "draft" | "awaiting-approval" | "approved";
interface Manifest { state: "draft"; specStatus: string; designStatus?: Status; prototypeStatus?: "not-required" | Status; [key: string]: unknown }
class DesignError extends Error { constructor(readonly code: string, message: string) { super(message); } }
const output = (data: unknown) => process.stdout.write(`${JSON.stringify({ data })}\n`);
const fail = (error: unknown) => { const typed = error instanceof DesignError ? error : new DesignError("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error)); process.stderr.write(`${JSON.stringify({ error: { code: typed.code, message: typed.message } })}\n`); };

async function active(root = process.cwd()): Promise<{ directory: string; relative: string; manifest: Manifest }> {
  const drafts = resolve(root, ".forge", "drafts");
  try {
    for (const entry of await readdir(drafts, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === ".lock") continue;
      try {
        const manifest = JSON.parse(await readFile(resolve(drafts, entry.name, "manifest.json"), "utf8")) as Manifest;
        if (manifest.state === "draft") return { directory: resolve(drafts, entry.name), relative: `.forge/drafts/${entry.name}`, manifest };
      } catch { /* ignore incomplete directories */ }
    }
  } catch { /* no drafts */ }
  throw new DesignError("DRAFT_NOT_FOUND", "No active specification draft exists");
}
async function save(item: Awaited<ReturnType<typeof active>>): Promise<void> { await writeFile(resolve(item.directory, "manifest.json"), `${JSON.stringify(item.manifest, null, 2)}\n`, "utf8"); }
function validate(content: string): void {
  const headings = ["# Design:", "## 1. Design objective", "## 2. Design decisions", "## 3. User journey", "## 4. Screens and states", "## 6. User-visible exceptions", "## 8. Traceability"];
  if (headings.some((heading) => !content.includes(heading))) throw new DesignError("DESIGN_INVALID", "Design content does not contain all required sections");
}

const program = new Command().name("forge-design").exitOverride();
program.configureOutput({ writeErr: () => undefined });
program.command("status").action(async () => { const item = await active(); output({ path: item.relative, designStatus: item.manifest.designStatus ?? "not-started", prototypeStatus: item.manifest.prototypeStatus ?? "not-required" }); });
program.command("create").requiredOption("--content <markdown>").action(async (options) => {
  const item = await active();
  if ((item.manifest.designStatus ?? "not-started") !== "not-started") throw new DesignError("DESIGN_EXISTS", "A design already exists for the active draft");
  validate(options.content);
  await mkdir(resolve(item.directory, "design"), { recursive: true });
  await writeFile(resolve(item.directory, "design", "design.md"), options.content, "utf8");
  item.manifest.designStatus = "draft"; item.manifest.prototypeStatus = "not-required"; await save(item);
  output({ path: `${item.relative}/design/design.md`, designStatus: "draft" });
});
program.command("approve").action(async () => {
  const item = await active();
  if (!item.manifest.designStatus || item.manifest.designStatus === "not-started") throw new DesignError("DESIGN_NOT_FOUND", "Create a design before approving it");
  if (item.manifest.prototypeStatus && !["not-required", "approved"].includes(item.manifest.prototypeStatus)) throw new DesignError("PROTOTYPE_PENDING", "Approve or mark the prototype before approving the design");
  item.manifest.designStatus = "approved"; await save(item); output({ path: item.relative, designStatus: "approved" });
});
program.parseAsync().catch((error: unknown) => { if (error && typeof error === "object" && "code" in error && error.code === "commander.helpDisplayed") return; fail(error); process.exitCode = 1; });
