import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const established = await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });

      if (established) navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <h1 className="auth-title">Create account</h1>

        <div className="field-group">
          <label className="field-label" htmlFor="fullName">Full name</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input
              id="fullName"
              autoComplete="name"
              className="auth-input"
              type="text"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>

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
              onChange={(event) => setForm({ ...form, email: event.target.value })}
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
              autoComplete="new-password"
              className="auth-input"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Create a password"
              required
            />
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        {error ? <div className="message error-message" role="alert">{error}</div> : null}

        <p className="secondary-text">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
