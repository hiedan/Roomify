import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brand } from '../components/AuthLayout';

export default function ProtectedRoute({ children }) {
  const { user, status, error, refresh, logout } = useAuth();
  if (status === 'checking' || status === 'unavailable') {
    return <div className="session-page"><section className="dashboard-card" aria-label="Session verification">
      <Brand />
      <p role={status === 'checking' ? 'status' : 'alert'}>
        {status === 'checking' ? 'Checking your session...' : error}
      </p>
      <div className="session-actions">
        {status === 'unavailable' && <button type="button" className="secondary-button" onClick={refresh}>Thử lại</button>}
        <button type="button" className="danger-text-button" onClick={logout}>Đăng xuất</button>
      </div>
    </section></div>;
  }
  if (!user || status !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}
