import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PortalLayout } from '../components/AppLayout';
import Icon from '../components/Icon';

export default function LandlordDashboardPage() {
  const { user } = useAuth();
  return <PortalLayout kind="landlord">
    <main className="portal-content" aria-label="Không gian chủ trọ">
      <div className="portal-page-heading">
        <div><p className="eyebrow">KHÔNG GIAN CHỦ TRỌ</p><h1>Quản lý phòng cho thuê</h1><p>Theo dõi và quản lý các tin đăng cho thuê của bạn tại một nơi.</p></div>
        <button type="button" className="primary-button" disabled title="Đăng tin chưa khả dụng"><Icon name="home" size={18} />Đăng tin mới</button>
      </div>
      <section className="content-card listings-card" aria-label="Danh sách phòng">
        <div className="card-heading"><h2>Danh sách phòng của bạn</h2><span className="role-badge landlord">Chủ trọ</span></div>
        <div className="empty-state"><span className="empty-state-icon"><Icon name="building" size={30} /></span>
          <h3>Danh sách phòng chưa khả dụng</h3>
          <p>Chức năng xem, đăng và chỉnh sửa tin đang được phát triển. Bạn có thể kiểm tra thông tin tài khoản trong hồ sơ cá nhân.</p>
          <Link to="/dashboard#account-profile" className="secondary-link-button"><Icon name="user" size={17} />Xem hồ sơ cá nhân</Link>
        </div>
      </section>
      <p className="portal-footnote">Đang đăng nhập với tài khoản <strong>{user.email}</strong>.</p>
    </main>
  </PortalLayout>;
}
