import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox · MarshalDesk",
};

export default function InboxPage() {
  return (
    <div className="flex flex-1 flex-col gap-2 px-4 py-4 md:py-6 lg:px-6">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <p className="text-muted-foreground">
        Conversations with your visitors will show up here.
      </p>
    </div>
  );
}
