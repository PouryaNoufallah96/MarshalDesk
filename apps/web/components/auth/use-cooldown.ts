"use client";

import { useCallback, useEffect, useState } from "react";

/** A seconds countdown that starts on mount, for "Resend code" buttons. */
export function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, restart };
}
