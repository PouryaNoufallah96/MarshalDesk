import "server-only";
import type { StoredVisitorDetails } from "@marshaldesk/db";
import type { WidgetStartInput } from "@marshaldesk/shared";
import { geolocation } from "@vercel/functions";
import UAParser from "ua-parser-js";

function deviceType(type: string | undefined): StoredVisitorDetails["device"] {
  switch (type) {
    case "mobile":
      return "mobile";
    case "tablet":
      return "tablet";
    default:
      return "desktop";
  }
}

function nonEmpty(value: string | undefined): string | null {
  return value ? value : null;
}

/** Location from the platform's headers and device from the user agent. The IP is never read. */
export function captureVisitorDetails(
  headers: Headers,
  reported: WidgetStartInput["details"],
): StoredVisitorDetails {
  const location = geolocation(new Request("http://internal", { headers }));
  const ua = new UAParser(headers.get("user-agent") ?? undefined).getResult();
  return {
    countryCode: nonEmpty(location.country),
    city: nonEmpty(location.city),
    timezone: reported.timezone,
    language: reported.language,
    device: deviceType(ua.device.type),
    browser: nonEmpty(ua.browser.name),
    os: nonEmpty(ua.os.name),
    page: reported.page,
    referrer: reported.referrer,
  };
}
