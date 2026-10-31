import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import googleLogo from './assets/google.svg';
import appleLogo from './assets/apple.svg';
import emailIcon from './assets/email.svg';
import passwordIcon from './assets/password.svg';

function Login() {
  const [message, setMessage] = useState('');
  const showUnavailable = (feature) => setMessage(`${feature} chưa được kết nối. Đây là bản thử giao diện.`);
  return <main className="login-shell">
    <section className="login-card" aria-label="Roomify sign in">
      <form onSubmit={(event) => { event.preventDefault(); showUnavailable('Đăng nhập'); }}>
        <label htmlFor="email">Email</label>
        <div className="field"><img src={emailIcon} alt="" /><input id="email" name="email" type="email" autoComplete="username" placeholder="Enter your Email" required /></div>
        <label htmlFor="password">Password</label>
        <div className="field"><img src={passwordIcon} alt="" /><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your Password" required /></div>
        <div className="options"><label className="remember"><input name="remember" type="checkbox" /> <span>Remember me</span></label><button className="text-button" type="button" onClick={() => showUnavailable('Quên mật khẩu')}>Forgot password?</button></div>
        <button className="sign-in" type="submit">Sign In</button>
        <p className="signup-prompt">Don't have an account? <button className="text-button" type="button" onClick={() => showUnavailable('Đăng ký')}>Sign Up</button></p>
        <p className="or">Or With</p>
        <div className="social-row"><button type="button" className="social" onClick={() => showUnavailable('Đăng nhập Google')}><img src={googleLogo} alt="" />Google</button><button type="button" className="social" onClick={() => showUnavailable('Đăng nhập Apple')}><img src={appleLogo} alt="" />Apple</button></div>
        <p className="status-message" role="status" lang="vi">{message}</p>
      </form>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<Login />);
