import { mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDraft, draftStatus, readActiveDraft, readSpec, listSpecs } from "./specs.js";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = join(tmpdir(), `forge-spec-${crypto.randomUUID()}`);
  roots.push(root);
  await mkdir(join(root, ".forge", "specs", "nested"), { recursive: true });
  await writeFile(join(root, ".forge", "specs", "brief.md"), "Brief");
  await writeFile(join(root, ".forge", "specs", "nested", "rule.md"), "Rule");
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(async (root) => (await import("node:fs/promises")).rm(root, { recursive: true, force: true }))); });

describe("spec isolation", () => {
  it("lists and reads only specifications", async () => {
    const root = await fixture();
    expect(await listSpecs(root)).toEqual([{ path: "brief.md" }, { path: "nested/rule.md" }]);
    await expect(readSpec("nested/rule.md", root)).resolves.toEqual({ path: "nested/rule.md", content: "Rule" });
  });
  it("rejects path traversal", async () => {
    const root = await fixture();
    await expect(readSpec("../../package.json", root)).rejects.toMatchObject({ code: "SPEC_PATH_INVALID" });
  });
  it("rejects a symlink that leaves specs", async () => {
    const root = await fixture();
    await writeFile(join(root, "secret.txt"), "secret");
    await symlink(join(root, "secret.txt"), join(root, ".forge", "specs", "secret.md"));
    await expect(readSpec("secret.md", root)).rejects.toMatchObject({ code: "SPEC_PATH_INVALID" });
  });
});

describe("drafts", () => {
  const content = "# Refund\n\n## 1. Problem and intended outcome\n\nOutcome\n\n## 2. Scope\n\nScope\n\n## 3. Out of scope\n\nNone\n\n## 5. Requirements\n\n### REQ-001\n\n## 8. Assumptions and open questions\n\nNone\n\n## 9. Traceability\n\nTicket";
  it("creates one active draft and blocks another", async () => {
    const root = await fixture();
    const created = await createDraft({ ticketId: 42, ticketProject: 1, ticketTitle: "Refund", slug: "request-refund", content }, root);
    expect(created.path).toBe(".forge/drafts/42-request-refund");
    await expect(draftStatus(root)).resolves.toMatchObject({ active: { manifest: { ticket: { id: 42 } } } });
    await expect(readActiveDraft(root)).resolves.toMatchObject({ content, manifest: { specStatus: "approved" } });
    await expect(createDraft({ ticketId: 43, ticketProject: 1, ticketTitle: "Export", slug: "export", content }, root)).rejects.toMatchObject({ code: "DRAFT_EXISTS" });
  });
});
