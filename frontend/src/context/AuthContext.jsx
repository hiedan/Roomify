import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, currentUserRequest, loginRequest, logoutRequest, registerRequest } from '../api/authApi';

const TOKEN_KEY = 'roomify-auth-token';
const LEGACY_USER_KEY = 'roomify-auth-user';
const LOGOUT_KEY = 'roomify-auth-logout';
const AuthContext = createContext(null);

function clearCredentials() {
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      window[name].removeItem(TOKEN_KEY);
      window[name].removeItem(LEGACY_USER_KEY);
    } catch { /* Blocked browser storage must not prevent in-memory logout. */ }
  }
}
function storedToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}
function sessionEnded(error) {
  return error.code === 'UNAUTHORIZED' || error.code === 'INACTIVE_ACCOUNT';
}
function recoveryMessage(error) {
  return error.code === 'INACTIVE_ACCOUNT'
    ? 'Your account is inactive. Contact an administrator to restore access.'
    : 'Your session has ended. Please sign in again.';
}

export function AuthProvider({ children }) {
  const token = useRef(storedToken());
  const generation = useRef(0);
  const pending = useRef(null);
  const logoutChannel = useRef(null);
  const seenLogouts = useRef(new Set());
  const [state, setState] = useState({ user: null, status: 'checking', error: '' });

  const endSession = useCallback((message = '') => {
    generation.current += 1;
    pending.current?.abort();
    token.current = null;
    clearCredentials();
    // This provider owns all private state; unmounting the protected view also
    // drops its component caches. No user profile is restored from storage.
    setState({ user: null, status: 'anonymous', error: message });
  }, []);

  const refresh = useCallback(async () => {
    if (!token.current) {
      setState({ user: null, status: 'anonymous', error: '' });
      return;
    }
    const version = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setState({ user: null, status: 'checking', error: '' });
    try {
      const user = await currentUserRequest(token.current, controller.signal);
      if (version === generation.current) setState({ user, status: 'authenticated', error: '' });
    } catch (error) {
      if (version !== generation.current || error.name === 'AbortError') return;
      if (sessionEnded(error)) endSession(recoveryMessage(error));
      else setState({ user: null, status: 'unavailable', error: error.message });
    }
  }, [endSession]);

  useEffect(() => {
    const receive = id => {
      if (typeof id !== 'string' || id.length > 80 || !/^[a-z0-9]+-[a-z0-9]+$/.test(id) || seenLogouts.current.has(id)) return;
      seenLogouts.current.add(id);
      if (seenLogouts.current.size > 32) seenLogouts.current.delete(seenLogouts.current.values().next().value);
      // Remote logout is local teardown only: no rebroadcast or HTTP acknowledgement.
      endSession();
    };
    const onStorage = event => {
      // Listen only to a new explicit logout marker, never token cleanup during
      // establish(), marker removal, or a marker left over before mounting.
      if (event.key === LOGOUT_KEY && event.newValue !== null) receive(event.newValue);
    };
    let channel;
    try {
      channel = new BroadcastChannel('roomify-auth');
      channel.onmessage = event => {
        if (event.data?.type === 'logout') receive(event.data.id);
      };
      logoutChannel.current = channel;
    } catch { /* Storage events remain available if channels are unsupported/blocked. */ }
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      if (logoutChannel.current === channel) logoutChannel.current = null;
      if (channel) { channel.onmessage = null; channel.close(); }
    };
  }, [endSession]);

  useEffect(() => {
    for (const name of ['sessionStorage', 'localStorage']) {
      try { window[name].removeItem(LEGACY_USER_KEY); } catch { /* No cached identity is trusted. */ }
    }
    refresh();
    const restorePage = event => {
      if (!event.persisted) return;
      // A browser back/forward cache can restore this component without mounting
      // it again. Re-read storage so an older document cannot resurrect logout.
      token.current = storedToken();
      if (token.current) refresh();
      else endSession();
    };
    window.addEventListener('pageshow', restorePage);
    return () => {
      generation.current += 1;
      pending.current?.abort();
      window.removeEventListener('pageshow', restorePage);
    };
  }, [refresh, endSession]);

  const establish = useCallback(async (payload, register = false) => {
    const version = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const result = await (register ? registerRequest : loginRequest)(payload, controller.signal);
    if (version !== generation.current) return false;
    clearCredentials();
    // Registration's session always lasts 1h, regardless of a remember-me field.
    const storage = !register && payload.rememberMe ? localStorage : sessionStorage;
    try { storage.setItem(TOKEN_KEY, result.token); }
    catch {
      endSession();
      throw new Error('Browser storage is unavailable. Enable storage and try again.');
    }
    token.current = result.token;
    setState({ user: result.user, status: 'authenticated', error: '' });
    return true;
  }, [endSession]);

  const logout = useCallback(() => {
    endSession();
    // A non-sensitive event nonce deduplicates the two delivery paths. Both are
    // attempted so peers with different browser restrictions can still receive.
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2) || '0'}`;
    try { logoutChannel.current?.postMessage({ type: 'logout', id }); } catch { /* Try storage too. */ }
    try { localStorage.setItem(LOGOUT_KEY, id); } catch { /* Local logout already succeeded. */ }
    // Local logout is immediate and never waits for server availability. No
    // copied token is sent; this endpoint is public and does not revoke JWTs.
    logoutRequest().catch(() => {});
  }, [endSession]);

  const request = useCallback(async (path, options = {}) => {
    const version = generation.current;
    try { return await apiRequest(path, { ...options, token: token.current }); }
    catch (error) {
      if (version === generation.current && sessionEnded(error)) endSession(recoveryMessage(error));
      throw error;
    }
  }, [endSession]);

  const value = useMemo(() => ({ ...state, refresh, logout, request,
    login: payload => establish(payload), register: payload => establish(payload, true),
  }), [state, refresh, logout, request, establish]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
