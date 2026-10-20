import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';
import PublicDashboardPage from './pages/PublicDashboardPage';
import PublicImpactsPage from './pages/PublicImpactsPage';
import PublicLandingPage from './pages/PublicLandingPage';
import PublicRecommendationsPage from './pages/PublicRecommendationsPage';
import PublicReportDetailPage from './pages/PublicReportDetailPage';
import PublicReportUnavailablePage from './pages/PublicReportUnavailablePage';
import PublicReportsPage from './pages/PublicReportsPage';
import PublicScenariosPage from './pages/PublicScenariosPage';
import PublicSnapshotPage from './pages/PublicSnapshotPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider, RequireAuth } from './services/auth';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Public — no workspace chrome */}
            <Route path="/public/overview" element={<PublicDashboardPage />} />
            <Route path="/public/impacts" element={<PublicImpactsPage />} />
            <Route path="/public/scenarios" element={<PublicScenariosPage />} />
            <Route path="/public/recommendations" element={<PublicRecommendationsPage />} />
            <Route path="/public/reports" element={<PublicReportsPage />} />
            <Route path="/public/reports/scenario-analysis-jan-2026" element={<PublicReportDetailPage />} />
            <Route path="/public/reports/december-2025-snapshot-ps-003" element={<PublicReportUnavailablePage />} />
            <Route path="/public/home" element={<PublicLandingPage />} />
            <Route path="/public/:id" element={<PublicSnapshotPage />} />
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
