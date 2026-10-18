#!/usr/bin/env node
import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

class PipelineError extends Error { constructor(readonly code: string, message: string) { super(message); } }
const output = (data: unknown) => process.stdout.write(`${JSON.stringify({ data })}\n`);
const fail = (error: unknown) => { const typed = error instanceof PipelineError ? error : new PipelineError("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error)); process.stderr.write(`${JSON.stringify({ error: { code: typed.code, message: typed.message } })}\n`); };
function git(args: string[]): string { const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" }); if (result.error || result.status !== 0) throw new PipelineError("GIT_REQUIRED", result.stderr.trim() || "Git repository is required"); return result.stdout.trim(); }
const program = new Command().name("forge-pipeline").exitOverride(); program.configureOutput({ writeErr: () => undefined });
const branch = program.command("branch");
branch.command("start").requiredOption("--ticket-id <id>").requiredOption("--slug <slug>").action(async (options) => { if (!/^\d+$/.test(options.ticketId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) throw new PipelineError("VALIDATION_ERROR", "Use a positive ticket ID and lowercase kebab-case slug"); git(["rev-parse", "--is-inside-work-tree"]); if (git(["status", "--porcelain"])) throw new PipelineError("WORKTREE_DIRTY", "Commit or stash changes before starting a Forge pipeline branch"); const name = `forge/${options.ticketId}-${options.slug}`; const current = git(["branch", "--show-current"]); const exists = spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/heads/${name}`], { cwd: process.cwd() }).status === 0; if (current !== name) git(exists ? ["checkout", name] : ["checkout", "-b", name]); const baseCommit = git(["rev-parse", "HEAD"]); await mkdir(resolve(process.cwd(), ".forge"), { recursive: true }); await writeFile(resolve(process.cwd(), ".forge", "pipeline.json"), `${JSON.stringify({ ticketId: Number(options.ticketId), branch: name, baseCommit, startedAt: new Date().toISOString() }, null, 2)}\n`, "utf8"); output({ branch: name, baseCommit }); });
program.parseAsync().catch((error: unknown) => { if (error && typeof error === "object" && "code" in error && error.code === "commander.helpDisplayed") return; fail(error); process.exitCode = 1; });
