import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CircleCheck, CircleSlash } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../services/auth';
import { canAnalyze } from '../services/roles';
import { errorMessage, format, label, listRuns } from '../services/simulation';
import type { Comparison, Run } from '../services/simulation';
import { changedInputs, sameBoundary } from '../services/insights';
import { Chip, btnPrimary, btnSecondary } from './scenarios/shared';
import StatusBadge from '../components/common/StatusBadge';

/**
 * Comparison insights: every compatible baseline/intervention pair of stored,
 * succeeded runs, with the server-calculated differences and the inputs that
 * differ between the two runs. Nothing here is invented or extrapolated; review
 * marks are stored per user on the server.
 */

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';
const MAX_PAIRS = 20;

type Review = { insight_key: string; status: 'reviewed' | 'dismissed'; note: string | null; updated_at: string };
type Filter = 'open' | 'reviewed' | 'dismissed' | 'all';
type Pair = { key: string; baseline: Run; intervention: Run };

const NOT_CONSIDERED = [
  'Treated-water quality, floc formation and regulatory limits',
  'Capital cost, financing and payback',
  'Ecological effects (not estimable without an approved model)',
  'Uncertainty ranges around each input',
];

const runName = (run: Run) => `${run.scenario_name ?? 'Scenario'} · rev ${run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'}`;

function describe(delta: Comparison['deltas'][number]): string {
  if (delta.delta === null) {
    return delta.baseline_status === 'not_estimable' || delta.intervention_status === 'not_estimable' ? 'Not estimable' : 'Unavailable';
  }
  if (delta.delta === 0) return 'No modeled change';
  const direction = delta.delta < 0 ? 'lower' : 'higher';
  const pct = delta.delta_pct === null ? '' : ` · ${format(Math.abs(delta.delta_pct), 2)}% ${direction}`;
  return `${delta.delta > 0 ? '+' : '−'}${format(Math.abs(delta.delta), 2)} ${delta.unit ?? ''}${pct}`.replace(/\s+·/, ' ·');
}

