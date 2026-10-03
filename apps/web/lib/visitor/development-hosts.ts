import { normalizeDomain } from "@marshaldesk/shared";

/**
 * Hosts every workspace allows outside production, without being stored in
 * its allowed domains, so the widget can be tested locally.
 */
export const DEVELOPMENT_HOSTS: readonly string[] =
  process.env.NODE_ENV === "production" ? [] : ["localhost"];

export function isDevelopmentHost(host: string): boolean {
  return DEVELOPMENT_HOSTS.includes(normalizeDomain(host));
}
