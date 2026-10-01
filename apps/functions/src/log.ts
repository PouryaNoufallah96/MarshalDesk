export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One structured line per failure. Never pass secrets or content. */
export function logError(
  route: string,
  fields: Record<string, string | number | null | undefined>,
  error: unknown,
): void {
  console.error(
    JSON.stringify({
      level: "error",
      route,
      ...fields,
      message: errorMessage(error),
    }),
  );
}

export function logInfo(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  console.log(JSON.stringify({ level: "info", event, ...fields }));
}
