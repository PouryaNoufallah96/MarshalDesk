"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type EmailOnlyInput,
  emailOnlySchema,
  PASSWORD_MIN_LENGTH,
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@marshaldesk/shared";
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
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { routes } from "@/lib/routes";
import { authErrorMessage, authRequest } from "./auth-error";
import { AuthHeading, FormAlert, SubmitButton } from "./auth-ui";
import { CodeInput } from "./code-input";
import { ResendCode } from "./resend-code";

function sendResetCode(email: string) {
  return authRequest(() => authClient.emailOtp.requestPasswordReset({ email }));
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);

  return email ? (
    <ResetPasswordStep email={email} onChangeEmail={() => setEmail(null)} />
  ) : (
    <RequestCodeStep onSent={setEmail} />
  );
}

function BackToSignIn() {
  return (
    <FieldDescription className="text-center">
      Remembered it? <Link href={routes.signIn}>Back to sign in</Link>
    </FieldDescription>
  );
}

function RequestCodeStep({ onSent }: { onSent: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    const error = await sendResetCode(email);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    onSent(email);
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <AuthHeading title="Reset your password">
          Enter your email and we&apos;ll send you a 6-digit code.
        </AuthHeading>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
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
        <FormAlert message={formError} />
        <Field>
          <SubmitButton pending={isSubmitting}>Send code</SubmitButton>
        </Field>
        <BackToSignIn />
      </FieldGroup>
    </form>
  );
}

function ResetPasswordStep({
  email,
  onChangeEmail,
}: {
  email: string;
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, code: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email, code, password }) => {
    setFormError(null);
    const error = await authRequest(() =>
      authClient.emailOtp.resetPassword({ email, otp: code, password }),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    const signInError = await authRequest(() =>
      authClient.signIn.email({ email, password }),
    );
    if (signInError) {
      router.replace(`${routes.signIn}?reset=1`);
      return;
    }
    router.replace(routes.dashboard);
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <AuthHeading title="Check your email">
          We sent a 6-digit code to{" "}
          <span className="font-medium wrap-break-word text-foreground">
            {email}
          </span>
          . Enter it with your new password.
        </AuthHeading>
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="code">Code</FieldLabel>
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
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? undefined : "password-hint"}
            {...form.register("password")}
          />
          {errors.password ? (
            <FieldError errors={[errors.password]} />
          ) : (
            <FieldDescription id="password-hint">
              At least {PASSWORD_MIN_LENGTH} characters.
            </FieldDescription>
          )}
        </Field>
        <FormAlert message={formError} />
        <Field>
          <SubmitButton pending={isSubmitting}>Reset password</SubmitButton>
          <ResendCode onResend={() => sendResetCode(email)} />
        </Field>
        <FieldDescription className="text-center">
          Wrong address?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm font-normal text-foreground underline"
            onClick={onChangeEmail}
          >
            Use a different email
          </Button>
        </FieldDescription>
        <BackToSignIn />
      </FieldGroup>
    </form>
  );
}
