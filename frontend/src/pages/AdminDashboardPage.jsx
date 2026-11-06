import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PortalLayout, roleNames } from '../components/AppLayout';
import Icon from '../components/Icon';
import AdminLandlordRequests from '../components/AdminLandlordRequests';

function ConfirmUpdate({ changes, onCancel, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const dismiss = callback => { dialog.current.close(); callback(); };
  const locking = !changes.isActive;
  return <dialog ref={dialog} className="confirmation-dialog" aria-labelledby="confirm-title"
    onCancel={event => { event.preventDefault(); dismiss(onCancel); }}>
    <button type="button" className="dialog-close" aria-label="Đóng xác nhận" onClick={() => dismiss(onCancel)}><Icon name="close" size={18} /></button>
    <span className={`dialog-icon ${locking ? 'is-danger' : ''}`}><Icon name={locking ? 'lock' : 'shield'} size={25} /></span>
    <h2 id="confirm-title">{locking ? 'Khóa' : 'Cập nhật'} tài khoản #{changes.id}?</h2>
    <p>{changes.fullName} · {changes.email}</p>
    <dl className="confirmation-summary"><div><dt>Vai trò mới</dt><dd>{roleNames[changes.role]}</dd></div><div><dt>Trạng thái mới</dt><dd>{changes.isActive ? 'Hoạt động' : 'Bị khóa'}</dd></div></dl>
    {locking && <p className="lock-warning">Tài khoản sẽ không thể đăng nhập hoặc tiếp tục sử dụng phiên hiện tại.</p>}
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => dismiss(onCancel)} autoFocus>Hủy</button>
      <button type="button" className={locking ? 'danger-button' : 'primary-button'} onClick={() => dismiss(onConfirm)}><Icon name={locking ? 'lock' : 'check'} size={16} />{locking ? 'Xác nhận khóa' : 'Xác nhận cập nhật'}</button>
    </div>
  </dialog>;
}

