#!/usr/bin/env node
import { Command, Option } from "commander";
import { loadConfig, parseId, resolveProjectId } from "./config.js";
import { ForgeError } from "./errors.js";
import { writeError, writeSuccess } from "./output.js";
import { TrackerService } from "./service.js";
import type { RelationKind } from "./types.js";
import { VikunjaClient } from "./vikunja.js";

const relationKinds = ["blocks", "blocked", "relates", "duplicateof", "duplicates", "parenttask", "subtask"] as const;

function service(): TrackerService {
  const config = loadConfig();
  return new TrackerService(new VikunjaClient(config), config);
}

function requiredTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) throw new ForgeError("VALIDATION_ERROR", "--title must not be empty");
  return normalized;
}

function relationKind(value: string): RelationKind {
  if (value === "blocking") return "blocked";
  if (!(relationKinds as readonly string[]).includes(value)) {
    throw new ForgeError("VALIDATION_ERROR", `--type must be one of: ${[...relationKinds, "blocking"].join(", ")}`);
  }
  return value as RelationKind;
}

function addCreateCommand(group: Command, name: "ticket" | "epic"): void {
  group.command("create")
    .requiredOption("--title <title>")
    .option("--description <description>")
    .option("--project <id>")
    .action(async (options) => {
      const config = loadConfig();
      const tracker = new TrackerService(new VikunjaClient(config), config);
      const projectId = resolveProjectId(options.project, config);
      const data = name === "epic"
        ? await tracker.createEpic(projectId, requiredTitle(options.title), options.description)
        : await tracker.createTicket(projectId, requiredTitle(options.title), options.description);
      writeSuccess(data);
    });
}

const program = new Command();
program
  .name("forge-tracker")
  .description("JSON-first Vikunja tracker CLI")
  .showSuggestionAfterError()
  .exitOverride();
program.configureOutput({ writeErr: () => undefined });

const ticket = program.command("ticket");
const epic = program.command("epic");
addCreateCommand(ticket, "ticket");
addCreateCommand(epic, "epic");

ticket.command("update")
  .requiredOption("--id <id>")
  .option("--title <title>")
  .option("--description <description>")
  .addOption(new Option("--status <status>").choices(["open", "done"]))
  .action(async (options) => {
    const data = await service().updateTicket(parseId(options.id), {
      title: options.title,
      description: options.description,
      status: options.status,
    });
    writeSuccess(data);
  });

ticket.command("get")
  .requiredOption("--id <id>")
  .action(async (options) => writeSuccess(await service().getTicket(parseId(options.id))));

const story = program.command("story");
story.command("create")
  .requiredOption("--title <title>")
  .requiredOption("--user-story <story>")
  .requiredOption("--acceptance <criterion>", "Repeat for every acceptance criterion", (value: string, previous: string[]) => [...previous, value], [])
  .requiredOption("--notes <notes>")
  .requiredOption("--out-of-scope <scope>")
  .option("--project <id>")
  .action(async (options) => {
    const config = loadConfig();
    const data = await new TrackerService(new VikunjaClient(config), config).createStory(resolveProjectId(options.project, config), {
      title: requiredTitle(options.title),
      userStory: options.userStory,
      acceptance: options.acceptance,
      notes: options.notes,
      outOfScope: options.outOfScope,
    });
    writeSuccess(data);
  });

ticket.command("ready")
  .option("--project <id>")
  .action(async (options) => {
    const config = loadConfig();
    const data = await new TrackerService(new VikunjaClient(config), config).readyTasks(resolveProjectId(options.project, config));
    writeSuccess(data, { count: data.length });
  });

const relation = program.command("relation");
for (const action of ["create", "delete"] as const) {
  relation.command(action)
    .requiredOption("--from <id>")
    .requiredOption("--to <id>")
    .requiredOption("--type <type>")
    .action(async (options) => {
      const tracker = service();
      const from = parseId(options.from, "--from");
      const to = parseId(options.to, "--to");
      const type = relationKind(options.type);
      const data = action === "create"
        ? await tracker.createRelation(from, to, type)
        : await tracker.deleteRelation(from, to, type);
      writeSuccess(data);
    });
}

epic.command("attach")
  .requiredOption("--epic <id>")
  .requiredOption("--ticket <id>")
  .action(async (options) => writeSuccess(await service().attachEpic(parseId(options.epic, "--epic"), parseId(options.ticket, "--ticket"))));

epic.command("detach")
  .requiredOption("--epic <id>")
  .requiredOption("--ticket <id>")
  .action(async (options) => writeSuccess(await service().detachEpic(parseId(options.epic, "--epic"), parseId(options.ticket, "--ticket"))));

program.parseAsync().catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "commander.helpDisplayed") process.exitCode = 0;
  else {
    writeError(error);
    process.exitCode = 1;
  }
});
