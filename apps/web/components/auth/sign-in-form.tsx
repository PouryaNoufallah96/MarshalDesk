"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  emailOnlySchema,
  type SignInInput,
  signInSchema,
} from "@marshaldesk/shared";
import { Loader2Icon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { absoluteAppUrl, routes, verifyEmailRoute } from "@/lib/routes";
import { PasswordInput } from "./password-input";
import { authErrorMessage, authRequest, classifyAuthError } from "./auth-error";
import { AuthHeading, FormAlert, FormNote, SubmitButton } from "./auth-ui";
import { GoogleButton } from "./google-button";

export type SignInNotice = "link-failed" | "sign-in-failed" | "password-reset";

function noticeText(notice: SignInNotice): string {
  switch (notice) {
    case "link-failed":
      return "That sign-in link didn't work. Request a new one or use your password.";
    case "sign-in-failed":
      return "That sign-in didn't work. Try again or use your password.";
    case "password-reset":
      return "Password updated. Sign in with your new password.";
    default: {
      const unhandled: never = notice;
      throw new Error(`Unhandled sign-in notice: ${String(unhandled)}`);
    }
  }
}

export function SignInForm({ notice }: { notice: SignInNotice | null }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(
    notice && notice !== "password-reset" ? noticeText(notice) : null,
  );
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const busy = isSubmitting || sendingLink;

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const error = await authRequest(() =>
      authClient.signIn.email({ email, password }),
    );
    if (!error) {
      router.replace(routes.dashboard);
      router.refresh();
      return;
    }
    if (classifyAuthError(error) === "email-not-verified") {
      await authRequest(() =>
        authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        }),
      );
      router.push(verifyEmailRoute(email));
      return;
    }
    setFormError(authErrorMessage(error));
  });

  async function sendMagicLink() {
    if (busy) return;
    setFormError(null);
    form.clearErrors("password");
    if (!(await form.trigger("email"))) return;
    const { email } = emailOnlySchema.parse({ email: form.getValues("email") });

    setSendingLink(true);
    const error = await authRequest(() =>
      authClient.signIn.magicLink({
        email,
        callbackURL: absoluteAppUrl(routes.dashboard),
        errorCallbackURL: absoluteAppUrl(routes.signIn),
      }),
    );
    setSendingLink(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setLinkSentTo(email);
  }

  if (linkSentTo) {
    return (
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <AuthHeading title="Check your email">
            We sent a sign-in link to{" "}
            <span className="font-medium text-foreground">{linkSentTo}</span>.
            Open it on this device to sign in.
          </AuthHeading>
          <Field>
            <Button
              type="button"
              variant="form-secondary"
              size="field"
              onClick={() => setLinkSentTo(null)}
            >
              Back to sign in
            </Button>
          </Field>
        </FieldGroup>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <AuthHeading title="Welcome back">
          Sign in to your MarshalDesk account.
        </AuthHeading>
        {notice === "password-reset" ? (
          <FormNote>{noticeText(notice)}</FormNote>
        ) : null}
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            variant="ink"
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@yourbusiness.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href={routes.forgotPassword}
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <FormAlert message={formError} />
        <Field>
          <SubmitButton pending={isSubmitting}>Sign in</SubmitButton>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <GoogleButton onError={setFormError} disabled={busy} />
          <Button
            type="button"
            variant="form-secondary"
            size="field"
            disabled={busy}
            aria-busy={sendingLink}
            onClick={sendMagicLink}
          >
            {sendingLink ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <MailIcon aria-hidden />
            )}
            Email me a sign-in link
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link href={routes.signUp}>Sign up</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
