import type { Metadata } from "next";
import { type SignInNotice, SignInForm } from "@/components/auth/sign-in-form";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Sign in" };

// Better Auth's magic-link errors. Anything else on `error` came from Google.
const LINK_ERRORS = new Set([
  "INVALID_TOKEN",
  "EXPIRED_TOKEN",
  "ATTEMPTS_EXCEEDED",
]);

function noticeFor(error: unknown, reset: unknown): SignInNotice | null {
  if (typeof error === "string" && error) {
    return LINK_ERRORS.has(error.toUpperCase())
      ? "link-failed"
      : "sign-in-failed";
  }
  return reset === "1" ? "password-reset" : null;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/auth/sign-in">) {
  await requireViewer(["signed-out"]);
  const { error, reset } = await searchParams;
  const notice = noticeFor(error, reset);
  return <SignInForm key={notice ?? "none"} notice={notice} />;
}
