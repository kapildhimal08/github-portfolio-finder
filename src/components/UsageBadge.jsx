import { FREE_ANALYSIS_LIMIT } from '../lib/usagePolicy';

export default function UsageBadge({ isAuthenticated, remaining }) {
  if (isAuthenticated) {
    return (
      <div className="gf-usage-badge gf-usage-badge-auth">
        ✓ Logged in — unlimited analyses
      </div>
    );
  }

  const low = remaining <= 2;

  return (
    <div className={`gf-usage-badge ${low ? 'gf-usage-badge-low' : ''}`}>
      {remaining > 0
        ? `${remaining} of ${FREE_ANALYSIS_LIMIT} free analyses left`
        : 'No free analyses left — sign up to continue'}
    </div>
  );
}
