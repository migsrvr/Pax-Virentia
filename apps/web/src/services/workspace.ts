import type { ChipTone } from '../pages/scenarios/shared';
import { listAll, listRuns } from './simulation';
import type { Run, Scenario } from './simulation';

export type DashboardRunStatus = 'draft' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DashboardRun = {
  name: string; sub: string; revRun: string; status: DashboardRunStatus; updated: string;
  energy?: string; co2e?: string; cost?: string; failedNote?: string;
  action: { label: string; to?: string };
};
export type DashboardWorkspace = { seeded: boolean; runs: DashboardRun[] };
export async function fetchDashboardWorkspace(): Promise<DashboardWorkspace> {
  const [runs, scenarios] = await Promise.all([listRuns(), listAll<Scenario>('/scenarios')]);
  const rows: DashboardRun[] = runs.map(run => ({
    name: run.scenario_name ?? run.id, sub: run.kind ?? 'Scenario',
    revRun: `Rev ${run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · ${run.id}`,
    status: run.status === 'succeeded' ? 'completed' : run.status,
    updated: new Date(run.ended_at ?? run.created_at).toLocaleString(),
    failedNote: run.error?.message ?? run.error_message ?? (run.status === 'cancelled' ? 'Cancelled' : undefined),
    action: run.status === 'succeeded' ? { label: 'View results', to: `/results?runId=${run.id}` } :
      ['queued', 'running'].includes(run.status) ? { label: run.status === 'queued' ? 'Queued' : 'Running' } :
      { label: 'Review inputs', to: '/scenarios' },
  }));
  const usedRevisions = new Set(runs.map(run => run.scenario_revision_id));
  for (const scenario of scenarios) {
    const revision = scenario.latest_revision?.id ?? (scenario as Scenario & { revision_id?: string }).revision_id;
    if (!revision || usedRevisions.has(revision)) continue;
    rows.push({ name: scenario.name, sub: scenario.kind, revRun: `Rev ${scenario.revision_no ?? scenario.latest_revision?.revision_no ?? '—'} · not run`,
      status: 'draft', updated: 'Saved scenario', action: { label: 'Continue setup', to: `/scenarios?scenarioId=${encodeURIComponent(scenario.id)}` } });
  }
  return { seeded: rows.length > 0, runs: rows };
}
export type CompareRunKind = 'baseline' | 'intervention';
export type CompareRun = {
  id: string; name: string; kind: CompareRunKind; strip: string; pill: { tone: ChipTone; label: string };
  cardSub: string; missingSub: string; candidateSub: string;
};
export type RunningCandidate = { id: string; title: string; sub: string };
export type IncompatibleRun = { title: string; body: string; differences: { label: string; rest: string; ok: boolean }[]; advice: string };
export type CompareWorkspace = { runs: CompareRun[]; baselineId: string; running?: RunningCandidate; incompatible?: IncompatibleRun };
export async function fetchCompareWorkspace(): Promise<CompareWorkspace> {
  const live = await listRuns();
  const runs = live.filter(run => run.status === 'succeeded').map((run: Run): CompareRun => ({
    id: run.id, name: run.scenario_name ?? run.id, kind: run.kind ?? 'intervention',
    strip: run.kind === 'baseline' ? 'bg-pv-ink' : 'bg-pv-teal',
    pill: { tone: run.frozen_inputs?.parameters.technology.evidence_status === 'unverified' ? 'warn' : 'neutral',
      label: run.frozen_inputs?.parameters.technology.evidence_status ?? 'Evidence requires review' },
    cardSub: `Rev ${run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · ${run.id}`,
    missingSub: run.id, candidateSub: new Date(run.ended_at ?? run.created_at).toLocaleString(),
  }));
  const pending = live.find(run => ['queued', 'running'].includes(run.status));
  return { runs, baselineId: runs.find(run => run.kind === 'baseline')?.id ?? '',
    running: pending ? { id: pending.id, title: pending.scenario_name ?? pending.id, sub: pending.status } : undefined };
}
