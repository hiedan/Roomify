import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { FormField, SocialButtons } from '../components/AuthLayout';
import Icon from '../components/Icon';

export default function LoginPage() {
  const { login, error: sessionError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const established = await login(form);
      if (established) navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  return <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục tìm kiếm phòng trọ.">
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
      {sessionError && <div className="message error-message" role="alert">{sessionError}</div>}
      <FormField id="email" label="Email" icon="mail" type="email" autoComplete="email"
        value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}
        placeholder="ban@gmail.com" required disabled={loading} />
      <FormField id="password" label="Mật khẩu" icon="lock" type="password" autoComplete="current-password"
        value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}
        placeholder="Nhập mật khẩu" required disabled={loading} />
      <div className="form-row">
        <label className="checkbox-wrap">
          <input type="checkbox" checked={form.rememberMe} disabled={loading}
            onChange={event => setForm({ ...form, rememberMe: event.target.checked })} />Ghi nhớ đăng nhập
        </label>
        <button type="button" className="link-button" disabled title="Khôi phục mật khẩu chưa khả dụng">Quên mật khẩu?</button>
      </div>
      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}<Icon name="arrow" size={18} />
      </button>
      {error && <div className="message error-message" role="alert">{error}</div>}
    </form>
    <SocialButtons />
    <p className="secondary-text">Bạn chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
  </AuthLayout>;
}
