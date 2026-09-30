import { CodeBlock } from "@/components/dashboard/code-block";
import { SettingsSection } from "@/components/dashboard/settings-section";

export function InstallSection({ snippet }: { snippet: string }) {
  return (
    <SettingsSection
      id="install"
      title="Install"
      description={
        <>
          Paste this snippet before the closing{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            &lt;/body&gt;
          </code>{" "}
          tag on every page where the widget should appear.
        </>
      }
    >
      <div className="p-4 md:p-5">
        <CodeBlock code={snippet} label="index.html" />
      </div>
    </SettingsSection>
  );
}
