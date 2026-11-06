import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LandlordDashboardPage from './pages/LandlordDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

function RoleRoute({ allowedRoles, children, redirectTo = '/dashboard' }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={redirectTo} replace />;
  return children;
}

function AppShell() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['landlord']} redirectTo="/dashboard">
              <LandlordDashboardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']} redirectTo="/dashboard">
              <AdminDashboardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
