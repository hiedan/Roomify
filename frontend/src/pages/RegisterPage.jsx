import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { FormField, SocialButtons } from '../components/AuthLayout';
import Icon from '../components/Icon';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (form.password !== form.confirmation) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }
    setLoading(true);
    try {
      const established = await register({ fullName: form.fullName, email: form.email, password: form.password });
      if (established) navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message || 'Không thể đăng ký. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };
  const update = key => event => setForm({ ...form, [key]: event.target.value });

  return <AuthLayout variant="register" title="Tạo tài khoản mới"
    subtitle="Tạo tài khoản để tìm phòng và bắt đầu sử dụng Roomify.">
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
      <FormField id="fullName" label="Họ và tên" icon="user" autoComplete="name"
        value={form.fullName} onChange={update('fullName')} placeholder="Nguyễn Văn A" required minLength={2} maxLength={100} disabled={loading} />
      <FormField id="email" label="Địa chỉ Email" icon="mail" type="email" autoComplete="email"
        value={form.email} onChange={update('email')} placeholder="ban@gmail.com" required disabled={loading} />
      <FormField id="password" label="Mật khẩu" icon="lock" type="password" autoComplete="new-password"
        value={form.password} onChange={update('password')} placeholder="Tối thiểu 8 ký tự" required minLength={8} disabled={loading} />
      <FormField id="confirmation" label="Xác nhận mật khẩu" icon="lock" type="password" autoComplete="new-password"
        value={form.confirmation} onChange={update('confirmation')} placeholder="Nhập lại mật khẩu" required
        aria-invalid={!!error && form.password !== form.confirmation} aria-describedby={error ? 'register-error' : undefined} disabled={loading} />
      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}<Icon name="arrow" size={18} />
      </button>
      {error && <div id="register-error" className="message error-message" role="alert">{error}</div>}
    </form>
    <SocialButtons register />
    <p className="secondary-text">Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
  </AuthLayout>;
}
