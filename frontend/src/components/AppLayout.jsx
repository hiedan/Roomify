import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brand } from './AuthLayout';
import Icon from './Icon';

export const roleNames = { tenant: 'Người thuê', landlord: 'Chủ trọ', admin: 'Quản trị viên' };

export function Avatar({ user, large = false }) {
  const initials = user.fullName.trim().split(/\s+/).slice(-2).map(part => [...part][0]).join('').toLocaleUpperCase('vi');
  return <span className={`avatar${large ? ' avatar--large' : ''}`} aria-hidden="true">{initials}</span>;
}

export function AccountMenu() {
  const { user, logout } = useAuth();
  const menu = useRef(null);
  useEffect(() => {
    const close = event => {
      if (menu.current && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <details className="account-menu" ref={menu} onKeyDown={event => {
    if (event.key === 'Escape') {
      menu.current.open = false;
      menu.current.querySelector('summary').focus();
    }
  }}>
    <summary aria-label="Mở menu tài khoản"><Avatar user={user} /><Icon name="chevron" size={16} /></summary>
    <div className="account-dropdown" onClick={event => {
      if (event.target.closest('a, button')) menu.current.open = false;
    }}>
      <div className="dropdown-profile"><Avatar user={user} /><div><strong>{user.fullName}</strong><span>{user.email}</span></div></div>
      <nav aria-label="Tài khoản">
        <Link to="/dashboard#account-profile"><Icon name="user" />Trang cá nhân</Link>
        {user.role === 'landlord' && <Link to="/landlord"><Icon name="building" />Quản lý phòng</Link>}
        {user.role === 'tenant' && <Link to="/become-landlord"><Icon name="building" />Trở thành chủ trọ</Link>}
        {user.role === 'admin' && <Link to="/admin"><Icon name="users" />Quản lý người dùng</Link>}
        <button type="button" disabled title="Cài đặt chưa khả dụng"><Icon name="settings" />Cài đặt</button>
      </nav>
      <button type="button" className="dropdown-logout" onClick={logout}><Icon name="logout" />Đăng xuất</button>
    </div>
  </details>;
}

export default function AppLayout({ children }) {
  return <div className="app-layout">
    <header className="site-header"><div className="header-inner">
      <Brand />
      <nav className="header-nav" aria-label="Điều hướng chính">
        <NavLink to="/dashboard">Trang chủ</NavLink>
        <button type="button" disabled title="Tìm phòng chưa khả dụng">Tìm phòng</button>
      </nav>
      <AccountMenu />
    </div></header>
    <div className="page-container">{children}</div>
  </div>;
}

export function PortalLayout({ kind, children }) {
  const { user, logout } = useAuth();
  const admin = kind === 'admin';
  const name = admin ? 'Quản trị' : 'Chủ trọ';
  return <div className={`portal-layout portal-layout--${kind}`}>
    <aside className="portal-sidebar" aria-label={`Không gian ${name.toLocaleLowerCase('vi')}`}>
      <Brand />
      <p className="sidebar-caption">{admin ? 'ADMIN PORTAL' : 'LANDLORD PORTAL'}</p>
      <nav className="sidebar-nav" aria-label="Điều hướng không gian">
        <NavLink to="/dashboard"><Icon name="grid" />Trang chủ</NavLink>
        {admin
          ? <button type="button" disabled title="Duyệt tin chưa khả dụng"><Icon name="grid" />Duyệt tin đăng</button>
          : <button type="button" disabled title="Đăng tin chưa khả dụng"><Icon name="home" />Đăng tin mới</button>}
        <NavLink to={admin ? '/admin' : '/landlord'}><Icon name={admin ? 'users' : 'building'} />{admin ? 'Quản lý người dùng' : 'Quản lý phòng'}</NavLink>
        <Link to="/dashboard#account-profile"><Icon name="user" />Hồ sơ cá nhân</Link>
      </nav>
      <div className="sidebar-note"><Icon name="shield" /><div><strong>{admin ? 'Không gian quản trị' : 'Không gian chủ trọ'}</strong><p>{admin ? 'Quản lý quyền truy cập tài khoản.' : 'Quản lý thông tin cho thuê của bạn.'}</p></div></div>
      <div className="sidebar-account"><Avatar user={user} /><div><strong>{user.fullName}</strong><span>{roleNames[user.role]}</span></div></div>
      <button type="button" className="sidebar-logout" onClick={logout}><Icon name="logout" size={18} />Đăng xuất</button>
    </aside>
    <div className="portal-main">
      <header className="portal-header"><div><span>{name}</span><span className="breadcrumb-separator">/</span><strong>{admin ? 'Quản lý người dùng' : 'Quản lý phòng'}</strong></div><AccountMenu /></header>
      {children}
    </div>
  </div>;
}
