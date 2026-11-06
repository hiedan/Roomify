import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const rolePanels = {
  tenant: {
    headline: 'Your renting workspace',
    actions: ['Search rooms', 'Saved listings', 'Application status'],
  },
  landlord: {
    headline: 'Your property dashboard',
    actions: ['Manage listings', 'Tenant requests', 'Earnings'],
  },
  admin: {
    headline: 'Administration center',
    actions: ['User management', 'Audit logs', 'System health'],
  },
};

export default function DashboardPage() {
  const { user, logout, refresh } = useAuth();
  const panel = rolePanels[user.role] || rolePanels.tenant;

  return (
    <main className="dashboard-card" aria-label="Account view">
      <div className="dashboard-header">
        <h1>Welcome back</h1>
        <span className="role-badge">{user.role}</span>
      </div>

      <div className="user-card">
        <p><strong>Full name:</strong> {user.fullName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <div className="role-panel">
        <h2>{panel.headline}</h2>
        <ul>
          {panel.actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="quick-links">
        {user.role === 'landlord' && <Link to="/landlord" className="quick-link">Open landlord workspace</Link>}
        {user.role === 'admin' && <Link to="/admin" className="quick-link">Open admin workspace</Link>}
      </div>

      <div className="session-actions">
        <button type="button" className="secondary-button" onClick={refresh}>Refresh account</button>
        <button className="primary-button" type="button" onClick={logout}>Sign Out</button>
      </div>
    </main>
  );
}
