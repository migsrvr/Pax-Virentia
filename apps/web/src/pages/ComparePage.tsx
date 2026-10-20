import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { errorMessage, format, label, listRuns } from '../services/simulation';
import type { Comparison } from '../services/simulation';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';
import StatusBadge from '../components/common/StatusBadge';

export default function ComparePage() {
  const runs = useQuery({ queryKey: ['runs'], queryFn: listRuns, refetchInterval: 15000 });
  const candidates = runs.data?.filter(run => run.status === 'succeeded') ?? [];
  const baselines = candidates.filter(run => run.kind === 'baseline');
  const interventions = candidates.filter(run => run.kind === 'intervention');
  const [baselineSelection, setBaselineSelection] = useState<string | null>(null);
  const [interventionSelection, setInterventionSelection] = useState<string | null>(null);
  const baselineId = baselineSelection ?? baselines[0]?.id ?? '';
  const interventionId = interventionSelection ?? interventions[0]?.id ?? '';
  const baseline = candidates.find(run => run.id === baselineId);
  const intervention = candidates.find(run => run.id === interventionId);
  const comparison = useQuery({
    queryKey: ['comparison', baselineId, interventionId],
    queryFn: () => api.post<Comparison>('/comparisons', { baseline_run_id: baselineId, intervention_run_id: interventionId }),
    enabled: !!baseline && !!intervention && baselineId !== interventionId, retry: false,
  });
  const data = comparison.data;
  const error = comparison.error;
  const signed = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${format(value, 4)}`;
  return <div className="flex flex-col gap-6 text-pv-ink">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold tracking-tight">Compare simulations</h1><p className="mt-1 text-sm text-pv-muted">Compare completed runs over compatible scientific boundaries.</p></div>
      <Link to="/scenarios" className={btnSecondary}>Create scenario</Link>
    </div>
    {runs.isPending && <p role="status">Loading completed runs…</p>}
    {runs.isError && <div role="alert" className="rounded-xl bg-pv-err-bg p-4 text-pv-err-ink">{errorMessage(runs.error)} <button className={btnSecondary} onClick={() => { void runs.refetch(); }}>Retry run list</button></div>}
    {runs.isSuccess && <SectionCard>
      <h2 className="text-lg font-semibold">Select baseline and intervention</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[{ title: 'Baseline run', id: baselineId, items: baselines, change: setBaselineSelection }, { title: 'Intervention run', id: interventionId, items: interventions, change: setInterventionSelection }].map(field => <label key={field.title} className="flex flex-col gap-2 text-sm font-medium">{field.title}
          <select value={field.id} onChange={event => field.change(event.target.value)} className="h-11 w-full rounded-lg border border-pv-input-border bg-white px-3 focus:outline-pv-teal">
            <option value="">Select a completed run</option>{field.items.map(run => <option key={run.id} value={run.id}>{run.scenario_name ?? 'Scenario'} · rev {run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · {run.id}</option>)}
          </select>
        </label>)}
      </div>
      {(!baselines.length || !interventions.length) && <div role="status" className="flex flex-col items-start gap-3"><p>A completed baseline and intervention are needed. Queued, failed, or cancelled runs cannot be compared.</p><Link to="/scenarios" className={btnPrimary}>Set up a scenario</Link></div>}
    </SectionCard>}
    {baseline && intervention && <>
      <section aria-label="Baseline versus intervention comparison" className="overflow-hidden rounded-xl border border-pv-divider bg-white shadow-pv-card">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
          {[baseline, intervention].map((run, index) => <div key={run.id} className={index ? 'bg-pv-forest p-6 text-white md:col-start-3' : 'bg-pv-ink p-6 text-white'}>
            <p className="text-xs uppercase tracking-wide">{index ? 'Intervention' : 'Baseline'}</p><h2 className="mt-2 text-lg font-semibold">{run.scenario_name ?? run.id}</h2>
            <p className="mt-1 break-words text-xs">Revision {run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · run {run.id}</p>
          </div>)}
          <div className="hidden items-center justify-center bg-pv-ink px-2 text-white md:col-start-2 md:row-start-1 md:flex"><ArrowRight size={20} aria-hidden /></div>
        </div>
        <div aria-live="polite" className="p-4">
          {comparison.isPending && <p role="status">Checking compatibility and calculating differences…</p>}
          {comparison.isError && <div role="alert" className="flex flex-col gap-3 text-pv-err-ink">
            <h3 className="font-semibold">{error instanceof ApiError && error.code === 'incompatible_comparison' ? 'Runs have incompatible assumptions' : 'Comparison could not be loaded'}</h3>
            <p>{error instanceof Error ? error.message : errorMessage(error)}</p>
            {error instanceof ApiError && !!error.fieldErrors.length && <ul className="list-disc space-y-1 pl-5">{error.fieldErrors.map((field, index) => <li key={`${field.field}-${index}`}>{field.field}: {field.message}</li>)}</ul>}
            <button type="button" className={btnSecondary + ' self-start'} onClick={() => { void comparison.refetch(); }}>Retry comparison</button>
          </div>}
          {data && <div className="flex flex-wrap items-center gap-3"><Chip tone={data.compatible ? 'ok' : 'warn'}>{data.compatible ? 'Compatible boundaries' : 'Incompatible boundaries'}</Chip>
            <span className="text-sm">{format(data.volume_m3)} m³ · {data.period_start} – {data.period_end} · {data.currency}</span></div>}
        </div>
        {data?.compatible && <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <caption className="sr-only">Server-calculated comparison. Differences are intervention minus baseline.</caption>
          <thead className="bg-pv-bg"><tr>{['Metric', 'Baseline', 'Intervention', 'Change', 'Change (%)'].map(title => <th scope="col" key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
          <tbody>{data.deltas.map(delta => <tr key={delta.key} className="border-t border-pv-hairline">
            <th scope="row" className="px-4 py-4 font-medium">{label(delta.key)}<span className="block text-xs font-normal text-pv-muted">{delta.unit}</span></th>
            <td className="px-4 py-4 tabular-nums">{delta.baseline === null ? <StatusBadge status={delta.baseline_status} /> : format(delta.baseline, 4)}</td>
            <td className="px-4 py-4 tabular-nums">{delta.intervention === null ? <StatusBadge status={delta.intervention_status} /> : format(delta.intervention, 4)}</td>
            <td className="px-4 py-4 tabular-nums">{delta.delta === null ? (delta.baseline_status === 'not_estimable' || delta.intervention_status === 'not_estimable' ? 'Not estimable' : 'Unavailable') : signed(delta.delta)}</td>
            <td className="px-4 py-4 tabular-nums">{delta.delta_pct === null ? 'Not applicable' : `${signed(delta.delta_pct)}%`}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>
      {data?.compatible && <>
        <SectionCard><h2 className="text-lg font-semibold">Net operating savings</h2><p className="text-[28px] font-semibold tabular-nums">{format(data.net_savings_php)} <span className="text-base font-normal">PHP</span></p>
          <p className="text-sm text-pv-muted">Baseline operating cost minus intervention operating cost for this period. Negative savings mean a cost increase.</p>
        </SectionCard>
        <SectionCard><h2 className="text-lg font-semibold">How to read this comparison</h2>
          <p className="text-sm">Changes are intervention minus baseline. Percentages are not applicable when the baseline is zero. Each metric has its own boundary; a decrease does not establish overall sustainability.</p>
          <p className="text-sm">Electricity-associated emissions do not represent a complete facility footprint. Ecological stress remains not estimable when the evidence gate is unmet, distinct from zero impact.</p>
          <p className="text-sm">Unverified treatment specifications do not establish expected Pax Silica plant performance.</p>
          <div className="flex flex-wrap gap-3"><Link to={`/results?runId=${baselineId}`} className={btnSecondary}>Baseline sources</Link><Link to={`/results?runId=${interventionId}`} className={btnSecondary}>Intervention sources</Link></div>
        </SectionCard>
      </>}
    </>}
  </div>;
}
