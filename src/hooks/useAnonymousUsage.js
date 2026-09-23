import { useCallback, useEffect, useState } from 'react';
import { FREE_ANALYSIS_LIMIT } from '../lib/usagePolicy';

const STORAGE_KEY = 'gf_anonymous_analysis_count';

function readCount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.) — fail open to 0
    return 0;
  }
}

/**
 * Tracks how many free analyses an anonymous (not-logged-in) visitor has
 * used, persisted in localStorage so it survives page refreshes.
 * Once they log in, this stops mattering (see usagePolicy.canRunAnalysis).
 */
export function useAnonymousUsage() {
  const [count, setCount] = useState(readCount);

  // Keep multiple tabs of the same browser in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setCount(readCount());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const consumeOne = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore write failures
      }
      return next;
    });
  }, []);

  // Handy for testing, or if you ever want a "reset my free tries" debug button
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setCount(0);
  }, []);

  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - count);

  return { count, remaining, consumeOne, reset };
}
