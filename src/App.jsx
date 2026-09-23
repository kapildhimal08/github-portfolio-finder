import { useState, useRef, useEffect } from 'react';
import { computeGithubMetrics, computeDeveloperScore } from './utils/analyzeStats';
import { ScoreGauge, ScoreBreakdown, LanguageChart } from './components/AnalysisCharts';
import { useAuth } from './context/AuthContext';
import { useAnonymousUsage } from './hooks/useAnonymousUsage';
import { useSearchHistory } from './hooks/useSearchHistory';
import { canRunAnalysis } from './lib/usagePolicy';
import { saveAnalysis } from './lib/analysesApi';
import AuthModal from './components/AuthModal';
import AnalysisHistory from './components/AnalysisHistory';
import UsageBadge from './components/UsageBadge';
import RecentSearches from './components/RecentSearches';
import './styles/auth.css';
import './styles/recent-searches.css';

const TRY_USERNAMES = ['torvalds', 'gaearon', 'sindresorhus'];

function App() {
  const { user: authUser, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { count: anonymousCount, remaining, consumeOne } = useAnonymousUsage();
  const { history: recentSearches, addSearch, removeSearch, clearHistory: clearRecentSearches } =
    useSearchHistory();

  const [username, setUsername] = useState('');
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error | loadingProfile
  const inputRef = useRef(null);

  const [metrics, setMetrics] = useState(null);
  const [score, setScore] = useState(null);
  const [report, setReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authReason, setAuthReason] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const resetAnalysis = () => {
    setMetrics(null); setScore(null); setReport(null); setAnalyzeError(null); setSaveMsg(null);
  };

  const searchUser = async (queryOverride) => {
    const q = (queryOverride ?? username).trim();
    if (!q) return;
    setUsername(q);
    setStatus('loading');
    setUser(null);
    setResults([]);
    resetAnalysis();
    try {
      const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=10`);
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      const filtered = (data.items ?? []).filter((i) => i.login.toLowerCase().includes(q.toLowerCase()));
      if (filtered.length === 0) { setStatus('error'); return; }
      setResults(filtered);
      setStatus('idle');
      addSearch(q);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const selectUser = async (login) => {
    setStatus('loadingProfile');
    resetAnalysis();
    try {
      const res = await fetch(`https://api.github.com/users/${login}`);
      if (!res.ok) throw new Error('not found');
      setUser(await res.json());
      setResults([]);
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') searchUser(); };
  const backToResults = () => { setUser(null); resetAnalysis(); searchUser(); };

  const startNewSearch = () => {
    setUsername(''); setResults([]); setUser(null); setStatus('idle');
    resetAnalysis();
    inputRef.current?.focus();
  };

  const fetchUserRepos = async (login) => {
    const res = await fetch(`https://api.github.com/users/${login}/repos?per_page=100&sort=updated`);
    if (!res.ok) throw new Error('repos fetch failed');
    return res.json();
  };

  const runAnalysis = async () => {
    if (!user) return;
    setAnalyzing(true);
    resetAnalysis();
    try {
      const repos = await fetchUserRepos(user.login);
      const computedMetrics = computeGithubMetrics(user, repos);
      const computedScore = computeDeveloperScore(computedMetrics);
      setMetrics(computedMetrics);
      setScore(computedScore);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ metrics: computedMetrics, score: computedScore }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'analysis request failed');
      setReport(data.report);
    } catch (err) {
      console.error(err);
      setAnalyzeError('Could not generate the AI report. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzePortfolio = () => {
    if (!user) return;
    const decision = canRunAnalysis({ isAuthenticated, anonymousCount });
    if (!decision.allowed) {
      setAuthMode('login'); setAuthReason('limit'); setShowAuthModal(true);
      return;
    }
    if (!isAuthenticated) consumeOne();
    runAnalysis();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false); setAuthReason(null);
    if (user) runAnalysis();
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode); setAuthReason(null); setShowAuthModal(true);
  };

  const handleSaveAnalysis = async () => {
    if (!user || !score || !report) return;
    setSaving(true); setSaveMsg(null);
    try {
      await saveAnalysis({
        githubUsername: user.login,
        developerScore: score.total,
        analysisData: { metrics, score },
        aiInsights: report,
      });
      setSaveMsg({ type: 'success', text: 'Saved to your history.' });
    } catch (err) {
      console.error(err);
      setSaveMsg({ type: 'error', text: err.message || 'Could not save analysis.' });
    } finally {
      setSaving(false);
    }
  };

  const openHistoryItem = async (record) => {
    setShowHistory(false);
    setStatus('loadingProfile');
    resetAnalysis();
    try {
      const res = await fetch(`https://api.github.com/users/${record.github_username}`);
      const profile = res.ok ? await res.json() : { login: record.github_username };
      setUser(profile);
      setResults([]);
      setMetrics(record.analysis_data?.metrics ?? null);
      setScore(record.analysis_data?.score ?? { total: record.developer_score, breakdown: {} });
      setReport(record.ai_insights ?? '');
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  // No active result list or open profile card — drives hero/chips/feature cards.
  const isLanding = status === 'idle' && !user && results.length === 0;

  return (
    <div className="gf-root">
      <div className="gf-shell">
        <aside className="gf-sidebar gf-sidebar-left">
          <div className="gf-brand">
            <span className="gf-brand-mark">gh</span>
            <span className="gf-brand-name">GitHub Portfolio Finder</span>
          </div>
          <button className="gf-new-search" onClick={startNewSearch}>+ New search</button>
          <div className="gf-sidebar-section-label">Recent</div>
          <div className="gf-sidebar-recents">
            <RecentSearches
              items={recentSearches}
              onSelect={(q) => searchUser(q)}
              onRemove={removeSearch}
              onClear={clearRecentSearches}
            />
          </div>
        </aside>

        <main className="gf-main">
          <div className="gf-topbar">
            <div className="gf-api-status"><span className="gf-api-dot" />GitHub API connected</div>
          </div>

          <div className="gf-center">
            {isLanding && (
              <>
                <h1 className="gf-hero-title">Discover developer portfolios</h1>
                <p className="gf-hero-sub">
                  Search any GitHub username to explore their projects, contributions, and coding journey.
                </p>
              </>
            )}

            <div className="gf-search-bar-wrap">
              <div className="gf-prompt-row">
                <span className="gf-prompt-sym">❯</span>
                <input
                  ref={inputRef}
                  className="gf-input"
                  type="text"
                  placeholder="Enter GitHub username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="gf-run" onClick={() => searchUser()}>Search</button>
              </div>
              <div className="gf-hint">press enter to search <span className="gf-cursor" /></div>

              {isLanding && (
                <div className="gf-try-row">
                  Try:
                  {TRY_USERNAMES.map((name) => (
                    <button key={name} className="gf-chip" onClick={() => searchUser(name)}>{name}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="gf-output">
              {(status === 'loading' || status === 'loadingProfile') && (
                <div className="gf-loading">
                  {status === 'loading' ? 'searching accounts…' : 'fetching user data…'}
                </div>
              )}
              {status === 'error' && <div className="gf-error">no accounts found for "{username}"</div>}

              {status === 'idle' && results.length > 0 && !user && (
                <div className="gf-results" style={{ marginTop: 20 }}>
                  {results.map((r) => (
                    <button key={r.login} className="gf-result-item" onClick={() => selectUser(r.login)}>
                      @{r.login}
                    </button>
                  ))}
                </div>
              )}

              {user?.login && status === 'idle' && (
                <div className="gf-card">
                  <button className="gf-back" onClick={backToResults}>← back to results</button>
                  <div className="gf-profile">
                    <div className="gf-avatar-wrap">
                      <img src={user.avatar_url} className="gf-avatar" alt="avatar" />
                      <span className="gf-status-dot" />
                    </div>
                    <div>
                      <p className="gf-name">{user.name || user.login}</p>
                      <p className="gf-login">@{user.login}</p>
                      {user.bio && <p className="gf-bio">{user.bio}</p>}
                    </div>
                  </div>

                  <div className="gf-stats">
                    <div className="gf-stat"><div className="gf-stat-num">{user.public_repos ?? 0}</div><div className="gf-stat-label">repos</div></div>
                    <div className="gf-stat"><div className="gf-stat-num">{user.followers ?? 0}</div><div className="gf-stat-label">followers</div></div>
                    <div className="gf-stat"><div className="gf-stat-num">{user.following ?? 0}</div><div className="gf-stat-label">following</div></div>
                  </div>

                  <div className="gf-footer-row">
                    <a href={user.html_url} target="_blank" rel="noreferrer" className="gf-link">view profile →</a>
                    {user.location && <span className="gf-location">📍 {user.location}</span>}
                  </div>

                  <div className="gf-analyze-section">
                    <button className="gf-run gf-analyze-btn" onClick={analyzePortfolio} disabled={analyzing}>
                      {analyzing ? 'Analyzing Portfolio…' : '✨ Analyze Portfolio'}
                    </button>
                    <UsageBadge isAuthenticated={isAuthenticated} remaining={remaining} />
                    {analyzeError && <div className="gf-error">{analyzeError}</div>}

                    {score && (
                      <div className="gf-report">
                        <div className="gf-report-top">
                          <ScoreGauge score={score.total} />
                          <ScoreBreakdown breakdown={score.breakdown} />
                        </div>

                        {metrics?.topLanguages.length > 0 && (
                          <div className="gf-report-block">
                            <p className="gf-report-heading">Top Languages</p>
                            <LanguageChart topLanguages={metrics.topLanguages} />
                          </div>
                        )}

                        {metrics && (
                          <div className="gf-metrics-grid">
                            <div className="gf-metric"><div className="gf-metric-num">{metrics.totalStars}</div><div className="gf-metric-label">total stars</div></div>
                            <div className="gf-metric"><div className="gf-metric-num">{metrics.activeRepoCount}</div><div className="gf-metric-label">active repos</div></div>
                            <div className="gf-metric"><div className="gf-metric-num">{metrics.reposPerYear}</div><div className="gf-metric-label">repos/year</div></div>
                          </div>
                        )}

                        <div className="gf-report-block">
                          <p className="gf-report-heading">AI Report</p>
                          {!report && !analyzeError && <p className="gf-loading">writing report…</p>}
                          {report && <p className="gf-analysis-text">{report}</p>}
                          {report && isAuthenticated && (
                            <div className="gf-save-row">
                              <button className="gf-run gf-save-btn" onClick={handleSaveAnalysis} disabled={saving}>
                                {saving ? 'Saving…' : '💾 Save Analysis'}
                              </button>
                              {saveMsg && (
                                <p className={saveMsg.type === 'success' ? 'gf-save-success' : 'gf-error'}>
                                  {saveMsg.text}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isLanding && (
              <div className="gf-feature-grid">
                <div className="gf-feature-card">
                  <div className="gf-feature-icon">◆</div>
                  <h3 className="gf-feature-title">Portfolio analysis</h3>
                  <p className="gf-feature-desc">Get a developer score built from stars, activity, and language depth.</p>
                </div>
                <div className="gf-feature-card">
                  <div className="gf-feature-icon">◇</div>
                  <h3 className="gf-feature-title">Developer insights</h3>
                  <p className="gf-feature-desc">See top languages, active repos, and yearly output at a glance.</p>
                </div>
                <div className="gf-feature-card">
                  <div className="gf-feature-icon">✦</div>
                  <h3 className="gf-feature-title">AI-written report</h3>
                  <p className="gf-feature-desc">Read a plain-language summary of what stands out in their work.</p>
                </div>
              </div>
            )}
          </div>

          <footer className="gf-footer">
            <span className="gf-footer-copy">
              © {new Date().getFullYear()} GitHub Portfolio Finder. Not affiliated with GitHub, Inc.
            </span>
            <div className="gf-footer-links">
              <a href="#">Privacy policy</a>
              <a href="#">Terms of service</a>
            </div>
          </footer>
        </main>

        <aside className="gf-sidebar gf-sidebar-right">
          <div className="gf-account-box">
            {authLoading ? (
              <span className="gf-account-user">…</span>
            ) : isAuthenticated ? (
              <>
                <span className="gf-account-user">{authUser?.email}</span>
                <button className="gf-account-link" onClick={() => setShowHistory(true)}>History</button>
                <button className="gf-account-link" onClick={signOut}>Logout</button>
              </>
            ) : (
              <>
                <button className="gf-account-link" onClick={() => openAuthModal('login')}>Login</button>
                <button className="gf-account-link gf-account-signup" onClick={() => openAuthModal('signup')}>Sign Up</button>
              </>
            )}
          </div>

          {!isAuthenticated && (
            <div className="gf-pro-card">
              <div className="gf-pro-badge">★ Go Pro</div>
              <p className="gf-pro-title">Unlock full portfolio features</p>
              <ul className="gf-pro-list">
                <li>Unlimited GitHub searches</li>
                <li>Advanced portfolio analysis</li>
                <li>Save unlimited analysis history</li>
              </ul>
              <button className="gf-pro-cta" onClick={() => openAuthModal('signup')}>Upgrade to Pro</button>
              <div style={{ marginTop: 12 }}>
                <UsageBadge isAuthenticated={isAuthenticated} remaining={remaining} />
              </div>
            </div>
          )}
        </aside>
      </div>

      {showAuthModal && (
        <AuthModal initialMode={authMode} reason={authReason} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
      {showHistory && <AnalysisHistory onClose={() => setShowHistory(false)} onSelect={openHistoryItem} />}
    </div>
  );
}

export default App;