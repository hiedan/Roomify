import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useLandlordApplication() {
  const { user, request, refresh } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const current = useRef(null);
  const reload = useRef(null);
  const store = useCallback(value => { current.current = value; setApplication(value); }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight || !active) return;
      inFlight = true;
      try {
        const result = await request('/landlord-requests/me', { signal: controller.signal });
        if (!active) return;
        store(result.application);
        setError('');
        // Refresh the authoritative profile, without replacing the existing token.
        if (result.currentRole && result.currentRole !== user.role) await refresh();
      } catch (err) {
        if (active && err.name !== 'AbortError') setError(err.message || 'Không thể tải trạng thái yêu cầu.');
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    reload.current = load;
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden && current.current?.status === 'pending') load();
    }, 10000);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      reload.current = null;
    };
  }, [request, refresh, store, user.role]);

  return { application, loading, error, store, reload: () => reload.current?.() };
}
