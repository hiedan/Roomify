import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandlordDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard-card role-dashboard" aria-label="Landlord dashboard">
      <div className="dashboard-header">
        <h1>Landlord dashboard</h1>
        <span className="role-badge landlord">{user.role}</span>
      </div>

      <div className="user-card">
        <p><strong>Full name:</strong> {user.fullName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <div className="role-panel">
        <h2>Property management</h2>
        <ul>
          <li>Manage your listings</li>
          <li>Review tenant applications</li>
          <li>Monitor booking / occupancy</li>
          <li>Track revenue and payout reports</li>
        </ul>
      </div>

      <div className="session-actions">
        <Link to="/dashboard" className="secondary-link-button">Back to dashboard</Link>
        <button type="button" className="primary-button" onClick={logout}>Sign Out</button>
      </div>
    </main>
  );
}
