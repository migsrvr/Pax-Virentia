import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import ScrollToTop from './components/common/ScrollToTop';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import ScenariosPage from './pages/ScenariosPage';
import ResultsPage from './pages/ResultsPage';
import ComparePage from './pages/ComparePage';
import RecommendationsPage from './pages/RecommendationsPage';
import ReportsPage from './pages/ReportsPage';
import ReviewQueuePage from './pages/ReviewQueuePage';
import SearchPage from './pages/SearchPage';
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';
import PublicDashboardPage from './pages/PublicDashboardPage';
import PublicImpactsPage from './pages/PublicImpactsPage';
import PublicLandingPage from './pages/PublicLandingPage';
import PublicReportsPage from './pages/PublicReportsPage';
import PublicScenariosPage from './pages/PublicScenariosPage';
import PublishedReportPage from './pages/PublishedReportPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider, RequireAuth } from './services/auth';

const queryClient = new QueryClient();

/** Older public links used /public/:id; every public report now lives under /public/reports/:slug. */
function LegacyPublicLink() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={`/public/reports/${encodeURIComponent(id)}`} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Public — no workspace chrome; every page reads reviewed publications only */}
            <Route path="/public" element={<Navigate to="/public/home" replace />} />
            <Route path="/home" element={<PublicLandingPage />} />
            <Route path="/public/home" element={<PublicLandingPage />} />
            <Route path="/public/overview" element={<PublicDashboardPage />} />
            <Route path="/public/impacts" element={<PublicImpactsPage />} />
            <Route path="/public/scenarios" element={<PublicScenariosPage />} />
            <Route path="/public/reports" element={<PublicReportsPage />} />
            <Route path="/public/reports/:slug" element={<PublishedReportPage />} />
            <Route path="/public/:id" element={<LegacyPublicLink />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Private workspace */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="/datasets" element={<DatasetsPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reviews" element={<ReviewQueuePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
