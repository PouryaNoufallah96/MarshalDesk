"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  PASSWORD_MIN_LENGTH,
  type SignUpInput,
  signUpSchema,
} from "@marshaldesk/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { routes, verifyEmailRoute } from "@/lib/routes";
import { authErrorMessage, authRequest } from "./auth-error";
import { AuthHeading, FormAlert, SubmitButton } from "./auth-ui";
import { GoogleButton } from "./google-button";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    const error = await authRequest(() =>
      authClient.signUp.email({ name, email, password }),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push(verifyEmailRoute(email));
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <AuthHeading title="Create your account">
          Set up MarshalDesk for your business in a few minutes.
        </AuthHeading>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            autoFocus
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
          <SubmitButton pending={isSubmitting}>Sign up</SubmitButton>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <GoogleButton onError={setFormError} disabled={isSubmitting} />
          <FieldDescription className="text-center">
            Already have an account? <Link href={routes.signIn}>Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
