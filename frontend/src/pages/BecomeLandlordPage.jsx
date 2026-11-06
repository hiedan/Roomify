import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useLandlordApplication from '../hooks/useLandlordApplication';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';

function ApplicationForm({ previous, onSubmitted }) {
  const { user, request } = useAuth();
  const [form, setForm] = useState({ contactName: previous?.contactName || user.fullName,
    phone: previous?.phone || '', message: previous?.message || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  const update = key => event => setForm({ ...form, [key]: event.target.value });
  const submit = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    pending.current = controller;
    try {
      const result = await request('/landlord-requests', { method: 'POST', body: form, signal: controller.signal });
      if (!controller.signal.aborted) onSubmitted(result.application);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };

  return <form className="application-form" onSubmit={submit} aria-busy={loading}>
    <div className="field-group"><label htmlFor="contact-name" className="field-label">Họ và tên liên hệ</label>
      <input id="contact-name" className="select-input" value={form.contactName} onChange={update('contactName')} autoComplete="name" required minLength={2} maxLength={100} disabled={loading} /></div>
    <div className="field-group"><label htmlFor="contact-phone" className="field-label">Số điện thoại liên hệ</label>
      <input id="contact-phone" type="tel" className="select-input" value={form.phone} onChange={update('phone')} autoComplete="tel" placeholder="0901 234 567" required maxLength={30} disabled={loading} />
      <p className="field-hint">Nhập số điện thoại có từ 9 đến 15 chữ số.</p></div>
    <div className="field-group"><label htmlFor="application-message" className="field-label">Thông tin bổ sung <span className="optional-label">(không bắt buộc)</span></label>
      <textarea id="application-message" className="select-input" value={form.message} onChange={update('message')} placeholder="Giới thiệu về phòng hoặc nhu cầu đăng tin của bạn" rows={4} maxLength={1000} disabled={loading} /></div>
    <p className="field-hint"><Icon name="info" size={16} />Thông tin này được gửi cho quản trị viên để xét duyệt quyền chủ trọ.</p>
    {error && <div className="message error-message" role="alert">{error}</div>}
    <div className="form-actions"><Link className="secondary-link-button" to="/dashboard">Quay lại</Link>
      <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi yêu cầu xét duyệt'}<Icon name="arrow" size={17} /></button></div>
  </form>;
}

export default function BecomeLandlordPage() {
  const { application, loading, error, store, reload } = useLandlordApplication();
  const pending = application?.status === 'pending';
  return <AppLayout><main className="application-page" aria-label="Đăng ký trở thành chủ trọ">
    <Link to="/dashboard" className="back-link">← Quay lại trang chủ</Link>
    <div className="section-heading"><h1>Trở thành chủ trọ</h1><p>Hoàn tất thông tin để gửi yêu cầu cấp quyền đăng tin cho thuê.</p></div>
    {loading ? <div className="content-card application-state"><p role="status">Đang tải thông tin...</p></div>
      : error ? <div className="content-card application-state"><p className="message error-message" role="alert">{error}</p><button className="secondary-button" type="button" onClick={reload}>Thử tải lại</button></div>
      : pending ? <section className="content-card application-state" aria-label="Yêu cầu đang chờ duyệt">
        <span className="empty-state-icon"><Icon name="shield" size={28} /></span><h2>Đã gửi yêu cầu, đang chờ duyệt</h2>
        <p>Quản trị viên sẽ kiểm tra thông tin của bạn. Trong thời gian chờ, vai trò tài khoản vẫn là <strong>Người thuê</strong>.</p>
        <dl className="application-details"><div><dt>Họ và tên</dt><dd>{application.contactName}</dd></div><div><dt>Số điện thoại</dt><dd>{application.phone}</dd></div>{application.message && <div><dt>Thông tin bổ sung</dt><dd>{application.message}</dd></div>}</dl>
        <div className="application-state-actions"><Link to="/dashboard#account-profile" className="secondary-link-button">Xem hồ sơ</Link><button type="button" className="primary-button" onClick={reload}><Icon name="refresh" size={17} />Kiểm tra kết quả</button></div>
      </section> : <section className="content-card">
        <div className="card-heading"><div><h2>Thông tin đăng ký chủ trọ</h2><p>Role chỉ thay đổi khi quản trị viên phê duyệt yêu cầu.</p></div><span className="card-heading-icon"><Icon name="building" size={24} /></span></div>
        {application?.status === 'rejected' && <div className="application-rejected message error-message" role="status"><strong>Yêu cầu trước bị từ chối.</strong><p>{application.rejectionReason}</p><span>Bạn có thể bổ sung thông tin và gửi lại.</span></div>}
        <ApplicationForm previous={application} onSubmitted={store} />
      </section>}
  </main></AppLayout>;
}
