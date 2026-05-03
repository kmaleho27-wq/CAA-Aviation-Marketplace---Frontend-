import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './lib/auth';
import AppShell from './layouts/AppShell';
import MobileShell from './layouts/MobileShell';
import AdminShell from './layouts/AdminShell';
import MarketingShell from './layouts/MarketingShell';
import Landing from './pages/marketing/Landing';
import Pricing from './pages/marketing/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Personnel from './pages/Personnel';
import Vault from './pages/Vault';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Wallet from './pages/mobile/Wallet';
import Jobs from './pages/mobile/Jobs';
import Signoff from './pages/mobile/Signoff';
import Profile from './pages/mobile/Profile';
import AdminOverview from './pages/admin/Overview';
import AdminKYC from './pages/admin/KYC';
import AdminDisputes from './pages/admin/Disputes';
import AdminAnalytics from './pages/admin/Analytics';
import AdminTransactions from './pages/admin/AdminTransactions';

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<MarketingShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="personnel" element={<Personnel />} />
          <Route path="vault" element={<Vault />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/m"
          element={
            <RequireAuth>
              <MobileShell />
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
              <AdminShell />
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
    </Router>
  );
}
