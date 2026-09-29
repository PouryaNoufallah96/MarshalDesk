import type { Metadata } from "next";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Name your business" };

export default async function WelcomePage() {
  await requireViewer(["needs-workspace"]);
  return <WelcomeForm />;
}
