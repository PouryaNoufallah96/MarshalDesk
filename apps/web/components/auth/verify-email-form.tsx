"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type VerifyEmailInput, verifyEmailSchema } from "@marshaldesk/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { routes } from "@/lib/routes";
import { authErrorMessage, authRequest } from "./auth-error";
import { AuthHeading, FormAlert, SubmitButton } from "./auth-ui";
import { CodeInput } from "./code-input";
import { ResendCode } from "./resend-code";

export function VerifyEmailForm({
  email,
  signedIn,
}: {
  email: string;
  /** An unverified session exists, so switching emails must sign out first. */
  signedIn: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email, code: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email, code }) => {
    setFormError(null);
    const error = await authRequest(() =>
      authClient.emailOtp.verifyEmail({ email, otp: code }),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      form.setValue("code", "");
      form.setFocus("code");
      return;
    }
    router.replace(routes.welcome);
    router.refresh();
  });

  async function switchEmail() {
    await authRequest(() => authClient.signOut());
    router.replace(routes.signUp);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <AuthHeading title="Check your email">
          We sent a 6-digit code to{" "}
          <span className="font-medium wrap-break-word text-foreground">
            {email}
          </span>
          .
        </AuthHeading>
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="code">Verification code</FieldLabel>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <CodeInput
                id="code"
                autoFocus
                invalid={!!errors.code}
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError errors={[errors.code]} />
        </Field>
        <FormAlert message={formError} />
        <Field>
          <SubmitButton pending={isSubmitting}>Verify email</SubmitButton>
          <ResendCode
            onResend={() =>
              authRequest(() =>
                authClient.emailOtp.sendVerificationOtp({
                  email,
                  type: "email-verification",
                }),
              )
            }
          />
        </Field>
        <FieldDescription className="text-center">
          Wrong address?{" "}
          {signedIn ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm font-normal text-foreground underline"
              onClick={switchEmail}
            >
              Use a different email
            </Button>
          ) : (
            <Link href={routes.signUp}>Use a different email</Link>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
