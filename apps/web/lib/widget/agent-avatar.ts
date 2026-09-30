import { Avatar, Style } from "@dicebear/core";
import glass from "@dicebear/styles/glass.json";

// Glass orbs rather than the faces used for members (lib/avatar.ts), so
// visitors can tell the agent apart from a person joining the conversation.
const agentStyle = new Style(glass);

export function generatedAgentAvatarUrl(
  agentName: string,
  accentHex: string,
): string {
  return new Avatar(agentStyle, {
    seed: agentName.trim().toLowerCase(),
    backgroundColor: accentHex,
  }).toDataUri();
}
