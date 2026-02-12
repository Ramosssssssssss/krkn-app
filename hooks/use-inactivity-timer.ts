import { useCallback, useEffect, useRef, useState } from "react";

const INACTIVITY_TIMEOUT = 180_000; // 3 minutes

/**
 * Hook that tracks user inactivity.
 * Returns { isIdle, resetTimer, onActivity }
 * - isIdle: true when user has been inactive for INACTIVITY_TIMEOUT
 * - resetTimer: manually reset the idle timer
 * - onActivity: call this on any user interaction to reset
 */
export function useInactivityTimer(enabled = true) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    if (isIdle) {
      setIsIdle(false);
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, INACTIVITY_TIMEOUT);
  }, [enabled, isIdle]);

  // Start timer on mount
  useEffect(() => {
    if (enabled) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const onActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const dismiss = useCallback(() => {
    setIsIdle(false);
    resetTimer();
  }, [resetTimer]);

  return { isIdle, onActivity, dismiss };
}
