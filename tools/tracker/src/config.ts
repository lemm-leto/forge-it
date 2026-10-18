import { ForgeError } from "./errors.js";

export interface Config {
  url: string;
  token: string;
  defaultProjectId: number;
  epicLabel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const url = env.VIKUNJA_URL?.replace(/\/$/, "");
  const token = env.VIKUNJA_TOKEN;
  const projectText = env.VIKUNJA_DEFAULT_PROJECT_ID;
  const defaultProjectId = Number(projectText);

  if (!url) throw new ForgeError("CONFIG_MISSING", "VIKUNJA_URL is required");
  if (!token) throw new ForgeError("CONFIG_MISSING", "VIKUNJA_TOKEN is required");
  if (!Number.isSafeInteger(defaultProjectId) || defaultProjectId <= 0) {
    throw new ForgeError("CONFIG_INVALID", "VIKUNJA_DEFAULT_PROJECT_ID must be a positive integer");
  }

  return {
    url,
    token,
    defaultProjectId,
    epicLabel: env.FORGE_EPIC_LABEL?.trim() || "epic",
  };
}

export function resolveProjectId(value: string | undefined, config: Config): number {
  if (value === undefined) return config.defaultProjectId;
  const projectId = Number(value);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new ForgeError("VALIDATION_ERROR", "--project must be a positive integer");
  }
  return projectId;
}

export function parseId(value: string, name = "id"): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ForgeError("VALIDATION_ERROR", `${name} must be a positive integer`);
  }
  return id;
}
