export function embedSnippet(scriptUrl: string, workspaceId: string): string {
  return [
    "<script",
    `  src="${scriptUrl}"`,
    `  data-workspace="${workspaceId}"`,
    "  async",
    "></script>",
  ].join("\n");
}
