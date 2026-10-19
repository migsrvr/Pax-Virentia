import type { ChipTone } from '../pages/scenarios/shared';

/* Workspace data layer. The prototype is fixture-driven, so these loaders read
   curated sample data asynchronously — the same lifecycle (pending → data or
   empty) a real API would produce. Swap the fixtures for `api.get` calls when
   the workspace is wired to the backend. */

export type DashboardRunStatus = 'draft' | 'running' | 'completed' | 'failed';

export type DashboardRun = {
  name: string;
  sub: string;
  revRun: string;
  status: DashboardRunStatus;
  updated: string;
  energy?: string;
  co2e?: string;
  cost?: string;
  failedNote?: string;
  action: { label: string; to?: string };
};

const DASHBOARD_RUNS: DashboardRun[] = [
  {
    name: 'Pax Silica pilot',
    sub: 'Intervention · spec v0.4 (unverified)',
    revRun: 'Rev 1 · not run',
    status: 'draft',
    updated: '13 Oct, 09:40',
    action: { label: 'Continue setup', to: '/scenarios' },
  },
  {
    name: 'Peak-demand week',
    sub: 'Intervention',
    revRun: 'Rev 1 · R-0141',
    status: 'running',
    updated: '13 Oct, 09:58',
    action: { label: 'Results when done' },
  },
  {
    name: 'Reduced mixing',
    sub: 'Intervention · mixing load 0.80',
    revRun: 'Rev 1 · R-0140',
    status: 'completed',
    updated: '12 Oct, 11:05',
    energy: '23,676 kWh',
    co2e: '16,862 kg',
    cost: '₱331,600',
    action: { label: 'Compare', to: '/compare' },
  },
  {
    name: 'Baseline operation',
    sub: 'Baseline · conventional spec v1.1',
    revRun: 'Rev 3 · R-0139',
    status: 'completed',
    updated: '11 Oct, 16:40',
    energy: '24,645 kWh',
    co2e: '17,552 kg',
    cost: '₱342,259',
    action: { label: 'Recommendations', to: '/recommendations' },
  },
  {
    name: 'High-dose sensitivity',
    sub: 'Intervention',
    revRun: 'Rev 1 · R-0138',
    status: 'failed',
    updated: '10 Oct, 15:12',
    failedNote: 'Stopped before saving · inputs unchanged',
    action: { label: 'Retry', to: '/scenarios' },
  },
];

/* The workspace starts with the sample data loaded. `loadSampleWorkspace` is
   the action behind the empty state's "Load sample scenarios" button. */
let workspaceSeeded = true;

export function loadSampleWorkspace(): void {
  workspaceSeeded = true;
}

export type DashboardWorkspace = {
  seeded: boolean;
  runs: DashboardRun[];
};

export async function fetchDashboardWorkspace(): Promise<DashboardWorkspace> {
  return { seeded: workspaceSeeded, runs: workspaceSeeded ? DASHBOARD_RUNS : [] };
}

export type CompareRunKind = 'baseline' | 'intervention';

export type CompareRun = {
  id: string;
  name: string;
  kind: CompareRunKind;
  strip: string;
  pill: { tone: ChipTone; label: string };
  /* Card subtitle in the populated comparison */
  cardSub: string;
  /* Card subtitle while the run waits in the missing-data state */
  missingSub: string;
  /* Candidate row subtitle in the "Add another run" list */
  candidateSub: string;
};

const COMPARE_RUNS: CompareRun[] = [
  {
    id: 'R-0139',
    name: 'Baseline operation',
    kind: 'baseline',
    strip: 'bg-pv-ink',
    pill: { tone: 'neutral', label: 'Baseline' },
    cardSub: 'Rev 3 · run R-0139 · conventional spec v1.1',
    missingSub: 'Rev 3 · run R-0139 · 1–5 Jan 2026',
    candidateSub: 'Completed 11 Oct 2026 · 1–5 Jan 2026 · 61,600 m³',
  },
  {
    id: 'R-0142',
    name: 'Pax Silica pilot',
    kind: 'intervention',
    strip: 'bg-pv-teal',
    pill: { tone: 'warn', label: 'Unverified specification' },
    cardSub: 'Rev 1 · run R-0142 · spec v0.4',
    missingSub: 'Rev 1 · run R-0142 · 1–5 Jan 2026',
    candidateSub: 'Completed 13 Oct 2026 · 1–5 Jan 2026 · 61,600 m³',
  },
  {
    id: 'R-0140',
    name: 'Reduced mixing',
    kind: 'intervention',
    strip: 'bg-pv-violet',
    pill: { tone: 'violet', label: 'Operational change' },
    cardSub: 'Rev 1 · run R-0140 · mixing load 0.80',
    missingSub: 'Rev 1 · run R-0140 · 1–5 Jan 2026',
    candidateSub: 'Completed 12 Oct 2026 · 1–5 Jan 2026 · 61,600 m³',
  },
];

export type RunningCandidate = {
  id: string;
  title: string;
  sub: string;
};

const RUNNING_CANDIDATE: RunningCandidate = {
  id: 'R-0141',
  title: 'Peak-demand week · R-0141',
  sub: 'Still running · 64%',
};

export type IncompatibleRun = {
  title: string;
  body: string;
  differences: { label: string; rest: string; ok: boolean }[];
  advice: string;
};

const INCOMPATIBLE_RUN: IncompatibleRun = {
  title: "December baseline can't be compared",
  body: "Run R-0131 uses different boundaries, so its differences wouldn't be like for like.",
  differences: [
    { label: 'Period differs', rest: '1–31 Dec 2025 vs 1–5 Jan 2026', ok: false },
    { label: 'Volume differs', rest: '382,300 m³ vs 61,600 m³', ok: false },
    { label: 'Grid factor year differs', rest: '2025 vs 2026', ok: false },
    { label: 'Same currency and boundary', rest: 'PHP · electricity only', ok: true },
  ],
  advice: 'To compare it, re-run that scenario for 1–5 Jan 2026 with the 2026 factor.',
};

export type CompareWorkspace = {
  runs: CompareRun[];
  baselineId: string;
  running: RunningCandidate;
  incompatible: IncompatibleRun;
};

export async function fetchCompareWorkspace(): Promise<CompareWorkspace> {
  return {
    runs: COMPARE_RUNS,
    baselineId: 'R-0139',
    running: RUNNING_CANDIDATE,
    incompatible: INCOMPATIBLE_RUN,
  };
}
