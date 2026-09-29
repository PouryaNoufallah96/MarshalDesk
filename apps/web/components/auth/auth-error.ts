import { isAuthError } from "@neondatabase/auth/next";

export type AuthErrorKind =
  | "invalid-credentials"
  | "email-not-verified"
  | "invalid-code"
  | "expired-code"
  | "too-many-attempts"
  | "rate-limited"
  | "network"
  | "unknown";

// The Neon SDK renames Better Auth codes it knows (INVALID_EMAIL_OR_PASSWORD
// becomes invalid_credentials). Codes it doesn't know, including all three
// code errors, lose their code and keep only Better Auth's message.
const MESSAGE_KINDS: Record<string, AuthErrorKind> = {
  "Invalid OTP": "invalid-code",
  "OTP expired": "expired-code",
  "Too many attempts": "too-many-attempts",
};

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (error instanceof TypeError) {
    return "network";
  }
  if (!isAuthError(error)) {
    return "unknown";
  }
  switch (error.code) {
    case "invalid_credentials":
      return "invalid-credentials";
    case "email_not_confirmed":
      return "email-not-verified";
    case "over_request_rate_limit":
      return "rate-limited";
  }
  return MESSAGE_KINDS[error.message] ?? "unknown";
}

export function authErrorMessage(error: unknown): string {
  const kind = classifyAuthError(error);
  switch (kind) {
    case "invalid-credentials":
      return "That email and password don't match. Try again, or reset your password.";
    case "email-not-verified":
      return "Verify your email to continue.";
    case "invalid-code":
      return "That code isn't right. Check the email and try again.";
    case "expired-code":
      return "That code has expired. Request a new one.";
    case "too-many-attempts":
      return "Too many wrong tries for this code. Request a new code and try again.";
    case "rate-limited":
      return "That's a lot of tries in a short time. Wait a minute, then try again.";
    case "network":
      return "We couldn't reach the server. Check your connection and try again.";
    case "unknown":
      return "Something went wrong on our side. Try again in a moment.";
    default: {
      const unhandled: never = kind;
      throw new Error(`Unhandled auth error kind: ${String(unhandled)}`);
    }
  }
}

/**
 * Runs an auth client call and returns its error, or null on success. The Neon
 * SDK's fetch wrapper throws for failed responses, so both paths are handled.
 */
export async function authRequest(
  request: () => Promise<{ error: unknown }>,
): Promise<unknown> {
  try {
    const { error } = await request();
    return error ?? null;
  } catch (error) {
    return error ?? new Error("Unknown auth error");
  }
}
