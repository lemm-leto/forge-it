import type { Config } from "./config.js";
import { ForgeError } from "./errors.js";
import type { ForgeTask, RelationKind, Task } from "./types.js";
import { VikunjaClient } from "./vikunja.js";

export class TrackerService {
  constructor(private readonly client: VikunjaClient, private readonly config: Config) {}

  async createTicket(projectId: number, title: string, description?: string): Promise<ForgeTask> {
    return toForgeTask(await this.client.createTask(projectId, { title, description }), this.config.epicLabel);
  }

  async getTicket(id: number): Promise<ForgeTask> {
    return toForgeTask(await this.client.getTask(id), this.config.epicLabel);
  }

  async createStory(projectId: number, input: BusinessStoryInput): Promise<ForgeTask> {
    const description = formatBusinessStory(input);
    return this.createTicket(projectId, input.title.trim(), description);
  }

  async createEpic(projectId: number, title: string, description?: string): Promise<ForgeTask> {
    const task = await this.client.createTask(projectId, { title, description });
    const label = await this.client.getOrCreateLabel(this.config.epicLabel);
    await this.client.addLabel(task.id, label.id);
    return { ...toForgeTask(task, this.config.epicLabel), isEpic: true };
  }

  async updateTicket(id: number, input: { title?: string; description?: string; status?: "open" | "done" }): Promise<ForgeTask> {
    if (input.title === undefined && input.description === undefined && input.status === undefined) {
      throw new ForgeError("VALIDATION_ERROR", "Supply at least one field to update");
    }
    const { status, ...fields } = input;
    const task = await this.client.updateTask(id, { ...fields, done: status === undefined ? undefined : status === "done" });
    return toForgeTask(task, this.config.epicLabel);
  }

  async createRelation(from: number, to: number, type: RelationKind): Promise<{ from: number; to: number; type: RelationKind }> {
    if (from === to) throw new ForgeError("VALIDATION_ERROR", "A task cannot be related to itself");
    await this.client.createRelation(from, to, type);
    return { from, to, type };
  }

  async deleteRelation(from: number, to: number, type: RelationKind): Promise<{ from: number; to: number; type: RelationKind }> {
    await this.client.deleteRelation(from, to, type);
    return { from, to, type };
  }

  async attachEpic(epic: number, ticket: number): Promise<{ epic: number; ticket: number }> {
    await this.client.createRelation(ticket, epic, "parenttask");
    return { epic, ticket };
  }

  async detachEpic(epic: number, ticket: number): Promise<{ epic: number; ticket: number }> {
    await this.client.deleteRelation(ticket, epic, "parenttask");
    return { epic, ticket };
  }

  async readyTasks(projectId: number): Promise<ForgeTask[]> {
    const tasks = await this.client.listProjectTasks(projectId);
    const candidates = tasks.filter((task) => !task.done && !isEpic(task, this.config.epicLabel));
    const ready = await Promise.all(candidates.map(async (task) => {
      const relations = await this.client.getRelations(task.id);
      const blockers = relations.filter((relation) => relation.relation_kind === "blocked");
      for (const blocker of blockers) {
        const blockingTask = await this.client.getTask(blocker.other_task_id);
        if (!blockingTask.done) return undefined;
      }
      return toForgeTask(task, this.config.epicLabel);
    }));
    return ready.filter((task): task is ForgeTask => task !== undefined);
  }
}

export interface BusinessStoryInput {
  title: string;
  userStory: string;
  acceptance: string[];
  notes: string;
  outOfScope: string;
}

export function formatBusinessStory(input: BusinessStoryInput): string {
  const title = input.title.trim();
  const userStory = input.userStory.trim();
  const acceptance = input.acceptance.map((item) => item.trim()).filter(Boolean);
  const notes = input.notes.trim();
  const outOfScope = input.outOfScope.trim();
  if (!title || !userStory || acceptance.length === 0 || !notes || !outOfScope) {
    throw new ForgeError("VALIDATION_ERROR", "title, user story, at least one acceptance criterion, notes and out of scope are required");
  }
  return `## User story\n\n${userStory}\n\n## Acceptance criteria\n\n${acceptance.map((item) => `- ${item}`).join("\n")}\n\n## Notes\n\n${notes}\n\n## Out of scope\n\n${outOfScope}`;
}

export function isEpic(task: Task, epicLabel: string): boolean {
  return task.labels.some((label) => label.title.toLocaleLowerCase() === epicLabel.toLocaleLowerCase());
}

export function toForgeTask(task: Task, epicLabel: string): ForgeTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.done ? "done" : "open",
    projectId: task.project_id,
    isEpic: isEpic(task, epicLabel),
  };
}
