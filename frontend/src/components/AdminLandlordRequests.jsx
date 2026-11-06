import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

const statusNames = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const administratorNotice = 'Tài khoản này hiện là Quản trị viên. Có thể từ chối để đóng yêu cầu cũ mà không thay đổi quyền quản trị.';

function ReviewDialog({ selection, onClose, onReviewed }) {
  const { request } = useAuth();
  const dialog = useRef(null);
  const pending = useRef(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const approve = selection.decision === 'approved';
  const application = selection.application;
  const [ineligible, setIneligible] = useState(application.applicant.role === 'admin');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); pending.current?.abort(); };
  }, []);
  const close = () => { if (!loading) { dialog.current.close(); onClose(); } };
  const submit = async event => {
    event.preventDefault();
    if (loading || (approve && ineligible)) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    pending.current = controller;
    try {
      await request(`/admin/landlord-requests/${encodeURIComponent(application.id)}`, {
        method: 'PATCH', body: { decision: selection.decision, ...(!approve ? { reason } : {}) }, signal: controller.signal,
      });
      if (!controller.signal.aborted) { dialog.current.close(); onReviewed(); }
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.code === 'REQUEST_INELIGIBLE') setIneligible(true);
        setError(err.message || 'Không thể xét duyệt yêu cầu.');
      }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };

  return <dialog ref={dialog} className="confirmation-dialog application-review-dialog" aria-labelledby="review-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <button type="button" className="dialog-close" aria-label="Đóng xét duyệt" onClick={close} disabled={loading}><Icon name="close" size={18} /></button>
    <span className={`dialog-icon${approve ? '' : ' is-danger'}`}><Icon name={approve ? 'shield' : 'close'} size={24} /></span>
    <h2 id="review-title">{approve ? 'Duyệt cấp quyền chủ trọ?' : 'Từ chối yêu cầu chủ trọ?'}</h2>
    <p>{application.contactName} · {application.applicant.email}</p>
    <dl className="application-details"><div><dt>Liên hệ</dt><dd>{application.phone}</dd></div>{application.message && <div><dt>Ghi chú</dt><dd>{application.message}</dd></div>}</dl>
    <form onSubmit={submit} aria-busy={loading}>
      {approve ? <p className="review-notice">{ineligible ? administratorNotice : 'Sau khi duyệt, tài khoản sẽ có vai trò Chủ trọ và được truy cập không gian chủ trọ.'}</p>
        : <div className="field-group"><label htmlFor="rejection-reason" className="field-label">Lý do từ chối</label>
          <textarea id="rejection-reason" className="select-input" rows={3} value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required disabled={loading} placeholder="Nêu thông tin cần bổ sung để người dùng gửi lại" /></div>}
      {error && <p className="message error-message" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={close} disabled={loading} autoFocus>Hủy</button>
        <button type="submit" className={approve ? 'primary-button' : 'danger-button'} disabled={loading || (approve && ineligible)}>{loading ? 'Đang xử lý...' : approve ? 'Xác nhận cấp quyền' : 'Xác nhận từ chối'}</button></div>
    </form>
  </dialog>;
}

export default function AdminLandlordRequests({ refreshKey = 0 }) {
  const { request } = useAuth();
  const [filter, setFilter] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    request(`/admin/landlord-requests?status=${filter}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setApplications(result.applications); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Không thể tải yêu cầu.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, filter, revision, refreshKey]);

  return <section id="landlord-requests" className="content-card landlord-request-queue" aria-labelledby="landlord-queue-title">
    <div className="card-heading"><div><h2 id="landlord-queue-title">Yêu cầu trở thành chủ trọ</h2><p>Kiểm tra thông tin và xét duyệt quyền đăng tin cho người thuê.</p></div><button type="button" className="secondary-button" onClick={reload} disabled={loading}><Icon name="refresh" size={16} />Tải lại</button></div>
    <div className="queue-toolbar"><label htmlFor="request-status">Trạng thái yêu cầu</label>
      <select id="request-status" className="select-input" value={filter} onChange={event => { setFilter(event.target.value); setMessage(''); }}>
        {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select><span>Tối đa 100 yêu cầu mỗi lần</span></div>
    {message && <p className="queue-message message" role="status">{message}</p>}
    {loading ? <p className="queue-empty">Đang tải yêu cầu...</p>
      : error ? <div className="queue-message message error-message" role="alert">{error}</div>
      : applications.length === 0 ? <p className="queue-empty">Không có yêu cầu {statusNames[filter].toLocaleLowerCase('vi')}.</p>
      : <div className="request-list">{applications.map(application => <article className="request-item" key={application.id} aria-label={`Yêu cầu của ${application.contactName}`}>
        <div className="request-item-header"><div><h3>{application.contactName}</h3><p>{application.applicant.email}</p></div><span className={`application-badge application-badge--${application.status}`}>{statusNames[application.status]}</span></div>
        <dl className="application-details"><div><dt>Số điện thoại</dt><dd>{application.phone}</dd></div>{application.message && <div><dt>Thông tin bổ sung</dt><dd>{application.message}</dd></div>}<div><dt>Ngày gửi</dt><dd>{new Date(application.createdAt).toLocaleString('vi-VN')}</dd></div></dl>
        {!application.applicant.isActive && <p className="application-rejection">Tài khoản đang bị khóa; cần mở lại trước khi cấp quyền.</p>}
        {application.applicant.role === 'admin' && application.status === 'pending' && <p className="review-notice">{administratorNotice}</p>}
        {application.rejectionReason && <p className="application-rejection">Lý do từ chối: {application.rejectionReason}</p>}
        {application.status === 'pending' && <div className="request-actions"><button type="button" className="danger-text-button" onClick={() => setSelection({ application, decision: 'rejected' })}>Từ chối</button>
          <button type="button" className="primary-button" disabled={!application.applicant.isActive || application.applicant.role === 'admin'} onClick={() => setSelection({ application, decision: 'approved' })}><Icon name="check" size={17} />Duyệt cấp quyền</button></div>}
      </article>)}</div>}
    {selection && <ReviewDialog selection={selection} onClose={() => { setSelection(null); reload(); }} onReviewed={() => {
      setMessage(selection.decision === 'approved' ? `Đã duyệt cấp quyền chủ trọ cho ${selection.application.contactName}.` : `Đã từ chối yêu cầu của ${selection.application.contactName}.`);
      setSelection(null);
      reload();
    }} />}
  </section>;
}