export default function AdminDashboardPage() {
  const { request } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [target, setTarget] = useState(null);
  const [searching, setSearching] = useState(false);
  const lookupRequest = useRef(null);
  const [requestRefresh, setRequestRefresh] = useState(0);
  const [role, setRole] = useState('tenant');
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState(null);
  useEffect(() => () => lookupRequest.current?.abort(), []);

  const changeIdentifier = event => {
    lookupRequest.current?.abort();
    setIdentifier(event.target.value);
    setTarget(null);
    setSearching(false);
    setRole('tenant');
    setIsActive(true);
    setStatus({ type: 'idle', message: '' });
  };

  const search = async event => {
    event.preventDefault();
    if (loading || searching || changes) return;
    const controller = new AbortController();
    lookupRequest.current = controller;
    setTarget(null);
    setSearching(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const result = await request(`/admin/users/lookup?identifier=${encodeURIComponent(identifier.trim())}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setTarget(result.user);
      setRole(result.user.role);
      setIsActive(result.user.isActive);
    } catch (error) {
      if (!controller.signal.aborted) setStatus({ type: 'error', message: error.message || 'Không thể tìm tài khoản. Vui lòng thử lại.' });
    } finally { if (!controller.signal.aborted) setSearching(false); }
  };

  const submitUpdate = event => {
    event.preventDefault();
    if (loading || searching || changes || !target || target.role === 'admin') return;
    setStatus({ type: 'idle', message: '' });
    setChanges({ ...target, role, isActive });
  };

  const confirmUpdate = async () => {
    if (loading || !changes) return;
    const update = changes;
    setChanges(null);
    setLoading(true);
    try {
      // These endpoints are separate operations; report each result, including partial success.
      const results = await Promise.allSettled([
        request(`/admin/users/${encodeURIComponent(update.id)}/role`, { method: 'PATCH', body: { role: update.role } }),
        request(`/admin/users/${encodeURIComponent(update.id)}/status`, { method: 'PATCH', body: { isActive: update.isActive } }),
      ]);
      const messages = results.map((result, index) => result.status === 'fulfilled'
        ? index === 0 ? `Vai trò: ${roleNames[result.value.user.role]}.` : `Trạng thái: ${result.value.user.isActive ? 'Hoạt động' : 'Bị khóa'}.`
        : `${index === 0 ? 'Vai trò' : 'Trạng thái'}: ${result.reason.message || 'Không thể cập nhật.'}`);
      setStatus({ type: results.some(result => result.status === 'rejected') ? 'error' : 'success', message: `Tài khoản #${update.id} — ${messages.join(' ')}` });
      setTarget(current => current ? ({ ...current,
        role: results[0].status === 'fulfilled' ? results[0].value.user.role : current.role,
        isActive: results[1].status === 'fulfilled' ? results[1].value.user.isActive : current.isActive,
      }) : null);
      if (results[0].status === 'fulfilled') setRequestRefresh(value => value + 1);
    } finally { setLoading(false); }
  };

  return <PortalLayout kind="admin">
    <main className="portal-content" aria-label="Không gian quản trị">
      <div className="portal-page-heading"><div><p className="eyebrow">QUẢN TRỊ TÀI KHOẢN</p><h1>Quản lý người dùng</h1><p>Quản lý vai trò, trạng thái và quyền truy cập tài khoản trên Roomify.</p></div></div>
      <AdminLandlordRequests refreshKey={requestRefresh} />
      <div className="admin-grid">
        <section className="content-card">
          <div className="card-heading"><div><h2>Cập nhật quyền truy cập</h2><p>Tìm tài khoản bằng ID hoặc email để quản lý quyền truy cập.</p></div><span className="card-heading-icon"><Icon name="users" size={23} /></span></div>
          <form className="admin-lookup-form" onSubmit={search} aria-busy={searching}>
            <div className="field-group"><label className="field-label" htmlFor="target-user-identifier">ID hoặc email người dùng</label>
              <input id="target-user-identifier" className="select-input" type="text" required maxLength={255} autoComplete="off" autoCapitalize="none" spellCheck={false}
                value={identifier} onChange={changeIdentifier} placeholder="Ví dụ: 123 hoặc ten@gmail.com" disabled={loading || Boolean(changes)} />
            </div>
            <button type="submit" className="primary-button" disabled={searching || loading || Boolean(changes)}>{searching ? 'Đang tìm...' : 'Tìm tài khoản'}</button>
          </form>
          <form className="admin-form" onSubmit={submitUpdate} aria-busy={loading}>
            {target && <section className="admin-target" aria-label="Tài khoản tìm được"><h3>{target.fullName}</h3>
              <dl className="application-details"><div><dt>ID</dt><dd>{target.id}</dd></div><div><dt>Email</dt><dd>{target.email}</dd></div>
                <div><dt>Vai trò hiện tại</dt><dd>{roleNames[target.role]}</dd></div><div><dt>Trạng thái hiện tại</dt><dd>{target.isActive ? 'Hoạt động' : 'Bị khóa'}</dd></div></dl>
            </section>}
            <div className="field-grid">
              <div className="field-group"><label className="field-label" htmlFor="role-select">Vai trò</label>
                <select id="role-select" className="select-input" value={role} disabled={!target || target.role === 'admin' || loading || searching} onChange={event => setRole(event.target.value)}>
                  {target?.role === 'admin' && <option value="admin">Quản trị viên</option>}
                  <option value="tenant">Người thuê</option><option value="landlord">Chủ trọ</option>
                </select></div>
              <div className="field-group"><label className="field-label" htmlFor="status-select">Trạng thái</label>
                <select id="status-select" className="select-input" value={String(isActive)} disabled={!target || target.role === 'admin' || loading || searching} onChange={event => setIsActive(event.target.value === 'true')}>
                  <option value="true">Hoạt động</option><option value="false">Bị khóa</option>
                </select></div>
            </div>
            <p className="field-hint"><Icon name="info" size={15} />{target?.role === 'admin' ? 'Tài khoản quản trị viên được bảo vệ, không thể cập nhật tại đây.' : target ? 'Cấp quyền chủ trọ yêu cầu hồ sơ đang chờ duyệt. Bạn có thể xem hồ sơ tại danh sách yêu cầu phía trên.' : 'Tìm và kiểm tra thông tin tài khoản trước khi cập nhật.'}</p>
            {status.message && <div className={`message ${status.type === 'error' ? 'error-message' : ''}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</div>}
            <div className="form-actions"><button type="submit" className="primary-button" disabled={!target || target.role === 'admin' || loading || searching}><Icon name="shield" size={18} />{loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}</button></div>
          </form>
        </section>
        <aside className="content-card admin-guide"><span className="card-heading-icon"><Icon name="shield" size={24} /></span><h2>Quyền quản trị</h2>
          <ul><li><Icon name="check" size={17} /><span>Cấp quyền chủ trọ sau khi xét duyệt hồ sơ.</span></li><li><Icon name="check" size={17} /><span>Khóa hoặc mở lại tài khoản người dùng.</span></li><li><Icon name="lock" size={17} /><span>Tài khoản quản trị viên được bảo vệ.</span></li></ul>
          <div className="guide-note"><Icon name="info" size={18} /><p>Nhập chính xác ID hoặc email tài khoản cần quản lý. Kiểm tra thông tin tìm được trước khi lưu thay đổi.</p></div>
        </aside>
      </div>
      {changes && <ConfirmUpdate changes={changes} onCancel={() => setChanges(null)} onConfirm={confirmUpdate} />}
    </main>
  </PortalLayout>;
}
