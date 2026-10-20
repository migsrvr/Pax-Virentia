import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../services/api';
import { errorMessage, format, label } from '../services/simulation';
import { SectionCard, btnSecondary } from './scenarios/shared';
import StatusBadge from '../components/common/StatusBadge';

type PublicValue = string | number | boolean | null | string[];
type PublicMetric = { key: string; value: number | null; unit?: string | null; status: string; reason?: string; required_evidence?: string[] };
type Snapshot = {
  boundary?: Record<string, PublicValue>;
  metrics?: PublicMetric[];
  provenance?: Record<string, PublicValue>;
  limitations?: string[];
  energy?: Record<string, PublicValue>;
  carbon?: Record<string, PublicValue>;
  economics?: Record<string, PublicValue>;
  ecology?: { status: string; value: number | null; unit?: string | null; reason?: string; required_evidence?: string[] };
};
type PublishedReport = { title: string; summary: string; published_at: string; snapshot_data: Snapshot };

const fieldLabels: Record<string, string> = {
  volume_m3: 'Treated volume (m³)', period_start: 'Period start', period_end: 'Period end', currency: 'Currency',
  total_kwh: 'Energy consumption (kWh)', energy_intensity_kwh_per_m3: 'Energy intensity (kWh/m³)',
  emissions_kg_co2e: 'Electricity-associated emissions (kg CO₂e)', emissions_kg_co2: 'Electricity-associated emissions (kg CO₂)',
  factor_kg_per_kwh: 'Grid factor (kg/kWh)', gas_basis: 'Gas basis', unit: 'Unit', status: 'Status',
  electricity_cost_php: 'Electricity cost (PHP)', chemical_cost_php: 'Chemical cost (PHP)',
  labor_cost_php: 'Labor cost (PHP)', maintenance_cost_php: 'Maintenance cost (PHP)', other_cost_php: 'Other operating cost (PHP)',
  total_opex_php: 'Operating cost (PHP)', chemical_kg_used: 'Chemical use (kg)', net_savings_php: 'Net operating savings (PHP)',
  simple_payback_years: 'Simple payback (years)', technology_evidence_status: 'Treatment evidence status',
  factor_evidence_status: 'Factor evidence status', emissions_boundary: 'Emissions boundary',
};

function PublicFields({ fields }: { fields: Record<string, PublicValue> }) {
  return <dl className="divide-y divide-pv-hairline">{Object.entries(fields).map(([key, value]) => <div key={key} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2">
    <dt className="text-sm text-pv-muted">{fieldLabels[key] ?? key.replace(/_/g, ' ')}</dt>
    <dd className="break-words text-sm">{value === null ? 'Not supplied' : Array.isArray(value) ? value.join(', ') : typeof value === 'number' ? format(value, 4) : String(value)}</dd>
  </div>)}</dl>;
}

export default function PublishedReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const report = useQuery({
    queryKey: ['published-report', slug], retry: false, staleTime: Infinity,
    queryFn: async (): Promise<PublishedReport> => {
      if (!slug || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ApiError(404, 'publication_not_found', 'This published report is unavailable.');
      const response = await fetch(`/api/v1/public/reports/${encodeURIComponent(slug)}`, { credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new ApiError(response.status, 'public_report_failed', response.status === 404 ? 'This published report is unavailable.' : 'The published report could not be loaded.');
      return response.json() as Promise<PublishedReport>;
    },
  });
  const data = report.data;
  const snapshot = data?.snapshot_data;
  return <div className="min-h-screen bg-pv-bg text-pv-ink">
    <header className="border-b border-pv-divider bg-white px-6 py-5"><p className="mx-auto max-w-5xl text-lg font-semibold text-pv-teal">Pax Virentia · Published report</p></header>
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {report.isPending && <SectionCard><h1 className="text-2xl font-semibold">Published scenario report</h1><p role="status">Loading the public snapshot…</p></SectionCard>}
      {report.isError && <SectionCard><h1 className="text-2xl font-semibold">{report.error instanceof ApiError && report.error.status === 404 ? 'Report unavailable' : 'Could not load report'}</h1>
        <p role="alert">{errorMessage(report.error)}</p><button type="button" onClick={() => { void report.refetch(); }} className={btnSecondary + ' self-start'}>Retry loading</button>
      </SectionCard>}
      {data && <>
        <div><h1 className="break-words text-[28px] font-semibold">{data.title}</h1><p className="mt-3 whitespace-pre-wrap break-words">{data.summary}</p>
          {data.published_at && <p className="mt-2 text-sm text-pv-muted">Published <time dateTime={data.published_at}>{data.published_at}</time></p>}
        </div>
        {snapshot?.boundary && <SectionCard><h2 className="text-lg font-semibold">Scenario boundary</h2><PublicFields fields={snapshot.boundary} /></SectionCard>}
        {!!snapshot?.metrics?.length && <SectionCard><h2 className="text-lg font-semibold">Published metrics</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {snapshot.metrics.map(metric => <article key={metric.key} className="rounded-xl border border-pv-divider p-4"><h3 className="font-semibold">{label(metric.key)}</h3>
            <div className="mt-3"><StatusBadge status={metric.status} /></div>
            {metric.status === 'not_estimable' ? <p className="mt-2 text-sm">Not estimable is distinct from zero impact.</p> : <p className="mt-2 text-2xl tabular-nums">{format(metric.value, 4)} <span className="text-sm">{metric.unit}</span></p>}
            {metric.reason && <p className="mt-2 text-sm">{metric.reason}</p>}
            {!!metric.required_evidence?.length && <ul className="mt-2 list-disc pl-5 text-sm">{metric.required_evidence.map(item => <li key={item}>{item}</li>)}</ul>}
          </article>)}
        </div></SectionCard>}
        {(['energy', 'carbon', 'economics'] as const).map(section => snapshot?.[section] && <SectionCard key={section}><h2 className="text-lg font-semibold">{label(section)}</h2><PublicFields fields={snapshot[section]!} /></SectionCard>)}
        {snapshot?.ecology && <SectionCard><h2 className="text-lg font-semibold">Ecological evidence gate</h2><StatusBadge status={snapshot.ecology.status} />
          {snapshot.ecology.status === 'not_estimable' ? <p>Not estimable is distinct from zero impact and does not establish ecological safety.</p> : <p>{format(snapshot.ecology.value, 4)} {snapshot.ecology.unit}</p>}
          {snapshot.ecology.reason && <p>{snapshot.ecology.reason}</p>}
          {!!snapshot.ecology.required_evidence?.length && <><h3 className="font-semibold">Required evidence</h3><ul className="list-disc space-y-1 pl-5 text-sm">{snapshot.ecology.required_evidence.map(item => <li key={item}>{item}</li>)}</ul></>}
        </SectionCard>}
        {snapshot?.provenance && <SectionCard><h2 className="text-lg font-semibold">Published evidence boundaries</h2><PublicFields fields={snapshot.provenance} /></SectionCard>}
        {!!snapshot?.limitations?.length && <SectionCard><h2 className="text-lg font-semibold">Limitations</h2><ul className="list-disc space-y-2 pl-5 text-sm">{snapshot.limitations.map(item => <li key={item}>{item}</li>)}</ul></SectionCard>}
        {!snapshot && <p role="status">This report has no published numerical snapshot.</p>}
      </>}
    </main>
  </div>;
}
