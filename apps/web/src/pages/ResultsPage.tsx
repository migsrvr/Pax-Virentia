import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { assumptionRows, emissionsOf, errorMessage, formatInteger, formatRate, listRuns } from '../services/simulation';
import type { Explanation, Results } from '../services/simulation';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';
import StatusBadge from '../components/common/StatusBadge';
import PublicationPanel from '../components/common/PublicationPanel';

export default function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const runs = useQuery({ queryKey: ['runs'], queryFn: listRuns, refetchInterval: 15000 });
  const succeeded = runs.data?.filter(run => run.status === 'succeeded') ?? [];
  const requestedId = params.get('runId');
  const runId = requestedId ?? succeeded[0]?.id;
  const selectedRun = runs.data?.find(run => run.id === runId);
  const result = useQuery({ queryKey: ['results', runId], queryFn: () => api.get<Results>(`/runs/${encodeURIComponent(runId!)}/results`), enabled: !!runId });
  const explanation = useQuery({
    queryKey: ['explanation', runId],
    queryFn: async () => {
      try { return await api.get<Explanation>(`/runs/${encodeURIComponent(runId!)}/explain`); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    }, enabled: !!runId && result.isSuccess, retry: false,
  });
  const generate = useMutation({
    mutationFn: (id: string) => api.post<Explanation>(`/runs/${encodeURIComponent(id)}/explain`),
    onSuccess: (data, id) => { queryClient.setQueryData(['explanation', id], data); },
  });
  const chooseRun = (id: string) => {
    const next = new URLSearchParams(params); next.set('runId', id); setParams(next);
    generate.reset();
  };
  const p = selectedRun?.frozen_inputs?.parameters;
  const data = result.data;
  const e = data?.economics;
  const carbon = data?.carbon;
  const { value: emissions, unit: carbonUnit } = emissionsOf(carbon);
  // Display-only ratio of two stored values; the stored results are not changed.
  const costIntensity = p && p.volume_m3 > 0 && e ? e.total_opex_php / p.volume_m3 : undefined;
  const energyParts = p ? [
    { title: 'Pumps', value: p.technology.pump_power_kw * p.pump_duty_hours },
    { title: 'Mixers', value: p.technology.mixer_power_kw * p.mixing_load_multiplier * p.mixing_hours },
  ] : [];
  const costParts = e ? [
    ['Electricity', e.electricity_cost_php], ['Chemicals', e.chemical_cost_php],
    ['Labor', e.labor_cost_php], ['Maintenance', e.maintenance_cost_php],
    ['Other non-energy', e.other_cost_php],
  ] as const : [];
  const narrative = explanation.data;
  const generateForSelected = generate.variables === runId;
  return <div className="flex flex-col gap-6 text-pv-ink">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold tracking-tight">Simulation results</h1>
        <p className="mt-1 text-sm text-pv-muted">Immutable numerical results and their evidence boundaries.</p></div>
      <Link to="/compare" className={btnSecondary}>Compare runs</Link>
    </div>
    <SectionCard className="gap-3">
      <label className="flex flex-col gap-2 text-sm font-medium">Completed run
        <select aria-label="Select completed run" value={runId ?? ''} onChange={event => chooseRun(event.target.value)} className="h-11 w-full rounded-lg border border-pv-input-border bg-white px-3 focus:outline-pv-teal">
          {!succeeded.some(run => run.id === runId) && <option value={runId ?? ''}>{runId ?? 'No completed run selected'}</option>}
          {succeeded.map(run => <option key={run.id} value={run.id}>{run.scenario_name ?? 'Scenario'} · revision {run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · {run.id}</option>)}
        </select>
      </label>
      {selectedRun && <p className="break-words text-xs text-pv-muted">{selectedRun.scenario_name} · run {selectedRun.id} · {selectedRun.status}</p>}
      {runs.isError && <p role="alert" className="text-pv-err-ink">{errorMessage(runs.error)} <button className={btnSecondary} onClick={() => { void runs.refetch(); }}>Retry run list</button></p>}
    </SectionCard>
    {(runs.isPending && !requestedId || !!runId && result.isPending) && <p role="status">Loading run results…</p>}
    {!runId && runs.isSuccess && <SectionCard><h2 className="text-lg font-semibold">No completed runs yet</h2><p>Save a scenario and run the offline model to see calculated results.</p><Link to="/scenarios" className={btnPrimary}>Create scenario</Link></SectionCard>}
    {result.isError && <div role="alert" className="rounded-xl bg-pv-err-bg p-4 text-pv-err-ink">{errorMessage(result.error)} <button onClick={() => { void result.refetch(); }} className={btnSecondary}>Retry results</button></div>}
    {data && <>
      <div className="flex flex-wrap items-center gap-3"><Chip tone="info">Simulated estimate</Chip>
        {p && <Chip tone={p.technology.evidence_status === 'unverified' ? 'warn' : 'neutral'}>{p.technology.evidence_status} specification</Chip>}
        {p && <span className="text-sm text-pv-muted">{formatInteger(p.volume_m3)} m³ · {p.period_start} – {p.period_end}</span>}
      </div>
      {!!data.warnings?.length && <SectionCard className="gap-3"><h2 className="text-lg font-semibold">Scientific limitations</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">{data.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></SectionCard>}
      <nav aria-label="Result sections" className="flex flex-wrap gap-2">{[['overview', 'Overview'], ['assumptions', 'Inputs and provenance']].map(([id, title]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={tab === id ? btnPrimary : btnSecondary}>{title}</button>)}</nav>
      {tab === 'overview' ? <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SectionCard className="gap-3"><h2 className="text-sm text-pv-muted">Energy consumption</h2>
            <p className="text-2xl font-semibold tabular-nums">{formatInteger(data.energy.total_kwh)} <span className="text-sm font-normal">kWh</span></p>
            <p className="text-xs text-pv-muted">Energy intensity {formatRate(data.energy.energy_intensity_kwh_per_m3, 2)} kWh/m³</p>
          </SectionCard>
          <SectionCard className="gap-3"><h2 className="text-sm text-pv-muted">Electricity-associated emissions</h2>
            <p className="text-2xl font-semibold tabular-nums">{formatInteger(emissions)} <span className="text-sm font-normal">{carbonUnit}</span></p>
          </SectionCard>
          <SectionCard className="gap-3"><h2 className="text-sm text-pv-muted">Operating cost</h2>
            <p className="text-2xl font-semibold tabular-nums">{formatInteger(e?.total_opex_php)} <span className="text-sm font-normal">PHP</span></p>
            {e && <p className="text-xs text-pv-muted">Cost intensity {formatRate(costIntensity, 2)} PHP/m³</p>}
          </SectionCard>
          <SectionCard className="gap-3"><h2 className="text-sm text-pv-muted">Downstream ecosystem stress</h2>
            {data.ecology?.status === 'not_estimable' ? <StatusBadge status="not_estimable" /> : <p>{data.ecology ? `${formatRate(data.ecology.value, 2)} ${data.ecology.unit ?? ''}` : 'Not requested'}</p>}
          </SectionCard>
        </div>
        <SectionCard className="gap-3"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">Gemini AI explanation</h2>
          <button type="button" disabled={generate.isPending && generateForSelected} onClick={() => generate.mutate(runId!)} className={btnSecondary + ' disabled:opacity-50'}><Sparkles size={18} aria-hidden />{generate.isPending && generateForSelected ? 'Generating explanation…' : 'Explain these results'}</button></div>
          <p className="text-sm text-pv-muted">Generated narratives explain stored numerical results. They do not replace source evidence or calculation methods.</p>
          {explanation.isPending && <p role="status">Checking for a saved explanation…</p>}
          {(explanation.isError || generate.isError && generateForSelected) && <p role="alert" className="text-pv-err-ink">{errorMessage(generate.isError && generateForSelected ? generate.error : explanation.error)}</p>}
          {narrative ? <div className="flex flex-col gap-3"><p className="whitespace-pre-wrap">{narrative.narrative ?? narrative.summary}</p>
            {!!narrative.key_findings?.length && <ul className="list-disc pl-5">{narrative.key_findings.map(item => <li key={item}>{item}</li>)}</ul>}
            {!!narrative.limitations?.length && <><h3 className="font-semibold">Explanation limitations</h3><ul className="list-disc pl-5">{narrative.limitations.map(item => <li key={item}>{item}</li>)}</ul></>}
          </div> : explanation.isSuccess && <p className="text-sm text-pv-muted">No explanation has been saved for this run.</p>}
        </SectionCard>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard className="gap-4">
            <h2 className="text-lg font-semibold">Energy breakdown</h2>
            {energyParts.length ? <>
              <div aria-hidden="true" className="flex h-8 overflow-hidden rounded-lg bg-pv-chip">{energyParts.map((part, index) => <div key={part.title} className={index % 2 ? 'bg-pv-forest' : 'bg-pv-teal'} style={{ width: `${data.energy.total_kwh > 0 ? Math.max(0, Math.min(100, part.value / data.energy.total_kwh * 100)) : 0}%` }} />)}</div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-pv-teal">View equipment line items</summary>
                <ul className="mt-2 divide-y divide-pv-hairline">{energyParts.map(part => <li key={part.title} className="flex items-center justify-between gap-4 py-2"><span>{part.title}</span><span className="tabular-nums">{formatInteger(part.value)} kWh</span></li>)}</ul>
              </details>
              <p className="text-xs text-pv-muted">Breakdown derived from this run’s frozen equipment duties.</p>
            </> : <p className="text-sm text-pv-muted">Equipment-level data is not available for this run.</p>}
            <p>Energy intensity: <span className="font-semibold">{formatRate(data.energy.energy_intensity_kwh_per_m3, 2)} kWh/m³</span></p>
          </SectionCard>
          <SectionCard className="gap-4"><h2 className="text-lg font-semibold">Operating cost breakdown</h2>
            {e ? <>
              <div aria-hidden="true" className="flex h-8 overflow-hidden rounded-lg bg-pv-chip">{costParts.map(([title, value], index) => <div key={title} className={index % 2 ? 'bg-pv-forest' : 'bg-pv-teal'} style={{ width: `${e.total_opex_php > 0 ? Math.max(0, Math.min(100, value / e.total_opex_php * 100)) : 0}%` }} />)}</div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-pv-teal">View cost line items</summary>
                <ul className="mt-2 divide-y divide-pv-hairline">{costParts.map(([title, value]) => <li key={title} className="flex items-center justify-between gap-4 py-2"><span>{title}</span><span className="tabular-nums">{formatInteger(value)} PHP</span></li>)}</ul>
              </details>
              <p>Cost intensity: <span className="font-semibold">{formatRate(costIntensity, 2)} PHP/m³</span></p></> : <p>Economics was not requested for this run.</p>}
          </SectionCard>
        </div>
        <SectionCard><h2 className="text-lg font-semibold">Ecological evidence gate</h2>
          {data.ecology ? <><p>{data.ecology.reason}</p>{data.ecology.status === 'not_estimable' && <p className="text-sm text-pv-muted">Not estimable is distinct from zero impact or a software failure.</p>}
            {!!data.ecology.required_evidence?.length && <><h3 className="font-semibold">Required evidence</h3><ul className="list-disc space-y-1 pl-5 text-sm">{data.ecology.required_evidence.map(item => <li key={item}>{item}</li>)}</ul></>}
          </> : <p>Ecology was not requested for this run.</p>}
        </SectionCard>
      </> : <SectionCard><h2 className="text-lg font-semibold">Frozen inputs and source provenance</h2>
        <dl className="divide-y divide-pv-hairline">{assumptionRows({ ...(p ? { inputs: p } : {}), provenance: data.provenance }).map(([term, value]) => <div key={term} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-2">
          <dt className="break-words text-sm text-pv-muted">{term}</dt><dd className="break-words text-sm">{value}</dd>
        </div>)}</dl>
      </SectionCard>}
      <PublicationPanel runId={runId} defaultTitle={`${selectedRun?.scenario_name ?? 'Scenario'} — simulation results`} />
    </>}
  </div>;
}
