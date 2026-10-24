import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { csrfStore } from '../services/api';
import { useAuth } from '../services/auth';
import Sidebar from '../components/layout/Sidebar';
import PublishedReportPage from './PublishedReportPage';
import PublicDashboardPage from './PublicDashboardPage';
import ReportsPage from './ReportsPage';
import DatasetsPage from './DatasetsPage';
import ScenariosPage from './ScenariosPage';
import { analyst, mockApi, renderApp, reviewer, sessionRoute } from '../test/utils';

const snapshot = {
  schema_version: 1,
  boundary: { volume_m3: 100, period_start: '2024-01-01T00:00:00+08:00', period_end: '2024-01-02T00:00:00+08:00', currency: 'PHP' },
  metrics: [
    { key: 'energy', value: 100, unit: 'kWh', status: 'valid' },
    { key: 'ecology', value: null, unit: null, status: 'not_estimable', reason: 'No approved model.' },
  ],
  provenance: { technology_evidence_status: 'unverified' },
  limitations: ['Specifications remain unverified.'],
  energy: { total_kwh: 100 },
};

function WhoAmI() {
  const { user, csrfToken } = useAuth();
  return <p>{user ? `${user.role}:${csrfToken}` : 'signed out'}</p>;
}

describe('session restore', () => {
  it('stores the CSRF token re-issued by /auth/session', async () => {
    mockApi([sessionRoute(analyst, 'derived-token')]);
    renderApp(<WhoAmI />);
    expect(await screen.findByText('analyst:derived-token')).toBeInTheDocument();
    expect(csrfStore.get()).toBe('derived-token');
    expect(sessionStorage.getItem('pv-csrf')).toBe('derived-token');
  });
});

describe('role-gated navigation', () => {
  it('shows publication reviews only to reviewers and administrators', async () => {
    mockApi([sessionRoute(analyst)]);
    const view = renderApp(<Sidebar />);
    await screen.findByText('Dashboard');
    await waitFor(() => expect(screen.queryByText('Publication reviews')).not.toBeInTheDocument());
    view.unmount();
    mockApi([sessionRoute(reviewer)]);
    renderApp(<Sidebar />);
    expect(await screen.findByText('Publication reviews')).toBeInTheDocument();
    expect(screen.queryByText(/^6$/)).not.toBeInTheDocument();
  });
});

