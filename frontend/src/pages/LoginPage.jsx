import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error: sessionError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const established = await login({
        email: form.email,
        password: form.password,
        rememberMe: form.rememberMe,
      });

      if (established) navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <h1 className="auth-title">Roomify Login Screen</h1>
        {sessionError && <p role="alert">{sessionError}</p>}

        <div className="field-group">
          <label className="field-label" htmlFor="email">Email</label>
          <div className="input-wrap">
            <span className="input-icon">@</span>
            <input
              id="email"
              autoComplete="email"
              className="auth-input"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="password">Password</label>
          <div className="input-wrap">
            <span className="input-icon">🔒</span>
            <input
              id="password"
              autoComplete="current-password"
              className="auth-input"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="Enter your password"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(event) =>
                setForm({ ...form, rememberMe: event.target.checked })
              }
            />
            Remember me
          </label>

          <button type="button" className="link-button" disabled title="Password recovery is not available">
            Forgot password?
          </button>
        </div>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {error ? <div className="message error-message" role="alert">{error}</div> : null}

        <p className="secondary-text">
          Don&apos;t have an account? <Link to="/register">Sign Up</Link>
        </p>

        <div className="divider">Or With</div>

        <div className="social-row">
          <button type="button" className="social-button" disabled title="Social sign-in is not available">
            G Google
          </button>
          <button type="button" className="social-button" disabled title="Social sign-in is not available">
             Apple
          </button>
        </div>
      </form>
    </div>
  );
}