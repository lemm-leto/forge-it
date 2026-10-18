import { asForgeError } from "./errors.js";

export function writeSuccess(data: unknown, meta?: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ data, ...(meta ? { meta } : {}) })}\n`);
}

export function writeError(error: unknown): void {
  const forgeError = asForgeError(error);
  process.stderr.write(`${JSON.stringify({ error: { code: forgeError.code, message: forgeError.message, ...(forgeError.details ? { details: forgeError.details } : {}) } })}\n`);
}
