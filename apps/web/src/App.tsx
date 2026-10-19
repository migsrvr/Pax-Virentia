import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import ScenariosPage from './pages/ScenariosPage';
import ResultsPage from './pages/ResultsPage';
import ComparePage from './pages/ComparePage';
import RecommendationsPage from './pages/RecommendationsPage';
import ReportsPage from './pages/ReportsPage';
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';
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
          <Routes>
            {/* Public — no workspace chrome */}
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
