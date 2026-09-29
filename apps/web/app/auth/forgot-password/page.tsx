import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  await requireViewer(["signed-out"]);
  return <ForgotPasswordForm />;
}
