import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import ScrollToTop from './components/common/ScrollToTop';
import OverviewPage from './pages/OverviewPage';
import DatasetsPage from './pages/DatasetsPage';
import ScenariosPage from './pages/ScenariosPage';
import ResultsPage from './pages/ResultsPage';
import ReportsPage from './pages/ReportsPage';
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

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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

          {/* Private workspace */}
          <Route element={<AppLayout title="Pax Virentia | Overview" />}>
            <Route index element={<OverviewPage />} />
          </Route>
          <Route element={<AppLayout title="Datasets" subtitle="Validated imports, units, provenance, quality report" />}>
            <Route path="/datasets" element={<DatasetsPage />} />
          </Route>
          <Route element={<AppLayout title="Scenarios" subtitle="Baseline & Pax Silica intervention · revisions freeze on run" />}>
            <Route path="/scenarios" element={<ScenariosPage />} />
          </Route>
          <Route element={<AppLayout title="Results" subtitle="Run inspector · compatible comparison · limitations inline" />}>
            <Route path="/results" element={<ResultsPage />} />
          </Route>
          <Route element={<AppLayout title="Reports" subtitle="Exports from stored facts · reviewed publication" />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<AppLayout title="Settings" subtitle="Grid factors (DOE/IEA) · model registry · users" />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<AppLayout title="Not found" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
