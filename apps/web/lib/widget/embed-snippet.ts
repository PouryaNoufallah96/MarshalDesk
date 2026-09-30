export const EMBED_SCRIPT_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/embed.js`;

export function embedSnippet(scriptUrl: string, workspaceId: string): string {
  return [
    "<script",
    `  src="${scriptUrl}"`,
    `  data-workspace="${workspaceId}"`,
    "  async",
    "></script>",
  ].join("\n");
}
