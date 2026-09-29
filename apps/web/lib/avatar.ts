import "server-only";
import type { MemberRecord } from "@marshaldesk/db";
import { Avatar, Style } from "@dicebear/core";
import notionistsNeutral from "@dicebear/styles/notionists-neutral.json";

const generatedStyle = new Style(notionistsNeutral);

// Uploaded photos (avatarKey) take precedence once account settings exist.
export function resolveAvatarUrl(
  member: Pick<MemberRecord, "name" | "avatarUrl">,
): string {
  if (member.avatarUrl) {
    return member.avatarUrl;
  }
  return new Avatar(generatedStyle, { seed: member.name }).toDataUri();
}
