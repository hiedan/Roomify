import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardPage() {
  const { user, logout, request } = useAuth();
  const [targetId, setTargetId] = useState('');
  const [role, setRole] = useState('tenant');
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);

  const submitUpdate = async (event) => {
    event.preventDefault();
    if (!targetId.trim()) {
      setStatus({ type: 'error', message: 'Please enter a target user ID.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const [roleResult, statusResult] = await Promise.all([
        request(`/admin/users/${encodeURIComponent(targetId.trim())}/role`, {
          method: 'PATCH',
          body: { role },
        }),
        request(`/admin/users/${encodeURIComponent(targetId.trim())}/status`, {
          method: 'PATCH',
          body: { isActive },
        }),
      ]);

      setStatus({
        type: 'success',
        message: `Updated user ${targetId.trim()} to ${roleResult.user.role} and ${statusResult.user.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update this user.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dashboard-card admin-dashboard" aria-label="Admin dashboard">
      <div className="dashboard-header">
        <h1>Administration center</h1>
        <span className="role-badge admin">{user.role}</span>
      </div>

      <div className="user-card">
        <p><strong>Admin:</strong> {user.fullName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <form className="admin-form" onSubmit={submitUpdate}>
        <div className="field-group">
          <label className="field-label" htmlFor="target-user-id">Target user ID</label>
          <input
            id="target-user-id"
            className="auth-input"
            type="text"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            placeholder="Enter a numeric user id"
          />
        </div>

        <div className="field-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="role-select">Role</label>
            <select id="role-select" className="select-input" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="tenant">Tenant</option>
              <option value="landlord">Landlord</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="status-select">Status</label>
            <select id="status-select" className="select-input" value={String(isActive)} onChange={(event) => setIsActive(event.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Updating user...' : 'Update user access'}
        </button>
      </form>

      {status.message ? (
        <div className={`message ${status.type === 'error' ? 'error-message' : ''}`} role="status">
          {status.message}
        </div>
      ) : null}

      <div className="role-panel">
        <h2>Admin actions</h2>
        <ul>
          <li>Change a tenant into a landlord</li>
          <li>Lock or reopen a user account</li>
          <li>Review account access and permissions</li>
        </ul>
      </div>

      <div className="session-actions">
        <Link to="/dashboard" className="secondary-link-button">Back to dashboard</Link>
        <button type="button" className="primary-button" onClick={logout}>Sign Out</button>
      </div>
    </main>
  );
}
