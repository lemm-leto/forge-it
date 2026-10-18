import { lstat, mkdir, realpath, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { SpecError } from "./errors.js";

export interface SpecFile {
  path: string;
}

export interface DraftManifest {
  schemaVersion: 1;
  state: "draft";
  ticket: { id: number; projectId: number; title: string };
  createdAt: string;
  specPath: "spec.md";
  contentSha256: string;
  specStatus: "approved";
  designStatus: "not-started" | "draft" | "awaiting-approval" | "approved";
  prototypeStatus: "not-required" | "draft" | "awaiting-approval" | "approved";
  architecturePlanStatus: "not-started" | "draft" | "approved";
  technicalTasksStatus: "not-started" | "draft" | "approved";
}

export interface DraftStatus {
  active: { path: string; manifest: DraftManifest } | null;
}

export async function listSpecs(root = process.cwd()): Promise<SpecFile[]> {
  const specsRoot = resolve(root, ".forge", "specs");
  try {
    await lstat(specsRoot);
  } catch {
    return [];
  }
  const safeRoot = await realpath(specsRoot);
  return walk(safeRoot, safeRoot);
}

export async function readSpec(path: string, root = process.cwd()): Promise<{ path: string; content: string }> {
  if (!path || path.includes("\0") || path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path)) {
    throw new SpecError("SPEC_PATH_INVALID", "--path must be a relative specification path");
  }
  const specsRoot = resolve(root, ".forge", "specs");
  let safeRoot: string;
  try {
    safeRoot = await realpath(specsRoot);
  } catch {
    throw new SpecError("SPECS_NOT_FOUND", ".forge/specs does not exist");
  }
  const candidate = resolve(safeRoot, path);
  if (!isInside(safeRoot, candidate)) throw new SpecError("SPEC_PATH_INVALID", "--path must stay inside .forge/specs");
  let safeFile: string;
  try {
    safeFile = await realpath(candidate);
  } catch {
    throw new SpecError("SPEC_NOT_FOUND", `Specification '${path}' was not found`);
  }
  if (!isInside(safeRoot, safeFile)) throw new SpecError("SPEC_PATH_INVALID", "Specification path resolves outside .forge/specs");
  const stat = await lstat(safeFile);
  if (!stat.isFile()) throw new SpecError("SPEC_PATH_INVALID", "--path must refer to a file");
  return { path: toPosix(relative(safeRoot, safeFile)), content: await readFile(safeFile, "utf8") };
}

export async function draftStatus(root = process.cwd()): Promise<DraftStatus> {
  const draftsRoot = resolve(root, ".forge", "drafts");
  try {
    const entries = await readdir(draftsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === ".lock") continue;
      const manifestPath = resolve(draftsRoot, entry.name, "manifest.json");
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as DraftManifest;
        if (manifest.state === "draft" && manifest.schemaVersion === 1) {
          return { active: { path: `.forge/drafts/${entry.name}`, manifest } };
        }
      } catch {
        // A directory without a valid manifest is not a completed Forge draft.
      }
    }
  } catch {
    // The draft directory is created on first use.
  }
  return { active: null };
}

export async function readActiveDraft(root = process.cwd()): Promise<{ path: string; manifest: DraftManifest; content: string }> {
  const status = await draftStatus(root);
  if (!status.active) throw new SpecError("DRAFT_NOT_FOUND", "No active specification draft exists");
  const path = resolve(root, status.active.path, status.active.manifest.specPath);
  return { ...status.active, content: await readFile(path, "utf8") };
}

export async function createDraft(input: { ticketId: number; ticketProject: number; ticketTitle: string; slug: string; content: string }, root = process.cwd()): Promise<{ path: string; manifest: DraftManifest }> {
  validateDraftInput(input);
  const draftsRoot = resolve(root, ".forge", "drafts");
  await mkdir(draftsRoot, { recursive: true });
  const lockPath = resolve(draftsRoot, ".lock");
  try {
    await mkdir(lockPath);
  } catch {
    throw new SpecError("DRAFT_LOCKED", "Another specification draft operation is in progress");
  }

  try {
    const status = await draftStatus(root);
    if (status.active) {
      throw new SpecError("DRAFT_EXISTS", `An unmerged specification draft already exists for ticket ${status.active.manifest.ticket.id}`);
    }
    const directoryName = `${input.ticketId}-${input.slug}`;
    const draftPath = resolve(draftsRoot, directoryName);
    try {
      await mkdir(draftPath);
    } catch {
      throw new SpecError("DRAFT_PATH_EXISTS", `Draft directory .forge/drafts/${directoryName} already exists`);
    }
    const manifest: DraftManifest = {
      schemaVersion: 1,
      state: "draft",
      ticket: { id: input.ticketId, projectId: input.ticketProject, title: input.ticketTitle.trim() },
      createdAt: new Date().toISOString(),
      specPath: "spec.md",
      contentSha256: createHash("sha256").update(input.content).digest("hex"),
      specStatus: "approved",
      designStatus: "not-started",
      prototypeStatus: "not-required",
      architecturePlanStatus: "not-started",
      technicalTasksStatus: "not-started",
    };
    await writeFile(resolve(draftPath, "spec.md"), input.content, "utf8");
    await writeFile(resolve(draftPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return { path: `.forge/drafts/${directoryName}`, manifest };
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}

function validateDraftInput(input: { ticketId: number; ticketProject: number; ticketTitle: string; slug: string; content: string }): void {
  if (!Number.isSafeInteger(input.ticketId) || input.ticketId <= 0 || !Number.isSafeInteger(input.ticketProject) || input.ticketProject <= 0) {
    throw new SpecError("DRAFT_INVALID", "Ticket ID and project ID must be positive integers");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new SpecError("DRAFT_INVALID", "--slug must be lowercase kebab-case");
  if (!input.ticketTitle.trim()) throw new SpecError("DRAFT_INVALID", "--ticket-title must not be empty");
  const required = ["# ", "## 1. Problem and intended outcome", "## 2. Scope", "## 3. Out of scope", "## 5. Requirements", "## 8. Assumptions and open questions", "## 9. Traceability"];
  if (required.some((heading) => !input.content.includes(heading))) {
    throw new SpecError("DRAFT_INVALID", "Specification content does not contain all required sections");
  }
}

async function walk(root: string, directory: string): Promise<SpecFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: SpecFile[] = [];
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, entryPath));
    else if (entry.isFile()) files.push({ path: toPosix(relative(root, entryPath)) });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function isInside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value !== "" && !value.startsWith(`..${sep}`) && value !== ".." && !value.includes(`..${sep}`);
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}
