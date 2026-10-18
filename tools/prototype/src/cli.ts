#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface Manifest { state: "draft"; designStatus?: string; prototypeStatus?: string; [key: string]: unknown }
class PrototypeError extends Error { constructor(readonly code: string, message: string) { super(message); } }
const output = (data: unknown) => process.stdout.write(`${JSON.stringify({ data })}\n`);
const fail = (error: unknown) => { const typed = error instanceof PrototypeError ? error : new PrototypeError("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error)); process.stderr.write(`${JSON.stringify({ error: { code: typed.code, message: typed.message } })}\n`); };
async function active(root = process.cwd()): Promise<{ directory: string; relative: string; manifest: Manifest }> {
  const drafts = resolve(root, ".forge", "drafts");
  try { for (const entry of await readdir(drafts, { withFileTypes: true })) { if (!entry.isDirectory() || entry.name === ".lock") continue; try { const manifest = JSON.parse(await readFile(resolve(drafts, entry.name, "manifest.json"), "utf8")) as Manifest; if (manifest.state === "draft") return { directory: resolve(drafts, entry.name), relative: `.forge/drafts/${entry.name}`, manifest }; } catch { /* ignore */ } } } catch { /* no drafts */ }
  throw new PrototypeError("DRAFT_NOT_FOUND", "No active specification draft exists");
}
async function save(item: Awaited<ReturnType<typeof active>>) { await writeFile(resolve(item.directory, "manifest.json"), `${JSON.stringify(item.manifest, null, 2)}\n`, "utf8"); }
function validate(html: string) {
  if (!/<!doctype html>/i.test(html) || !/<html/i.test(html)) throw new PrototypeError("PROTOTYPE_INVALID", "Prototype must be a complete HTML document");
  if (/(?:https?:|<script[^>]+\bsrc\s*=|\bfetch\s*\(|XMLHttpRequest|<form[^>]+\baction\s*=)/i.test(html)) throw new PrototypeError("PROTOTYPE_UNSAFE", "Prototype must not load remote resources, call a network API, or submit a form");
}
const program = new Command().name("forge-prototype").exitOverride();
program.configureOutput({ writeErr: () => undefined });
program.command("status").action(async () => { const item = await active(); output({ path: item.relative, prototypeStatus: item.manifest.prototypeStatus ?? "not-required" }); });
program.command("create").option("--html <html>").option("--html-base64 <base64>").action(async (options) => { const html = options.htmlBase64 === undefined ? options.html : Buffer.from(options.htmlBase64, "base64").toString("utf8"); if (!html) throw new PrototypeError("PROTOTYPE_INVALID", "Supply --html or --html-base64"); const item = await active(); if (!item.manifest.designStatus || item.manifest.designStatus === "not-started") throw new PrototypeError("DESIGN_NOT_FOUND", "Create a design before creating a prototype"); if ((item.manifest.prototypeStatus ?? "not-required") !== "not-required") throw new PrototypeError("PROTOTYPE_EXISTS", "A prototype already exists for the active draft"); validate(html); const directory = resolve(item.directory, "design", "prototype"); await mkdir(directory, { recursive: true }); await writeFile(resolve(directory, "index.html"), html, "utf8"); await writeFile(resolve(directory, "manifest.json"), `${JSON.stringify({ state: "awaiting-approval", entry: "index.html" }, null, 2)}\n`, "utf8"); item.manifest.prototypeStatus = "awaiting-approval"; item.manifest.designStatus = "awaiting-approval"; await save(item); output({ path: `${item.relative}/design/prototype/index.html`, prototypeStatus: "awaiting-approval" }); });
program.command("approve").action(async () => { const item = await active(); if (item.manifest.prototypeStatus !== "awaiting-approval") throw new PrototypeError("PROTOTYPE_NOT_PENDING", "No prototype is awaiting approval"); item.manifest.prototypeStatus = "approved"; item.manifest.designStatus = "approved"; await save(item); output({ path: item.relative, prototypeStatus: "approved", designStatus: "approved" }); });
program.parseAsync().catch((error: unknown) => { if (error && typeof error === "object" && "code" in error && error.code === "commander.helpDisplayed") return; fail(error); process.exitCode = 1; });