describe('public report page', () => {
  const renderReport = (slug: string) => renderApp(<PublishedReportPage />, { route: `/public/reports/${slug}`, path: '/public/reports/:slug' });

  it('renders a published snapshot without zeroing not_estimable', async () => {
    mockApi([sessionRoute(null), ['GET', '/public/reports/live', { body: { slug: 'live', title: 'Live report', summary: 'S', published_at: '2026-10-20T00:00:00Z', view_count: 1, public_path: '/public/reports/live', snapshot_data: snapshot } }]]);
    renderReport('live');
    expect(await screen.findByRole('heading', { name: 'Live report' })).toBeInTheDocument();
    expect(screen.getAllByText('Not estimable').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('shows a withdrawal notice without any figures for 410', async () => {
    mockApi([sessionRoute(null), ['GET', '/public/reports/gone', { status: 410, body: { error: { code: 'publication_withdrawn', message: 'Withdrawn',
      details: { slug: 'gone', title: 'Old report', published_at: null, withdrawn_at: '2026-10-21T00:00:00Z', withdrawal_reason: 'Dataset replaced' } } } }]]);
    renderReport('gone');
    expect(await screen.findByRole('heading', { name: 'This report is no longer available' })).toBeInTheDocument();
    expect(screen.getByText('Reason: Dataset replaced')).toBeInTheDocument();
    expect(screen.queryByText(/kWh/)).not.toBeInTheDocument();
  });

  it('shows not available for unknown or unreviewed reports', async () => {
    mockApi([sessionRoute(null), ['GET', '/public/reports/pending', { status: 404, body: { error: { code: 'publication_not_found', message: 'Missing' } } }]]);
    renderReport('pending');
    expect(await screen.findByRole('heading', { name: 'This report isn’t available' })).toBeInTheDocument();
  });

  it('rejects invalid slugs without calling the API', async () => {
    const calls = mockApi([sessionRoute(null)]);
    renderReport('NOT_VALID');
    expect(await screen.findByRole('heading', { name: 'This report isn’t available' })).toBeInTheDocument();
    expect(calls.some((call) => call.path.startsWith('/public/reports'))).toBe(false);
  });
});

describe('public dashboard', () => {
  it('says nothing is published instead of showing sample figures', async () => {
    mockApi([sessionRoute(null), ['GET', /^\/public\/reports\?/, { body: { items: [] } }]]);
    renderApp(<PublicDashboardPage />);
    expect(await screen.findByText('No results have been published yet')).toBeInTheDocument();
    expect(screen.queryByText(/PS-00/)).not.toBeInTheDocument();
  });
});

const run = (id: string, kind: 'baseline' | 'intervention', name: string) => ({
  id, status: 'succeeded', kind, scenario_name: name, revision_no: 1, scenario_revision_id: `rev-${id}`,
  created_at: '2026-10-20T00:00:00Z', frozen_inputs: { revision_no: 1, parameters: { volume_m3: 100 } },
});
const model = (sections: string[]) => ({
  id: 'preview', title: 'Scenario analysis report', report_type: 'technical', created_at: null, created_by_name: null,
  label: 'Simulated estimates', run_ids: ['r1'], formats: ['pdf', 'csv'],
  sections: [...sections, 'methodology'].map((key) => ({ key, title: key, paragraphs: [], tables: [] })),
});

describe('reports page', () => {
  it('sends the selected sections and formats, and only confirms successful downloads', async () => {
    const user = userEvent.setup();
    const previews: unknown[] = [];
    mockApi([
      sessionRoute(analyst),
      ['GET', /^\/runs\?/, { body: { items: [run('r1', 'baseline', 'Base')] } }],
      ['GET', /^\/reports\?/, { body: { items: [] } }],
      ['GET', /^\/publications\?/, { body: { items: [] } }],
      ['POST', '/reports/preview', (call) => { previews.push(call.body); return { body: { preview: model((call.body as { sections: string[] }).sections) } }; }],
      ['POST', '/reports', (call) => ({ status: 201, body: { id: 'rep-1', title: 'Scenario analysis report', report_type: 'technical', run_ids: ['r1'],
        created_by_name: 'Ana', created_at: '2026-10-24T00:00:00Z', formats: (call.body as { formats: string[] }).formats,
        sections: (call.body as { sections: string[] }).sections, preview: model([]) } })],
      ['GET', /^\/reports\/rep-1\/download\?format=pdf/, { status: 500, body: { error: { code: 'internal_error', message: 'Generation failed.' } } }],
    ]);
    renderApp(<ReportsPage />);
    await waitFor(() => expect(previews.length).toBeGreaterThan(0));
    expect(previews[previews.length - 1]).toMatchObject({ run_ids: ['r1'], sections: ['summary', 'inputs', 'results'], formats: ['pdf', 'csv'] });

    await user.click(screen.getByText('Inputs and assumptions'));
    await user.click(screen.getByText('CSV data'));
    await waitFor(() => expect(previews[previews.length - 1]).toMatchObject({ sections: ['summary', 'results'], formats: ['pdf'] }));
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Export report/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByRole('button', { name: 'Download' })).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Download' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Generation failed.');
    expect(screen.queryByText('PDF downloaded')).not.toBeInTheDocument();
  });
});

describe('datasets page', () => {
  it('inspects a CSV before registering it with its source and evidence status', async () => {
    const user = userEvent.setup();
    const quality = { row_count: 1, column_count: 5, columns: [], missing_values: {}, critical_missing_values: 0, missing_columns: [],
      duplicate_rows: [], invalid_values: [], outliers: {}, outlier_rule: 'Tukey', content_hash: 'abc', schema_version: 'plant-csv-v1' };
    const calls = mockApi([
      sessionRoute(analyst),
      ['GET', /^\/datasets\?/, { body: { items: [] } }],
      ['POST', '/datasets/inspect', { body: quality }],
      ['POST', /^\/datasets\?source_ref=/, { status: 201, body: { id: 'ds-1' } }],
    ]);
    renderApp(<DatasetsPage />);
    await screen.findByText('No dataset versions are registered yet.');
    const file = new File(['period_start,period_end,volume_m3,electricity_kwh,pump_hours\n'], 'plant.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('CSV file'), file);
    expect(await screen.findByText('Usable for runs')).toBeInTheDocument();
    expect(calls.filter((call) => call.path.startsWith('/datasets?source_ref'))).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText('Evidence status'), 'synthetic');
    await user.click(screen.getByRole('button', { name: 'Register dataset version' }));
    await screen.findByText('Registered dataset version ds-1.');
    const register = calls.find((call) => call.path.startsWith('/datasets?source_ref'))!;
    expect(register.path).toContain('source_ref=plant.csv');
    expect(register.path).toContain('evidence_status=synthetic');
    expect(register.headers.get('Content-Type')).toBe('text/csv');
  });
});

describe('scenario prefill', () => {
  const technology = { id: 'pax-silica-v1', name: 'Pax Silica', version_id: 'pax-silica-v1', source_ref: 'spec', evidence_status: 'unverified',
    capacity_m3_per_hour: 150, pump_power_kw: 22, mixer_power_kw: 7.5, flow_rate_range: { minimum: 10, maximum: 150 },
    pump_duty_hours_range: { minimum: 1, maximum: 24 }, mixing_load_range: { minimum: 0.2, maximum: 1 }, chemical_dose_range: { minimum: 5, maximum: 80 } };
  const factor = { id: 'ph-luzon-2024', name: 'Luzon', version_id: 'ph-luzon-2024', source_ref: 'DOE', evidence_status: 'externally_sourced',
    grid_region: 'Luzon-Visayas', reporting_year: 2024, gas_basis: 'CO2e', factor_method: 'OM', kg_per_kwh: 0.7122 };
  const { id: _t, name: _tn, ...frozenTechnology } = technology;
  const { id: _f, name: _fn, ...frozenFactor } = factor;
  const inputs = { run_id: 'r1', scenario_id: 's1', scenario_name: 'Base', kind: 'baseline', revision_no: 3, status: 'succeeded', requested_modules: ['energy'],
    parameters: { volume_m3: 1200, period_start: '2024-01-01T00:00:00+08:00', period_end: '2024-01-02T00:00:00+08:00', currency: 'PHP',
      grid_region: 'Luzon-Visayas', flow_rate_m3_per_hour: 100, pump_duty_hours: 12, mixing_hours: 6, mixing_load_multiplier: 0.9,
      chemical_dose_mg_per_l: 20, technology: frozenTechnology, factor: frozenFactor,
      costs: { tariff_php_per_kwh: 11, chemical_price_php_per_kg: 50, labor_php: 1, maintenance_php: 2, other_nonenergy_php: 3, source_ref: 'costs' } } };

  it('starts a new, unsaved intervention from a run’s frozen inputs', async () => {
    mockApi([
      sessionRoute(analyst),
      ['GET', '/catalogs/technologies', { body: { items: [technology] } }],
      ['GET', '/catalogs/factors', { body: { items: [factor] } }],
      ['GET', '/runs/r1/inputs', { body: inputs }],
    ]);
    renderApp(<ScenariosPage />, { route: '/scenarios?fromRunId=r1&kind=intervention' });
    expect(await screen.findByText(/Started from the frozen inputs of “Base” \(revision 3\)/)).toBeInTheDocument();
    expect(screen.getByText(/not yet saved/)).toBeInTheDocument();
    const name = screen.getByLabelText('Scenario name') as HTMLInputElement;
    expect(name.value).toBe('');
    expect(name.readOnly).toBe(false);
    expect(screen.getByRole('radio', { name: /intervention/i })).toBeChecked();
    expect((screen.getByLabelText('Treatment specification') as HTMLSelectElement).value).toBe('pax-silica-v1');
  });

  it('explains when a run’s catalog version is no longer available', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockApi([
      sessionRoute(analyst),
      ['GET', '/catalogs/technologies', { body: { items: [] } }],
      ['GET', '/catalogs/factors', { body: { items: [factor] } }],
      ['GET', '/runs/r1/inputs', { body: inputs }],
    ]);
    renderApp(<ScenariosPage />, { route: '/scenarios?fromRunId=r1' });
    expect(await screen.findByRole('heading', { name: 'Can’t start from this run' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable in the current catalogs/);
  });
});
