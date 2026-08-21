import { useState, useRef, useEffect } from 'react';
 
function App() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const inputRef = useRef(null);
 
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
 
  const searchUser = async () => {
    const q = username.trim();
    if (!q) return;
    setStatus('loading');
    setUser(null);
    try {
      const res = await fetch(`https://api.github.com/users/${q}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setUser(data);
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') searchUser();
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
              run
            </button>
          </div>
          <div className="gf-hint">
            press enter to search <span className="gf-cursor" />
          </div>
 
          <div className="gf-output">
            {status === 'loading' && (
              <div className="gf-loading">fetching user data…</div>
            )}
            {status === 'error' && (
              <div className="gf-error">user "{username}" not found</div>
            )}
 
            {user && user.login && status === 'idle' && (
              <div className="gf-card">
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
 
