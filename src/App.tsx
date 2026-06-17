import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { AppLayout } from './components/layout/AppLayout';
import { PageLoader } from './components/ui/Spinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Revenues from './pages/Revenues';
import Expenses from './pages/Expenses';
import AccountsReceivable from './pages/AccountsReceivable';
import AccountsPayable from './pages/AccountsPayable';
import CashFlow from './pages/CashFlow';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      <Route element={<RequireAuth><CompanyProvider><AppLayout /></CompanyProvider></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/revenues" element={<Revenues />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/accounts-receivable" element={<AccountsReceivable />} />
        <Route path="/accounts-payable" element={<AccountsPayable />} />
        <Route path="/cash-flow" element={<CashFlow />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        {/* Admin-only */}
        <Route path="/companies" element={<RequireAdmin><Companies /></RequireAdmin>} />
        <Route path="/categories" element={<RequireAdmin><Categories /></RequireAdmin>} />
        <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
        <Route path="/audit" element={<RequireAdmin><Audit /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
