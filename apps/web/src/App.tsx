import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import OverviewPage from './pages/OverviewPage';
import DatasetsPage from './pages/DatasetsPage';
import ScenariosPage from './pages/ScenariosPage';
import ResultsPage from './pages/ResultsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PublicSnapshotPage from './pages/PublicSnapshotPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public — no workspace chrome */}
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
