// Free analyses allowed before an anonymous visitor must log in / sign up.
// Bump this number later per subscription tier once that's wired in.
export const FREE_ANALYSIS_LIMIT = 10;

/**
 * Decides whether an "Analyze Portfolio" click is allowed to proceed.
 *
 * Logged-in users currently pass through unconditionally (unlimited).
 * When the subscription tier is added, this is the one place that will
 * need to change: e.g. check `isSubscribed` and apply a different
 * limit/behavior for authenticated-but-not-subscribed users.
 */
export function canRunAnalysis({ isAuthenticated, anonymousCount }) {
  if (isAuthenticated) {
    return { allowed: true };
  }

  if (anonymousCount < FREE_ANALYSIS_LIMIT) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'limit',
    message: `You've used all ${FREE_ANALYSIS_LIMIT} free analyses. Sign up or log in to keep going.`,
  };
}
