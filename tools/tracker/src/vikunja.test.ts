import { describe, expect, it, vi } from "vitest";
import type { Config } from "./config.js";
import { VikunjaClient } from "./vikunja.js";

const config: Config = { url: "https://vikunja.test", token: "secret", defaultProjectId: 1, epicLabel: "epic" };

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("VikunjaClient v1 API", () => {
  it("uses Vikunja v1's create and update verbs", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(response({ id: 1, title: "New", description: "", done: false, project_id: 2, labels: [] }))
      .mockResolvedValueOnce(response({ id: 1, title: "New", description: "", done: true, project_id: 2, labels: [] }));
    const client = new VikunjaClient(config, request);

    await client.createTask(2, { title: "New" });
    await client.updateTask(1, { done: true });

    expect(request.mock.calls[0][0]).toBe("https://vikunja.test/api/v1/projects/2/tasks");
    expect(request.mock.calls[0][1].method).toBe("PUT");
    expect(request.mock.calls[1][1].method).toBe("POST");
  });

  it("uses v1 endpoints to find a label and create a relation", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(response([{ id: 7, title: "epic" }]))
      .mockResolvedValueOnce(response({ id: 1 }));
    const client = new VikunjaClient(config, request);

    await client.getOrCreateLabel("epic");
    await client.createRelation(1, 2, "blocks");

    expect(request.mock.calls[0][0]).toBe("https://vikunja.test/api/v1/labels?s=epic");
    expect(request.mock.calls[1][0]).toBe("https://vikunja.test/api/v1/tasks/1/relations");
    expect(request.mock.calls[1][1].method).toBe("PUT");
  });
});
