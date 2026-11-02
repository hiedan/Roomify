import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <h1>Welcome back</h1>
        <span className="role-badge">{user?.role || 'tenant'}</span>
      </div>

      <div className="user-card">
        <p><strong>Full name:</strong> {user?.fullName || 'Demo User'}</p>
        <p><strong>Email:</strong> {user?.email || 'demo@roomify.com'}</p>
        <p><strong>Role:</strong> {user?.role || 'tenant'}</p>
      </div>

      <div className="message">
        Authentication is ready. Connect this dashboard to the real backend API when the auth endpoints are implemented.
      </div>

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="primary-button" type="button" onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
