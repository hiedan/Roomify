<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import googleLogo from './assets/google.svg';
import appleLogo from './assets/apple.svg';
import emailIcon from './assets/email.svg';
import passwordIcon from './assets/password.svg';
import RoomsPage from './RoomsPage';

const SESSION_KEY = 'roomify.session';
async function request(path, body, token) {
  const response = await fetch('/api/v1/auth/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error?.message || 'Yêu cầu thất bại');
  return result.data;
}
function Login() {
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const token = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (token) {
          const { user } = await request('me', null, token);
          if (!cancelled) setSession({ token, user });
        }
      } catch {
        localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
      } finally { if (!cancelled) setChecking(false); }
    }
    restore();
    return () => { cancelled = true; };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const remember = !registering && form.get('remember') === 'on';
    const body = { email: form.get('email'), password: form.get('password'), ...(registering ? { fullName: form.get('fullName') } : { remember }) };
    setBusy(true); setMessage('');
    try {
      const next = await request(registering ? 'register' : 'login', body);
      localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, next.token);
      setSession(next);
    } catch (error) {
      setMessage(error instanceof TypeError ? 'Không kết nối được máy chủ. Vui lòng thử lại.' : error.message);
    } finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
    setSession(null); setMessage('');
  }
  if (!checking && session) return <RoomsPage user={session.user} onLogout={logout} />;
  return <main className="login-shell"><section className="login-card" aria-label={registering ? 'Roomify sign up' : 'Roomify sign in'}>
    {checking ? <p role="status">Đang kiểm tra phiên đăng nhập…</p> : <form key={String(registering)} onSubmit={submit} aria-busy={busy}>
      {registering && <><h1>Sign Up</h1><label htmlFor="fullName">Full name</label><div className="field"><input id="fullName" name="fullName" autoComplete="name" placeholder="Your full name" minLength={2} maxLength={100} required disabled={busy} /></div></>}
      <label htmlFor="email">Gmail</label><div className="field"><img src={emailIcon} alt="" /><input id="email" name="email" type="email" autoComplete="username" placeholder="Enter your Gmail" maxLength={255} required disabled={busy} /></div>
      <label htmlFor="password">Password</label><div className="field"><img src={passwordIcon} alt="" /><input id="password" name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder="Enter your Password" minLength={8} maxLength={72} required disabled={busy} /></div>
      {!registering && <div className="options"><label className="remember"><input name="remember" type="checkbox" disabled={busy} /><span>Remember me</span></label><button className="text-button" type="button" onClick={() => setMessage('Quên mật khẩu chưa được hỗ trợ.')} disabled={busy}>Forgot password?</button></div>}
      <button className="sign-in" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : registering ? 'Sign Up' : 'Sign In'}</button>
      <p className="status-message" role="status" lang="vi">{message}</p>
      <p className="signup-prompt">{registering ? 'Already have an account?' : "Don't have an account?"} <button className="text-button" type="button" disabled={busy} onClick={() => { setRegistering(!registering); setMessage(''); }}>{registering ? 'Sign In' : 'Sign Up'}</button></p>
      {!registering && <><p className="or">Or With</p><div className="social-row"><button type="button" className="social" disabled title="Chưa hỗ trợ Google"><img src={googleLogo} alt="" />Google</button><button type="button" className="social" disabled title="Chưa hỗ trợ Apple"><img src={appleLogo} alt="" />Apple</button></div></>}
    </form>}
  </section></main>;
}
createRoot(document.getElementById('root')).render(<Login />);
=======
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
>>>>>>> develop
