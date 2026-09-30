"use client";

import { useSyncExternalStore } from "react";

const PREFERENCE_KEY = "marshaldesk:notifications";
const CHANGE_EVENT = "marshaldesk:notifications-change";

export type NotificationSetting = "unsupported" | "off" | "on" | "blocked";

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function readPreference(): string | null {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY);
  } catch {
    return null;
  }
}

function writePreference(value: "on" | "off") {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, value);
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function currentSetting(): NotificationSetting {
  if (!supported()) return "unsupported";
  switch (Notification.permission) {
    case "denied":
      return "blocked";
    case "granted":
      return readPreference() === "on" ? "on" : "off";
    case "default":
      return "off";
    default: {
      const unhandled: never = Notification.permission;
      throw new Error(`Unhandled permission: ${String(unhandled)}`);
    }
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  // The permission can change from the browser's site settings.
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

export function useNotificationSetting(): NotificationSetting {
  return useSyncExternalStore(subscribe, currentSetting, () => "unsupported");
}

/** Only ever called from a click: the browser prompt is never shown unasked. */
export async function turnOnNotifications(): Promise<NotificationSetting> {
  if (!supported()) return "unsupported";
  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission === "granted") writePreference("on");
  else window.dispatchEvent(new Event(CHANGE_EVENT));
  return currentSetting();
}

export function turnOffNotifications(): void {
  writePreference("off");
}

export function showNotification({
  title,
  body,
  tag,
  onClick,
}: {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
}): void {
  if (currentSetting() !== "on") return;
  const notification = new Notification(title, { body, tag });
  notification.onclick = () => {
    window.focus();
    onClick();
    notification.close();
  };
}
