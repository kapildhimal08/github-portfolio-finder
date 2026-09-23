// Turns a GitHub user + their repo list into a set of plain numeric
// metrics, then turns those metrics into a 0-100 "Developer Score" with
// a breakdown by category. Pure functions — no fetching here, App.jsx
// already has `user` and `repos` by the time it calls these.

export function computeGithubMetrics(user, repos) {
  const ownRepos = (repos || []).filter((r) => !r.fork);

  const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const totalForks = ownRepos.reduce((sum, r) => sum + (r.forks_count || 0), 0);

  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const activeRepoCount = ownRepos.filter(
    (r) => r.pushed_at && new Date(r.pushed_at).getTime() > oneYearAgo
  ).length;

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const accountAgeYears = createdAt
    ? Math.max((Date.now() - createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000), 1 / 12)
    : 1;
  const reposPerYear = Number((ownRepos.length / accountAgeYears).toFixed(1));

  const languageCounts = {};
  ownRepos.forEach((r) => {
    if (r.language) {
      languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
    }
  });
  const totalWithLanguage = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      percentage: (count / totalWithLanguage) * 100,
    }));

  return {
    totalStars,
    totalForks,
    activeRepoCount,
    reposPerYear,
    accountAgeYears: Number(accountAgeYears.toFixed(1)),
    languageCount: Object.keys(languageCounts).length,
    repoCount: ownRepos.length,
    topLanguages,
  };
}

export function computeDeveloperScore(metrics) {
  const popularity = clampScore(Math.log10(metrics.totalStars + 1) * 35);
  const activity = clampScore(
    (metrics.activeRepoCount / Math.max(metrics.repoCount, 1)) * 100
  );
  const consistency = clampScore(metrics.reposPerYear * 15);
  const diversity = clampScore(metrics.languageCount * 18);

  const total = Math.round(
    popularity * 0.35 + activity * 0.25 + consistency * 0.2 + diversity * 0.2
  );

  return {
    total: clampScore(total),
    breakdown: {
      popularity: Math.round(popularity),
      activity: Math.round(activity),
      consistency: Math.round(consistency),
      diversity: Math.round(diversity),
    },
  };
}

function clampScore(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
