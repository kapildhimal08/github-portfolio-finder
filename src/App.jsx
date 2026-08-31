import { useState, useRef, useEffect } from 'react';
 
function App() {
  const [username, setUsername] = useState('');
  const [results, setResults] = useState([]); // list of matching accounts
  const [user, setUser] = useState(null); // full profile of selected account
  const [status, setStatus] = useState('idle'); // idle | loading | error | loadingProfile
  const inputRef = useRef(null);
 
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
 
  // Step 1: search for accounts matching the typed text (partial match)
  const searchUser = async () => {
    const q = username.trim();
    if (!q) return;
    setStatus('loading');
    setUser(null);
    setResults([]);
    try {
      const res = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=10`
      );
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        setStatus('error');
        return;
      }
      const filtered = data.items.filter((item) =>
        item.login.toLowerCase().includes(q.toLowerCase())
      );
      if (filtered.length === 0) {
        setStatus('error');
        return;
      }
      setResults(filtered);
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };
 
  // Step 2: when a result is clicked, fetch that account's full profile
  const selectUser = async (login) => {
    setStatus('loadingProfile');
    try {
      const res = await fetch(`https://api.github.com/users/${login}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setUser(data);
      setResults([]); // hide the list once a profile is chosen
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') searchUser();
  };
 
  const backToResults = () => {
    setUser(null);
    searchUser();
  };
 
  return (
    <div className="gf-root">
      <div className="gf-window">
        <div className="gf-titlebar">
          <div className="gf-dots">
            <span className="gf-dot red" />
            <span className="gf-dot amber" />
            <span className="gf-dot green" />
          </div>
          <span className="gf-titletext">github-finder — zsh</span>
        </div>
 
        <div className="gf-body">
          <div className="gf-prompt-row">
            <span className="gf-prompt-sym">❯</span>
            <input
              ref={inputRef}
              className="gf-input"
              type="text"
              placeholder="search github username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="gf-run" onClick={searchUser}>
              Search
            </button>
          </div>
          <div className="gf-hint">
            press enter to search <span className="gf-cursor" />
          </div>
 
          <div className="gf-output">
            {(status === 'loading' || status === 'loadingProfile') && (
              <div className="gf-loading">
                {status === 'loading' ? 'searching accounts…' : 'fetching user data…'}
              </div>
            )}
            {status === 'error' && (
              <div className="gf-error">no accounts found for "{username}"</div>
            )}
 
            {/* List of matching accounts */}
            {status === 'idle' && results.length > 0 && !user && (
              <div
                className="gf-results"
                style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
              >
                {results.map((r) => (
                  <button
                    key={r.login}
                    className="gf-result-item"
                    onClick={() => selectUser(r.login)}
                    style={{
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: 'rgba(206, 17, 17, 0.03)',
                      border: '1px solid #30363d',
                      borderRadius: '6px',
                      color: '#c9d1d9',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <span className="gf-result-login">@{r.login}</span>
                  </button>
                ))}
              </div>
            )}
 
            {/* Full profile of the selected account */}
            {user && user.login && status === 'idle' && (
              <div className="gf-card">
                <button className="gf-back" onClick={backToResults}>
                  ← back to results
                </button>
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
                  <div className="gf-stat">
                    <div className="gf-stat-num">{user.public_repos ?? 0}</div>
                    <div className="gf-stat-label">repos</div>
                  </div>
                  <div className="gf-stat">
                    <div className="gf-stat-num">{user.followers ?? 0}</div>
                    <div className="gf-stat-label">followers</div>
                  </div>
                  <div className="gf-stat">
                    <div className="gf-stat-num">{user.following ?? 0}</div>
                    <div className="gf-stat-label">following</div>
                  </div>
                </div>
 
                <div className="gf-footer-row">
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="gf-link"
                  >
                    view profile →
                  </a>
                  {user.location && (
                    <span className="gf-location">📍 {user.location}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default App;
 


