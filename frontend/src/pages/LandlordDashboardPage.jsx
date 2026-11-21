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
        <Link to="/landlord/listings/create" className="primary-button"><Icon name="home" size={18} />Đăng tin mới</Link>
      </div>
      <section className="content-card listings-card" aria-label="Danh sách phòng">
        <div className="card-heading"><h2>Danh sách phòng của bạn</h2><span className="role-badge landlord">Chủ trọ</span></div>
        <div className="empty-state"><span className="empty-state-icon"><Icon name="building" size={30} /></span>
          <h3>Quản lý tin đăng cho thuê</h3>
          <p>Đăng tin phòng trọ mới, theo dõi trạng thái kiểm duyệt hoặc cập nhật tin đã đăng của bạn.</p>
          <div className="my-listings-empty-actions">
            <Link to="/landlord/listings" className="primary-button"><Icon name="building" size={17} />Tin của tôi</Link>
            <Link to="/dashboard#account-profile" className="secondary-link-button"><Icon name="user" size={17} />Xem hồ sơ cá nhân</Link>
          </div>
        </div>
      </section>
      <p className="portal-footnote">Đang đăng nhập với tài khoản <strong>{user.email}</strong>.</p>
    </main>
  </PortalLayout>;
}
