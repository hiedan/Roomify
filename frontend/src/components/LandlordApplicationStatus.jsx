import { Link } from 'react-router-dom';
import useLandlordApplication from '../hooks/useLandlordApplication';
import Icon from './Icon';

export default function LandlordApplicationStatus() {
  const { application, loading, error, reload } = useLandlordApplication();
  const pending = application?.status === 'pending';
  return <section className="landlord-invite" aria-label="Chuyển thành chủ trọ">
    <span className="card-heading-icon"><Icon name="building" size={23} /></span>
    <div>
      <h3>{pending ? 'Yêu cầu đang chờ admin duyệt' : 'Bạn có phòng muốn cho thuê?'}</h3>
      <p>{pending ? 'Vai trò của bạn vẫn là người thuê cho đến khi được cấp quyền.' : 'Gửi thông tin đăng ký chủ trọ để quản trị viên xét duyệt quyền đăng tin.'}</p>
      {application?.status === 'rejected' && <p className="application-rejection">Yêu cầu trước bị từ chối: {application.rejectionReason}</p>}
      {loading ? <p>Đang kiểm tra yêu cầu...</p> : <Link to="/become-landlord" className="secondary-link-button">
        {pending ? 'Xem yêu cầu' : application?.status === 'rejected' ? 'Gửi lại yêu cầu' : 'Trở thành chủ trọ'}<Icon name="arrow" size={16} />
      </Link>}
      {error && <div className="application-load-error"><p role="alert">{error}</p><button type="button" className="link-button" onClick={reload}>Tải lại trạng thái</button></div>}
    </div>
  </section>;
}
