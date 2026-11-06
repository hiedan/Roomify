import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import SocialLogo from './SocialLogo';

export function Brand() {
  return <Link to="/" className="brand" aria-label="Roomify — Trang chủ">
    <span className="brand-mark"><Icon name="home" size={23} /></span><span>Roomify</span>
  </Link>;
}

export default function AuthLayout({ title, subtitle, variant = 'login', children }) {
  return <main className={`auth-page auth-page--${variant}`}>
    <header className="auth-heading">
      <Brand /><h1>{title}</h1><p>{subtitle}</p>
    </header>
    <section className="auth-shell" aria-label={title}>{children}</section>
    <p className="auth-footer">Roomify · Kết nối bạn với không gian sống phù hợp.</p>
  </main>;
}

export function FormField({ id, label, icon, type = 'text', ...props }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className="field-group">
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className="input-wrap">
      <Icon name={icon} className="input-icon" size={18} />
      <input id={id} className={`auth-input${password ? ' password-input' : ''}`}
        type={password && visible ? 'text' : type} {...props} />
      {password && <button type="button" className="password-toggle"
        aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi')}`}
        aria-pressed={visible} onClick={() => setVisible(!visible)}>
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>}
    </div>
  </div>;
}

export function SocialButtons({ register = false }) {
  const action = register ? 'Đăng ký' : 'Đăng nhập';
  return <>
    <div className="divider">Hoặc tiếp tục với</div>
    <div className="social-row">
      <button type="button" className="social-button" disabled title="Đăng nhập Google chưa khả dụng">
        <SocialLogo provider="google" /><span>{action} bằng Google</span>
      </button>
      <button type="button" className="social-button" disabled title="Đăng nhập Facebook chưa khả dụng">
        <SocialLogo provider="facebook" /><span>{action} bằng Facebook</span>
      </button>
    </div>
    <p className="field-hint social-hint">Google và Facebook hiện chưa khả dụng.</p>
  </>;
}
