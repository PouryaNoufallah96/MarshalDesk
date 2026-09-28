export const routes = {
  home: "/",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  verifyEmail: "/auth/verify-email",
  forgotPassword: "/auth/forgot-password",
  welcome: "/auth/welcome",
  dashboard: "/dashboard",
  inbox: "/dashboard/inbox",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export function verifyEmailRoute(email: string): string {
  return `${routes.verifyEmail}?${new URLSearchParams({ email })}`;
}

/** Absolute URL for an internal route, for auth callbacks that leave the app. */
export function absoluteAppUrl(route: AppRoute): string {
  return new URL(route, window.location.origin).toString();
}
