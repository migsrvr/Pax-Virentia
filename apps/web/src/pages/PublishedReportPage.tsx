import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import DownloadConfirmDialog from '../components/public/DownloadConfirmDialog';
import { LimitationsCard, LoadState } from '../components/public/PublicData';
import { CARD_CLASS, OUTLINE_BTN, PRIMARY_BTN, boundaryText, publishedOn } from '../components/public/publicPortal';
import StatusBadge from '../components/common/StatusBadge';
import PublicReportUnavailablePage from './PublicReportUnavailablePage';
import { getPublicReport, publicDownloadPath } from '../services/publications';
import type { PublicSnapshot } from '../services/publications';
import { format, label } from '../services/simulation';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PublicValue = string | number | boolean | null | undefined | string[];

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
  return (
    <dl className="divide-y divide-pv-line-soft">
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2">
          <dt className="text-[14px] text-pv-ink-light">{fieldLabels[key] ?? key.replace(/_/g, ' ')}</dt>
          <dd className="break-words text-[14px]">
            {value === null || value === undefined ? 'Not supplied' : Array.isArray(value) ? value.join(', ') : typeof value === 'number' ? format(value, 4) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SnapshotSections({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <>
      {snapshot.metrics.length ? (
        <section className={`flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
          <h2 className="text-[18px] font-semibold">Published metrics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {snapshot.metrics.map((metric) => (
              <article key={metric.key} className="rounded-xl border border-pv-line p-4">
                <h3 className="font-semibold">{label(metric.key)}</h3>
                <div className="mt-3"><StatusBadge status={metric.status} /></div>
                {metric.status === 'not_estimable' ? (
                  <p className="mt-2 text-[14px]">Not estimable is distinct from zero impact.</p>
                ) : (
                  <p className="mt-2 text-[24px] tabular-nums">{format(metric.value, 4)} <span className="text-[14px]">{metric.unit}</span></p>
                )}
                {metric.reason ? <p className="mt-2 text-[14px]">{metric.reason}</p> : null}
                {metric.required_evidence?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-[14px]">{metric.required_evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className={`flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
        <h2 className="text-[18px] font-semibold">Scenario boundary</h2>
        <PublicFields fields={snapshot.boundary} />
      </section>
      {(['energy', 'carbon', 'economics'] as const).map((section) => snapshot[section] ? (
        <section key={section} className={`flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
          <h2 className="text-[18px] font-semibold">{label(section)}</h2>
          <PublicFields fields={snapshot[section] as Record<string, PublicValue>} />
        </section>
      ) : null)}
      <LimitationsCard snapshot={snapshot} />
    </>
  );
}

export default function PublishedReportPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const valid = slug.length <= 100 && SLUG.test(slug);
  const [download, setDownload] = useState<'pdf' | 'csv' | null>(null);
  const result = useQuery({
    queryKey: ['published-report', slug],
    queryFn: () => getPublicReport(slug),
    enabled: valid,
    retry: false,
  });

  if (!valid || result.data?.state === 'missing') return <PublicReportUnavailablePage />;
  if (result.data?.state === 'withdrawn') return <PublicReportUnavailablePage tombstone={result.data.tombstone} />;
  const report = result.data?.state === 'published' ? result.data.report : null;

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Reports & methodology" />
      <main className="mx-auto flex w-full max-w-[1264px] flex-col gap-6 px-6 pb-12 pt-8 lg:px-8">
        <LoadState query={result}>
          {report ? (
            <>
              <div className="flex flex-col gap-3">
                <span className="inline-flex h-6 w-fit items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
                  Simulated estimate · reviewed snapshot · not a regulatory approval
                </span>
                <h1 className="break-words text-[28px] font-semibold leading-9">{report.title}</h1>
                {report.summary ? <p className="max-w-[760px] whitespace-pre-wrap break-words text-[14px] leading-5">{report.summary}</p> : null}
                <p className="text-[12px] text-pv-ink-light">
                  Published <time dateTime={report.published_at}>{publishedOn(report.published_at)}</time>
                  {report.snapshot_data ? ` · ${boundaryText(report.snapshot_data)}` : ''}
                </p>
                <div className="flex flex-wrap gap-4">
                  <button type="button" className={PRIMARY_BTN} onClick={() => setDownload('pdf')}>Download PDF</button>
                  <button type="button" className={OUTLINE_BTN} onClick={() => setDownload('csv')}>Download CSV</button>
                </div>
              </div>
              {report.snapshot_data ? <SnapshotSections snapshot={report.snapshot_data} />
                : <p role="status">This report has no published numerical snapshot.</p>}
            </>
          ) : null}
        </LoadState>
      </main>
      <PublicFooter />
      {download && report ? (
        <DownloadConfirmDialog
          path={publicDownloadPath(report.slug, download)}
          fileName={`${report.slug}.${download}`}
          onClose={() => setDownload(null)}
        />
      ) : null}
    </div>
  );
}
