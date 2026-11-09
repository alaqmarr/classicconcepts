export function isNextRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { message?: unknown; digest?: unknown };
  if (anyErr.message === "NEXT_REDIRECT") return true;
  if (typeof anyErr.digest === "string" && anyErr.digest.startsWith("NEXT_REDIRECT")) {
    return true;
  }
  return false;
}
