#!/usr/bin/env node
import { Command } from "commander";
import { SpecError } from "./errors.js";
import { listSpecs, readSpec } from "./specs.js";

function output(data: unknown): void { process.stdout.write(`${JSON.stringify({ data })}\n`); }
function fail(error: unknown): void {
  const typed = error instanceof SpecError ? error : new SpecError("UNEXPECTED_ERROR", error instanceof Error ? error.message : "Unexpected error");
  process.stderr.write(`${JSON.stringify({ error: { code: typed.code, message: typed.message } })}\n`);
}

const program = new Command().name("forge-spec").description("Safe JSON-only Forge specification access").exitOverride();
program.configureOutput({ writeErr: () => undefined });
program.command("list").action(async () => {
  const data = await listSpecs();
  output(data);
});
program.command("read").requiredOption("--path <path>").action(async (options) => output(await readSpec(options.path)));
const draft = program.command("draft");
draft.command("status").action(async () => output(await (await import("./specs.js")).draftStatus()));
draft.command("read").action(async () => output(await (await import("./specs.js")).readActiveDraft()));
draft.command("create")
  .requiredOption("--ticket-id <id>")
  .requiredOption("--ticket-project <id>")
  .requiredOption("--ticket-title <title>")
  .requiredOption("--slug <slug>")
  .requiredOption("--content <markdown>")
  .action(async (options) => {
    const { createDraft } = await import("./specs.js");
    output(await createDraft({ ticketId: Number(options.ticketId), ticketProject: Number(options.ticketProject), ticketTitle: options.ticketTitle, slug: options.slug, content: options.content }));
  });
program.parseAsync().catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "commander.helpDisplayed") return;
  fail(error);
  process.exitCode = 1;
});
