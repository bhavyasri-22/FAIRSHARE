import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotifProvider } from './context/NotifContext.jsx';
import ToastContainer from './components/ToastContainer';
import Sidebar        from './components/Sidebar';
import AuthPage       from './pages/AuthPage';
import Dashboard      from './pages/Dashboard';
import GroupsPage     from './pages/GroupsPage';
import ExpensesPage   from './pages/ExpensesPage';
import SettlePage     from './pages/SettlePage';
import AnalyticsPage  from './pages/AnalyticsPage';

function PrivateLayout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '32px 36px', background: 'var(--bg)' }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups"    element={<GroupsPage />} />
          <Route path="/expenses"  element={<ExpensesPage />} />
          <Route path="/settle"    element={<SettlePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  );
}

function PublicRoute() {
  const { token } = useAuth();
  if (token) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotifProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/auth" element={<PublicRoute />} />
              <Route path="/*"   element={<PrivateLayout />} />
            </Routes>
          </BrowserRouter>
        </NotifProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}