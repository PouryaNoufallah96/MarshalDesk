import { getDb } from "./client";

/** Visitor details as stored in `visitors.details`; `visitCount` lives in its own column. */
export type StoredVisitorDetails = {
  countryCode: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  device: "desktop" | "mobile" | "tablet";
  browser: string | null;
  os: string | null;
  page: string | null;
  referrer: string | null;
};

/** The details the widget reports again on every visit. */
export type VisitDetailsUpdate = Pick<
  StoredVisitorDetails,
  "timezone" | "language" | "page" | "referrer"
>;

export type VisitorRecord = {
  id: string;
  workspaceId: string;
  tokenHash: string;
  /** Raw jsonb; parse it with `visitorDetailsSchema` before use. */
  details: unknown;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export const visitorFields = [
  "id",
  "workspaceId",
  "tokenHash",
  "details",
  "visitCount",
  "firstSeenAt",
  "lastSeenAt",
] as const;

export type VisitorRow = {
  id: string;
  workspaceId: string;
  tokenHash: string;
  details: unknown;
  visitCount: number;
  firstSeenAt: { toString(): string };
  lastSeenAt: { toString(): string };
};

export function toVisitorRecord(row: VisitorRow): VisitorRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tokenHash: row.tokenHash,
    details: row.details,
    visitCount: row.visitCount,
    firstSeenAt: row.firstSeenAt.toString(),
    lastSeenAt: row.lastSeenAt.toString(),
  };
}

export async function createVisitor(
  workspaceId: string,
  input: { tokenHash: string; details: StoredVisitorDetails },
): Promise<VisitorRecord> {
  const row = await getDb()
    .orm.public.Visitor.select(...visitorFields)
    .create({
      workspaceId,
      tokenHash: input.tokenHash,
      details: input.details,
    });
  return toVisitorRecord(row);
}

export async function findVisitor(
  workspaceId: string,
  visitorId: string,
): Promise<VisitorRecord | null> {
  const row = await getDb()
    .orm.public.Visitor.select(...visitorFields)
    .where({ id: visitorId, workspaceId })
    .first();
  return row ? toVisitorRecord(row) : null;
}

/** Counts a returning visit and refreshes the details the widget reports each time. */
export async function recordVisit(
  workspaceId: string,
  visitorId: string,
  update: VisitDetailsUpdate,
): Promise<boolean> {
  const db = getDb();
  const plan = db.raw.sql`
    UPDATE visitors
    SET last_seen_at = now(),
        visit_count = visit_count + 1,
        details = details || ${JSON.stringify(update)}::jsonb
    WHERE id = ${visitorId}::uuid AND workspace_id = ${workspaceId}::uuid
    RETURNING id`
    .returnsRow({ id: "pg/uuid@1" })
    .build();
  const rows = await db.runtime().query(plan);
  return rows.length > 0;
}
