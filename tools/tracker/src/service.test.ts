import { describe, expect, it, vi } from "vitest";
import type { Config } from "./config.js";
import { formatBusinessStory, TrackerService } from "./service.js";
import type { Task } from "./types.js";

const config: Config = { url: "https://vikunja.test", token: "secret", defaultProjectId: 1, epicLabel: "epic" };
const task = (id: number, done = false, labels: Task["labels"] = []): Task => ({
  id, title: `Task ${id}`, description: "", done, project_id: 1, labels,
});

describe("TrackerService.readyTasks", () => {
  it("returns only open non-epics without open blockers", async () => {
    const client = {
      listProjectTasks: vi.fn().mockResolvedValue([task(1), task(2), task(3), task(4, false, [{ id: 1, title: "epic" }])]),
      getRelations: vi.fn(async (id: number) => id === 2 ? [{ other_task_id: 99, relation_kind: "blocked" }] : id === 3 ? [{ other_task_id: 100, relation_kind: "blocked" }] : []),
      getTask: vi.fn(async (id: number) => task(id, id === 100)),
    };
    const service = new TrackerService(client as never, config);

    const result = await service.readyTasks(1);

    expect(result.map((item) => item.id)).toEqual([1, 3]);
  });
});

describe("formatBusinessStory", () => {
  it("creates the mandated business template", () => {
    expect(formatBusinessStory({ title: "Refund", userStory: "As a buyer, I want a refund, so that I can correct a purchase.", acceptance: ["Given a paid order, when a refund is requested, then its status is visible."], notes: "Applies to paid orders.", outOfScope: "Partial refunds." })).toContain("## Out of scope");
  });
  it("rejects incomplete stories", () => {
    expect(() => formatBusinessStory({ title: "Refund", userStory: "", acceptance: [], notes: "x", outOfScope: "x" })).toThrow("required");
  });
});
