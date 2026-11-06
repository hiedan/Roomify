import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout, { Avatar, roleNames } from '../components/AppLayout';
import Icon from '../components/Icon';
import LandlordApplicationStatus from '../components/LandlordApplicationStatus';

export default function DashboardPage() {
  const { user, logout, refresh } = useAuth();
  return <AppLayout>
    <main aria-label="Thông tin tài khoản">
      <section className="welcome-heading">
        <h1>Xin chào, {user.fullName}</h1>
      </section>
      <section className="profile-section" id="account-profile" aria-labelledby="profile-heading">
        <div className="section-heading"><h2 id="profile-heading">Hồ sơ cá nhân</h2></div>
        <div className="profile-card">
          <div className="profile-identity"><Avatar user={user} large /><h3>{user.fullName}</h3><span className={`role-badge ${user.role}`}>{roleNames[user.role]}</span></div>
          <div className="user-card profile-fields">
            <p><strong>Họ và tên:</strong><span className="profile-value"><Icon name="user" size={17} />{user.fullName}</span></p>
            <p><strong>Email:</strong>{' '}<span className="profile-value"><Icon name="mail" size={17} />{user.email}</span></p>
            <p><strong>Vai trò:</strong><span className="profile-value"><Icon name="shield" size={17} />{roleNames[user.role]}</span></p>
          </div>
          <p className="field-hint"><Icon name="lock" size={13} />Thông tin hiện chỉ hỗ trợ xem.</p>
          {user.role === 'tenant' && <LandlordApplicationStatus />}
          {user.role !== 'tenant' && <div className="workspace-link">
            <Link to={user.role === 'admin' ? '/admin' : '/landlord'} className="secondary-link-button">
              <Icon name={user.role === 'admin' ? 'users' : 'building'} size={18} />
              {user.role === 'admin' ? 'Quản lý người dùng' : 'Quản lý phòng'}<Icon name="arrow" size={17} />
            </Link>
          </div>}
          <div className="session-actions">
            <button type="button" className="secondary-button" onClick={refresh}><Icon name="refresh" size={17} />Làm mới tài khoản</button>
            <button className="danger-text-button" type="button" onClick={logout}><Icon name="logout" size={17} />Đăng xuất</button>
          </div>
        </div>
      </section>
    </main>
  </AppLayout>;
}
