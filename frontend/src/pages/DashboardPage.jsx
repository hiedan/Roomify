import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout, refresh } = useAuth();
  return <main className="dashboard-card" aria-label="Account view">
    <div className="dashboard-header"><h1>Welcome back</h1><span className="role-badge">{user.role}</span></div>
    <div className="user-card">
      <p><strong>Full name:</strong> {user.fullName}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
    </div>
    <div className="session-actions">
      <button type="button" onClick={refresh}>Refresh account</button>
      <button className="primary-button" type="button" onClick={logout}>Sign Out</button>
    </div>
  </main>;
}
