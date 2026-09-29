import { emailSchema } from "@marshaldesk/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { requireViewer } from "@/lib/auth/viewer";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/auth/verify-email">) {
  const viewer = await requireViewer(["signed-out", "unverified"]);
  const { email: queryEmail } = await searchParams;
  const parsed = emailSchema.safeParse(queryEmail);
  const email =
    viewer.status === "unverified"
      ? viewer.email
      : parsed.success
        ? parsed.data
        : null;

  if (!email) {
    redirect(routes.signUp);
  }

  return (
    <VerifyEmailForm
      key={email}
      email={email}
      signedIn={viewer.status === "unverified"}
    />
  );
}
