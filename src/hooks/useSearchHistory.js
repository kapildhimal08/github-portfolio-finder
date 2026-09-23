import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gf_recent_searches';
const MAX_HISTORY = 8;

function readHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore write failures (private browsing, storage full, etc.)
  }
}

/**
 * Tracks the visitor's recent GitHub username searches, most-recent-first,
 * de-duplicated (case-insensitive), capped at MAX_HISTORY entries.
 * Works for anonymous AND logged-in users — it's just per-browser, not
 * tied to an account (unlike the saved "Analysis History").
 */
export function useSearchHistory() {
  const [history, setHistory] = useState(readHistory);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setHistory(readHistory());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addSearch = useCallback((query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const deduped = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...deduped].slice(0, MAX_HISTORY);
      writeHistory(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((query) => {
    setHistory((prev) => {
      const next = prev.filter((q) => q !== query);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory([]);
    setHistory([]);
  }, []);

  return { history, addSearch, removeSearch, clearHistory };
}
