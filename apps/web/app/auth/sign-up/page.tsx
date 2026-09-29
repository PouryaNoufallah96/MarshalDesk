import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage() {
  await requireViewer(["signed-out"]);
  return <SignUpForm />;
}
