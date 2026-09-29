import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home · MarshalDesk",
};

export default function DashboardHomePage() {
  return (
    <div className="flex flex-1 flex-col gap-2 px-4 py-4 md:py-6 lg:px-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="text-muted-foreground">
        This is your workspace. Conversations, your knowledge base and widget
        settings will show up here as they&apos;re added.
      </p>
    </div>
  );
}
