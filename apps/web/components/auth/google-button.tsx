"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { absoluteAppUrl, routes } from "@/lib/routes";
import { authErrorMessage, authRequest } from "./auth-error";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function GoogleButton({
  onError,
  disabled,
}: {
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function continueWithGoogle() {
    setPending(true);
    const error = await authRequest(() =>
      authClient.signIn.social({
        provider: "google",
        callbackURL: absoluteAppUrl(routes.dashboard),
        errorCallbackURL: absoluteAppUrl(routes.signIn),
      }),
    );
    // On success the browser is already leaving for Google, so stay pending.
    if (error) {
      setPending(false);
      onError(authErrorMessage(error));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={continueWithGoogle}
    >
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden />
      ) : (
        <GoogleMark />
      )}
      Continue with Google
    </Button>
  );
}
