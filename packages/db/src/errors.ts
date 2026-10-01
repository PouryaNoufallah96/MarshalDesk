const UNIQUE_VIOLATION = "23505";

/** A constraint name, or `{ prefix }` for names Prisma suffixes with a hash. */
export type ConstraintMatch = string | { prefix: string };

function matchesConstraint(name: unknown, match: ConstraintMatch): boolean {
  if (typeof name !== "string") return false;
  return typeof match === "string"
    ? name === match
    : name.startsWith(match.prefix);
}

// The Postgres runtime throws SqlQueryError with the driver's SQLSTATE and constraint name.
export function isUniqueViolation(
  error: unknown,
  constraint: ConstraintMatch,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "sqlState" in error &&
    error.sqlState === UNIQUE_VIOLATION &&
    "constraint" in error &&
    matchesConstraint(error.constraint, constraint)
  );
}
