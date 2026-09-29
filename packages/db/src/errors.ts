const UNIQUE_VIOLATION = "23505";

// The Postgres runtime throws SqlQueryError with the driver's SQLSTATE and constraint name.
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "sqlState" in error &&
    error.sqlState === UNIQUE_VIOLATION &&
    "constraint" in error &&
    error.constraint === constraint
  );
}
