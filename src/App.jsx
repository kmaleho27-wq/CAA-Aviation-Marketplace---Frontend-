import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RoleGate } from './lib/auth';

// Critical-path: marketing layout, login, register stay eager so the
// landing page paints fast on a cold visit.
import MarketingShell from './layouts/MarketingShell';
import Landing from './pages/marketing/Landing';
import Pricing from './pages/marketing/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';

// Authenticated surfaces: lazy-loaded so unauthenticated visitors don't
// download admin / mobile / operator JS just to view the landing page.
const AppShell        = lazy(() => import('./layouts/AppShell'));
const MobileShell     = lazy(() => import('./layouts/MobileShell'));
const AdminShell      = lazy(() => import('./layouts/AdminShell'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Marketplace     = lazy(() => import('./pages/Marketplace'));
const Personnel       = lazy(() => import('./pages/Personnel'));
const Mro             = lazy(() => import('./pages/Mro'));
const Vault           = lazy(() => import('./pages/Vault'));
const Transactions    = lazy(() => import('./pages/Transactions'));
const Settings        = lazy(() => import('./pages/Settings'));
const Wallet          = lazy(() => import('./pages/mobile/Wallet'));
const Jobs            = lazy(() => import('./pages/mobile/Jobs'));
const Signoff         = lazy(() => import('./pages/mobile/Signoff'));
const Profile         = lazy(() => import('./pages/mobile/Profile'));
const AdminOverview   = lazy(() => import('./pages/admin/Overview'));
const AdminKYC        = lazy(() => import('./pages/admin/KYC'));
const AdminDisputes   = lazy(() => import('./pages/admin/Disputes'));
const AdminAnalytics  = lazy(() => import('./pages/admin/Analytics'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));

const ChunkFallback = () => (
  <div style={{
    flex: 1, minHeight: '60vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, color: 'var(--text-tertiary)',
  }}>
    Loading…
  </div>
);

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<ChunkFallback />}>
      <Routes>
        <Route element={<MarketingShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <RoleGate allow={['OPERATOR', 'SUPPLIER', 'AMO']}>
                <AppShell />
              </RoleGate>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="personnel" element={<Personnel />} />
          <Route path="mro" element={<Mro />} />
          <Route path="vault" element={<Vault />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/m"
          element={
            <RequireAuth>
              <RoleGate allow="AME">
                <MobileShell />
              </RoleGate>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="signoff" element={<Signoff />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RoleGate allow="ADMIN">
                <AdminShell />
              </RoleGate>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="kyc" element={<AdminKYC />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
}
