import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PublicReport, PublicSnapshot } from '../../services/publications';
import { errorMessage } from '../../services/simulation';
import { CARD_CLASS, METRIC_LABELS, OUTLINE_BTN, metricValue } from './publicPortal';

/** Shown wherever a page needs a published snapshot and none exists. */
export function NoPublishedSnapshot({ title = 'No results have been published yet' }: { title?: string }) {
  return (
    <section className={`flex flex-col items-start gap-3 p-6 ${CARD_CLASS}`}>
      <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h2>
      <p className="max-w-[640px] text-[14px] leading-5 text-pv-ink-light">
        Results appear here only after a utility analyst submits a snapshot and a separate reviewer approves it.
        Nothing on this page is a placeholder figure.
      </p>
      <Link to="/public/reports" className={OUTLINE_BTN}>Reports and methodology</Link>
    </section>
  );
}

export function LoadState({ query, children }: { query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }; children: ReactNode }) {
  if (query.isPending) return <p role="status" className="text-[14px] text-pv-ink-light">Loading published results…</p>;
  if (query.isError) {
    return (
      <div role="alert" className={`flex flex-col items-start gap-3 p-6 ${CARD_CLASS}`}>
        <p className="text-[14px] text-pv-ink">Published results could not be loaded. {errorMessage(query.error)}</p>
        <button type="button" className={OUTLINE_BTN} onClick={() => { void query.refetch(); }}>Try again</button>
      </div>
    );
  }
  return <>{children}</>;
}

export function MetricList({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <ul>
      {snapshot.metrics.map((metric) => (
        <li key={metric.key} className="flex items-start justify-between gap-6 border-b border-pv-line-soft py-3 last:border-b-0">
          <div>
            <p className="text-[14px] font-medium leading-5 text-pv-ink">{METRIC_LABELS[metric.key] ?? metric.key}</p>
            {metric.status === 'not_estimable' ? (
              <p className="mt-1.5 max-w-[320px] text-[12px] leading-4 text-pv-ink-light">
                The evidence does not support an estimate. This is not the same as zero impact.
              </p>
            ) : null}
          </div>
          <p className={metric.status === 'not_estimable' ? 'text-[14px] font-semibold leading-5 text-pv-ink' : 'text-[18px] font-semibold leading-[26px] text-pv-ink tabular-nums'}>
            {metricValue(metric)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LimitationsCard({ snapshot }: { snapshot: PublicSnapshot }) {
  if (!snapshot.limitations.length) return null;
  return (
    <section className={`flex flex-col gap-3 p-6 ${CARD_CLASS}`}>
      <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Limits of these results</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-5 text-pv-ink">
        {snapshot.limitations.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="text-[12px] leading-4 text-pv-ink-light">
        Technology evidence: {snapshot.provenance.technology_evidence_status ?? 'unverified'} · grid factor evidence:{' '}
        {snapshot.provenance.factor_evidence_status ?? 'unverified'} · emissions boundary:{' '}
        {snapshot.provenance.emissions_boundary ?? 'electricity-associated only'}
      </p>
    </section>
  );
}

export function ReportLink({ report }: { report: PublicReport }) {
  return (
    <Link to={`/public/reports/${report.slug}`} className="text-[14px] font-semibold leading-5 text-pv-action hover:underline">
      {report.title}
    </Link>
  );
}
