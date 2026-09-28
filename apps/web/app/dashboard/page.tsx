import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Hello from the dashboard</h1>
      <Link
        href="/"
        className="text-muted-foreground underline underline-offset-4"
      >
        Back to the homepage
      </Link>
    </main>
  );
}
