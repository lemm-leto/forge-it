export class ForgeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ForgeError";
  }
}

export function asForgeError(error: unknown): ForgeError {
  if (error instanceof ForgeError) return error;
  if (error instanceof Error) return new ForgeError("UNEXPECTED_ERROR", error.message);
  return new ForgeError("UNEXPECTED_ERROR", "An unexpected error occurred");
}
