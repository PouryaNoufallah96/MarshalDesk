"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const TICK_MS = 30_000;

const InboxClockContext = createContext<number | null>(null);

/** Shared clock for relative times; starts at the server's render time so hydration matches. */
export function InboxClockProvider({
  initialNow,
  children,
}: {
  initialNow: number;
  children: ReactNode;
}) {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <InboxClockContext.Provider value={now}>
      {children}
    </InboxClockContext.Provider>
  );
}

export function useNow(): number {
  const now = useContext(InboxClockContext);
  if (now === null) {
    throw new Error("useNow must be used inside InboxClockProvider.");
  }
  return now;
}
