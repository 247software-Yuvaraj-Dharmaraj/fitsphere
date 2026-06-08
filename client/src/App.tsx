import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Code-split authenticated pages so the chart-heavy Dashboard (Recharts) and
// other routes load on demand, keeping the initial bundle small.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage })),
);
const SlotsPage = lazy(() => import('./pages/SlotsPage').then((m) => ({ default: m.SlotsPage })));
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const ProfilePage = lazy(() => import('./pages').then((m) => ({ default: m.ProfilePage })));

function PageFallback() {
  return <div className="flex h-64 items-center justify-center text-slate-400">Loading...</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Authenticated (any role) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/slots" element={<SlotsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Trainer/Admin only */}
                  <Route element={<ProtectedRoute roles={['TRAINER', 'ADMIN']} />}>
                    <Route path="/analytics" element={<AnalyticsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
