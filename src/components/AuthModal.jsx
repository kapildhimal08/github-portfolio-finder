import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ initialMode = 'login', reason, onClose, onSuccess }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setInfoMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        onSuccess?.();
      } else {
        const data = await signUp(email, password);
        if (data?.user && !data.session) {
          // Email confirmation is turned on in the Supabase project
          setInfoMsg('Check your email to confirm your account, then log in.');
          setMode('login');
        } else {
          onSuccess?.();
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-modal gf-auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gf-modal-header">
          <h3>{mode === 'login' ? 'Log In' : 'Sign Up'}</h3>
          <button className="gf-modal-close" onClick={onClose} type="button">×</button>
        </div>

        {reason === 'limit' && (
          <p className="gf-auth-reason">
            You've used all your free analyses. Log in or sign up to keep analyzing.
          </p>
        )}

        <div className="gf-auth-tabs">
          <button
            type="button"
            className={`gf-auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={`gf-auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="gf-auth-form" onSubmit={handleSubmit}>
          <input
            className="gf-auth-input"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div className="gf-auth-input-wrap">
            <input
              className="gf-auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="gf-auth-toggle-visibility"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="gf-auth-input-wrap">
              <input
                className="gf-auth-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="gf-auth-toggle-visibility"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁'}
              </button>
            </div>
          )}

          {error && <p className="gf-error">{error}</p>}
          {infoMsg && <p className="gf-auth-info">{infoMsg}</p>}

          <button className="gf-run gf-auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
