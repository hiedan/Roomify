import { Link, NavLink } from 'react-router-dom';
import { Brand } from './AuthLayout';
import { AccountMenu } from './AppLayout';
import { useAuth } from '../context/AuthContext';

export default function ListingLayout({ children }) {
  const { user } = useAuth();
  return <div className="app-layout listing-layout">
    <header className="site-header"><div className="header-inner">
      <Brand />
      <nav className="header-nav" aria-label="Điều hướng chính">
        <Link to="/">Trang chủ</Link>
        <NavLink to="/search">Tìm phòng</NavLink>
      </nav>
      {user ? <AccountMenu /> : <Link className="listing-login" to="/login">Đăng nhập</Link>}
    </div></header>
    <div className="page-container">{children}</div>
  </div>;
}
