import { ForgeError } from "./errors.js";
import type { Config } from "./config.js";
import type { Label, RelationKind, Task, TaskRelation } from "./types.js";

export class VikunjaClient {
  constructor(private readonly config: Config, private readonly request = fetch) {}

  async createTask(projectId: number, input: { title: string; description?: string }): Promise<Task> {
    return this.call<Task>(`/projects/${projectId}/tasks`, "PUT", input);
  }

  async updateTask(taskId: number, input: { title?: string; description?: string; done?: boolean }): Promise<Task> {
    return this.call<Task>(`/tasks/${taskId}`, "POST", input);
  }

  async listProjectTasks(projectId: number): Promise<Task[]> {
    return this.call<Task[]>(`/projects/${projectId}/tasks`, "GET");
  }

  async getTask(taskId: number): Promise<Task> {
    return this.call<Task>(`/tasks/${taskId}`, "GET");
  }

  async getOrCreateLabel(title: string): Promise<Label> {
    const labels = await this.call<Label[]>(`/labels?s=${encodeURIComponent(title)}`, "GET");
    const existing = labels.find((label) => label.title.toLocaleLowerCase() === title.toLocaleLowerCase());
    return existing ?? this.call<Label>("/labels", "PUT", { title });
  }

  async addLabel(taskId: number, labelId: number): Promise<void> {
    await this.call(`/tasks/${taskId}/labels`, "PUT", { label_id: labelId });
  }

  async createRelation(taskId: number, otherTaskId: number, kind: RelationKind): Promise<unknown> {
    return this.call(`/tasks/${taskId}/relations`, "PUT", { other_task_id: otherTaskId, relation_kind: kind });
  }

  async deleteRelation(taskId: number, otherTaskId: number, kind: RelationKind): Promise<void> {
    await this.call(`/tasks/${taskId}/relations/${otherTaskId}/${kind}`, "DELETE");
  }

  async getRelations(taskId: number): Promise<TaskRelation[]> {
    const result = await this.call<unknown>(`/tasks/${taskId}/relations`, "GET");
    return normalizeRelations(result);
  }

  private async call<T = unknown>(path: string, method: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.request(`${this.config.url}/api/v1${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new ForgeError("VIKUNJA_UNREACHABLE", "Could not reach Vikunja", { cause: error instanceof Error ? error.message : String(error) });
    }

    if (response.status === 204) return undefined as T;
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Vikunja request failed with HTTP ${response.status}`;
      throw new ForgeError(response.status === 404 ? "VIKUNJA_NOT_FOUND" : "VIKUNJA_REQUEST_FAILED", message, { status: response.status });
    }
    return payload as T;
  }
}

function normalizeRelations(result: unknown): TaskRelation[] {
  if (Array.isArray(result)) return result.filter(isTaskRelation);
  if (!result || typeof result !== "object") return [];
  const relations: TaskRelation[] = [];
  for (const [kind, tasks] of Object.entries(result)) {
    if (!Array.isArray(tasks)) continue;
    for (const task of tasks) {
      if (task && typeof task === "object" && "id" in task && typeof task.id === "number") {
        relations.push({ other_task_id: task.id, relation_kind: kind as RelationKind });
      }
    }
  }
  return relations;
}

function isTaskRelation(value: unknown): value is TaskRelation {
  return !!value && typeof value === "object" && "other_task_id" in value && "relation_kind" in value;
}
