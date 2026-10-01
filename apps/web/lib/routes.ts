export const routes = {
  home: "/",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  verifyEmail: "/auth/verify-email",
  forgotPassword: "/auth/forgot-password",
  welcome: "/auth/welcome",
  dashboard: "/dashboard",
  knowledge: "/dashboard/knowledge",
  inbox: "/dashboard/inbox",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export function verifyEmailRoute(email: string): string {
  return `${routes.verifyEmail}?${new URLSearchParams({ email })}`;
}

/** The inbox, optionally with a conversation open and a state filter applied. */
export function inboxRoute({
  conversationId,
  state,
}: { conversationId?: string; state?: string } = {}): string {
  const path = conversationId
    ? `${routes.inbox}/${encodeURIComponent(conversationId)}`
    : routes.inbox;
  return state ? `${path}?${new URLSearchParams({ state })}` : path;
}

/** Absolute URL for an internal route, for auth callbacks that leave the app. */
export function absoluteAppUrl(route: AppRoute): string {
  return new URL(route, window.location.origin).toString();
}
