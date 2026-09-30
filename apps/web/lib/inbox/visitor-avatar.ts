import { Avatar, Style } from "@dicebear/core";
import thumbs from "@dicebear/styles/thumbs.json";

// Visitors are anonymous, so each one gets a generated avatar seeded by its id.
// A different style from the agent's and the members', so the three read apart.
const visitorStyle = new Style(thumbs);

export function visitorAvatarUrl(visitorId: string): string {
  return new Avatar(visitorStyle, { seed: visitorId }).toDataUri();
}
