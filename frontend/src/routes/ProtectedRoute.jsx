import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, status, error, refresh, logout } = useAuth();
  if (status === 'checking' || status === 'unavailable') {
    return <section className="dashboard-card" aria-label="Session verification">
      <p role={status === 'checking' ? 'status' : 'alert'}>
        {status === 'checking' ? 'Checking your session...' : error}
      </p>
      {status === 'unavailable' && <button type="button" onClick={refresh}>Retry session check</button>}
      <button type="button" onClick={logout}>Sign Out</button>
    </section>;
  }
  if (!user || status !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}