function InsightCard({ pair, comparison, review, onReview, canMark, saving }: {
  pair: Pair; comparison: { data?: Comparison; error: unknown; isPending: boolean };
  review: Review | undefined; onReview: (status: Review['status'] | null) => void; canMark: boolean; saving: boolean;
}) {
  const changes = pair.baseline.frozen_inputs && pair.intervention.frozen_inputs
    ? changedInputs(pair.baseline.frozen_inputs.parameters, pair.intervention.frozen_inputs.parameters) : [];
  const data = comparison.data;
  const unverified = pair.intervention.frozen_inputs?.parameters.technology.evidence_status !== 'verified';
  return (
    <article className={clsx('flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-pv-card', review?.status === 'dismissed' ? 'border-pv-divider opacity-70' : 'border-pv-divider')}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[16px] font-semibold text-pv-ink">{runName(pair.intervention)} vs {runName(pair.baseline)}</h3>
          <p className="break-all text-[12px] text-pv-muted">Intervention run {pair.intervention.id} · baseline run {pair.baseline.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unverified ? <Chip tone="warn" icon>Unverified specification</Chip> : null}
          {review ? <Chip tone={review.status === 'reviewed' ? 'ok' : 'neutral'}>{review.status === 'reviewed' ? 'Reviewed' : 'Dismissed'}</Chip> : null}
        </div>
      </header>

      {comparison.isPending ? <p role="status" className="text-[14px]">Calculating differences on the server…</p> : null}
      {!canMark ? <p className="text-[14px] text-pv-muted">Calculated differences are available to analysts; open the runs to review their results.</p> : null}
      {comparison.error ? (
        <p role="alert" className="text-[14px] text-pv-err-ink">
          {comparison.error instanceof ApiError && comparison.error.code === 'incompatible_comparison'
            ? `These runs aren’t comparable: ${comparison.error.fieldErrors.map((item) => item.field).join(', ')}.`
            : errorMessage(comparison.error)}
        </p>
      ) : null}
      {data ? (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.deltas.map((delta) => (
              <div key={delta.key} className="flex flex-col gap-1 rounded-lg bg-pv-bg px-4 py-3">
                <dt className="text-[12px] text-pv-muted">{label(delta.key)}</dt>
                <dd className={clsx('text-[14px] font-semibold tabular-nums', delta.delta !== null && delta.delta < 0 ? 'text-pv-ok-ink' : 'text-pv-ink')}>
                  {delta.delta === null && (delta.baseline_status === 'not_estimable' || delta.intervention_status === 'not_estimable')
                    ? <StatusBadge status="not_estimable" /> : describe(delta)}
                </dd>
              </div>
            ))}
          </dl>
          {data.net_savings_php !== null ? (
            <p className="text-[14px] text-pv-ink">
              Net operating savings for this period: <span className="font-semibold tabular-nums">{format(data.net_savings_php)} PHP</span>
              {data.net_savings_php < 0 ? ' (a cost increase)' : ''}.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <h4 className="text-[14px] font-semibold text-pv-ink">What differs between the runs</h4>
        {changes.length ? (
          <ul className="flex flex-col gap-1 text-[12px] text-pv-ink">
            {changes.slice(0, 12).map((change) => (
              <li key={change.field} className="break-words"><span className="text-pv-muted">{change.field}:</span> {change.before} → {change.after}</li>
            ))}
            {changes.length > 12 ? <li className="text-pv-muted">…and {changes.length - 12} more inputs</li> : null}
          </ul>
        ) : <p className="text-[12px] text-pv-muted">The frozen inputs are identical.</p>}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-pv-hairline pt-4">
        <Link to={`/compare?baseline=${encodeURIComponent(pair.baseline.id)}&intervention=${encodeURIComponent(pair.intervention.id)}`} className={btnSecondary}>
          View comparison
        </Link>
        {canMark ? (
          <Link to={`/scenarios?fromRunId=${encodeURIComponent(pair.intervention.id)}&kind=intervention`} className={btnSecondary}>
            Simulate a variation
          </Link>
        ) : null}
        {canMark ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={saving} aria-pressed={review?.status === 'reviewed'}
              onClick={() => onReview(review?.status === 'reviewed' ? null : 'reviewed')}
              className={clsx('inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-semibold transition-colors hover:bg-pv-bg disabled:opacity-50',
                review?.status === 'reviewed' ? 'text-pv-ok-ink' : 'text-pv-teal')}>
              <CircleCheck size={18} aria-hidden="true" />{review?.status === 'reviewed' ? 'Reviewed' : 'Mark reviewed'}
            </button>
            <button type="button" disabled={saving} aria-pressed={review?.status === 'dismissed'}
              onClick={() => onReview(review?.status === 'dismissed' ? null : 'dismissed')}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-semibold text-pv-muted transition-colors hover:bg-pv-bg disabled:opacity-50">
              <CircleSlash size={18} aria-hidden="true" />{review?.status === 'dismissed' ? 'Dismissed' : 'Dismiss'}
            </button>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('open');
  const runs = useQuery({ queryKey: ['runs'], queryFn: listRuns });
  const reviews = useQuery({
    queryKey: ['insight-reviews'],
    queryFn: () => api.get<{ items: Review[] }>('/insight-reviews').then((page) => page.items),
  });

  const pairs = useMemo<Pair[]>(() => {
    const succeeded = runs.data?.filter((run) => run.status === 'succeeded') ?? [];
    const baselines = succeeded.filter((run) => run.kind === 'baseline');
    const interventions = succeeded.filter((run) => run.kind === 'intervention');
    return interventions.flatMap((intervention) => baselines
      .filter((baseline) => sameBoundary(baseline.frozen_inputs?.parameters, intervention.frozen_inputs?.parameters))
      .map((baseline) => ({ key: `${baseline.id}:${intervention.id}`, baseline, intervention })))
      .slice(0, MAX_PAIRS);
  }, [runs.data]);

  const comparisons = useQueries({
    queries: pairs.map((pair) => ({
      queryKey: ['comparison', pair.baseline.id, pair.intervention.id],
      queryFn: () => api.post<Comparison>('/comparisons', { baseline_run_id: pair.baseline.id, intervention_run_id: pair.intervention.id }),
      retry: false,
      enabled: canAnalyze(user),
    })),
  });

  const save = useMutation({
    mutationFn: async ({ key, status }: { key: string; status: Review['status'] | null }): Promise<void> => {
      if (status) await api.put<Review>(`/insight-reviews/${encodeURIComponent(key)}`, { status });
      else await api.delete<void>(`/insight-reviews/${encodeURIComponent(key)}`);
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['insight-reviews'] }); },
  });

  const reviewByKey = new Map((reviews.data ?? []).map((item) => [item.insight_key, item]));
  const visible = pairs
    .map((pair, index) => ({ pair, comparison: comparisons[index] }))
    .filter(({ pair }) => {
      const status = reviewByKey.get(pair.key)?.status;
      return filter === 'all' || (filter === 'open' ? !status : status === filter);
    });
  const reviewedCount = pairs.filter((pair) => reviewByKey.get(pair.key)?.status === 'reviewed').length;
  const pct = pairs.length ? Math.round((reviewedCount / pairs.length) * 100) : 0;
  const counts: Record<Filter, number> = {
    open: pairs.filter((pair) => !reviewByKey.has(pair.key)).length,
    reviewed: reviewedCount,
    dismissed: pairs.filter((pair) => reviewByKey.get(pair.key)?.status === 'dismissed').length,
    all: pairs.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[760px] flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Comparison insights</h1>
          <p className="text-[14px] leading-5 text-pv-muted">
            Every compatible baseline and intervention pair from your stored runs, with the server-calculated
            differences and the inputs that changed. These are simulated estimates, not guaranteed savings.
          </p>
        </div>
        <Link to="/reports" className={btnPrimary}>Generate report</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([['open', 'Not reviewed'], ['reviewed', 'Reviewed'], ['dismissed', 'Dismissed'], ['all', 'All']] as const).map(([id, title]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
            className={clsx('inline-flex h-11 items-center rounded-full px-4 text-[14px] font-medium leading-5 transition-colors',
              filter === id ? 'bg-pv-forest text-white' : 'border border-pv-border-soft bg-white text-pv-ink hover:bg-pv-bg')}>
            {title} · {counts[id]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[772fr_340fr]">
        <div className="flex flex-col gap-6">
          {runs.isPending ? <p role="status">Loading stored runs…</p> : null}
          {runs.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(runs.error)}</p> : null}
          {reviews.isError ? <p role="alert" className="text-pv-err-ink">Review marks could not be loaded. {errorMessage(reviews.error)}</p> : null}
          {runs.isSuccess && !pairs.length ? (
            <section className="flex flex-col items-start gap-3 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
              <h2 className={H2}>No comparable runs yet</h2>
              <p className="text-[14px] text-pv-muted">
                Insights need a completed baseline run and a completed intervention run with the same volume, period,
                currency and grid region.
              </p>
              <Link to="/scenarios" className={btnPrimary}>Set up a scenario</Link>
            </section>
          ) : null}
          {pairs.length && !visible.length ? <p className="text-[14px] text-pv-muted">No insights match this filter.</p> : null}
          {visible.map(({ pair, comparison }) => (
            <InsightCard key={pair.key} pair={pair} review={reviewByKey.get(pair.key)}
              comparison={{ data: comparison.data, error: comparison.error, isPending: canAnalyze(user) && comparison.isPending }}
              canMark={canAnalyze(user)} saving={save.isPending && save.variables?.key === pair.key}
              onReview={(status) => save.mutate({ key: pair.key, status })} />
          ))}
          {save.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(save.error)}</p> : null}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
            <h2 className={H2}>How these are generated</h2>
            <p className="text-[14px] leading-5 text-pv-ink">
              Each insight pairs a stored intervention run with a stored baseline over the same boundary. The server
              compares their frozen results; nothing is re-estimated or extrapolated here.
            </p>
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">Not considered</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-5 text-pv-muted">
              {NOT_CONSIDERED.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section className="flex flex-col gap-3 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
            <h2 className={H2}>Review status</h2>
            <div className="flex items-center justify-between gap-4 text-[14px] leading-5">
              <span className="text-pv-ink">{reviewedCount} of {pairs.length} reviewed</span>
              <span className="text-pv-muted">{pct}%</span>
            </div>
            <div role="progressbar" aria-label="Review progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
              className="h-2 w-full overflow-hidden rounded-full bg-pv-chip">
              <div className="h-full rounded-full bg-pv-teal transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[12px] leading-4 text-pv-muted">
              Marks are saved to your account. Insights support decisions; a qualified operator decides what changes at the plant.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
