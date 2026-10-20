import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowRight,
  CircleCheck,
  CircleDashed,
  CircleX,
  Cloud,
  Coins,
  FileText,
  GitCompareArrows,
  Info,
  Lightbulb,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  SlidersHorizontal,
  Sprout,
  Table,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { btnPrimary, btnSecondary } from './scenarios/shared';
import DevStatePreview from '../components/dev/DevStatePreview';
import {
  fetchDashboardWorkspace,
  loadSampleWorkspace,
  type DashboardRun,
  type DashboardRunStatus,
} from '../services/workspace';

/* U02 · Dashboard — frame 24:2 (populated) · S02 · empty workspace — frame 37:2 ·
   S03 · loading — frame 38:2. Sample values as shown in the design.
   The state is derived from the workspace query lifecycle and its data;
   the interaction states are reachable for review through the dev preview. */

const KPI_CARDS = [
  {
    icon: Zap,
    title: 'Energy consumption',
    subtitle: 'Electricity · pumps and mixers',
    value: '23,676',
    unit: 'kWh',
    delta: '3.9% lower',
    deltaNote: '−969 kWh vs baseline',
    footnote: 'Simulated estimate · 0.384 kWh per m³',
  },
  {
    icon: Cloud,
    title: 'CO₂e emissions',
    subtitle: 'Electricity-associated only',
    value: '16,862',
    unit: 'kg CO₂e',
    delta: '3.9% lower',
    deltaNote: '−690 kg vs baseline',
    footnote: 'Simulated estimate · grid factor 0.7122 (assumed)',
  },
  {
    icon: Coins,
    title: 'Operating cost',
    subtitle: '5-day period · Philippine peso',
    value: '₱331,600',
    unit: 'PHP',
    delta: '3.1% lower',
    deltaNote: '−₱10,659 vs baseline',
    footnote: 'Simulated estimate · ₱5.38 per m³',
  },
];

const CHART_ROWS: { label: string; pct?: number }[] = [
  { label: 'Energy use', pct: -3.9 },
  { label: 'CO₂e emissions', pct: -3.9 },
  { label: 'Operating cost', pct: -3.1 },
  { label: 'Ecosystem stress' },
];

const EVIDENCE = [
  {
    icon: CircleCheck,
    tint: 'text-pv-ev-green',
    title: 'Sample dataset v1.2 checked',
    sub: '5 days of sample observations · no critical issues',
  },
  {
    icon: Info,
    tint: 'text-pv-ev-blue',
    title: 'Grid factor is an assumption',
    sub: 'DOE 2023 Luzon–Visayas value carried forward to 2026',
  },
  {
    icon: TriangleAlert,
    tint: 'text-pv-amber',
    title: 'Pax Silica specification unverified',
    sub: 'Version 0.4 · technical source pending',
  },
  {
    icon: CircleDashed,
    tint: 'text-pv-muted',
    title: 'Ecosystem model not available',
    sub: 'Indicator shown as not estimable',
  },
];

const STATUS_STYLES: Record<DashboardRunStatus, { label: string; cls: string; icon: typeof Pencil }> = {
  draft: { label: 'Draft', cls: 'bg-pv-chip text-pv-muted', icon: Pencil },
  running: { label: 'Running · 64%', cls: 'bg-pv-run-bg text-pv-run-ink', icon: LoaderCircle },
  completed: { label: 'Completed', cls: 'bg-pv-ok-bg text-pv-ok-ink', icon: CircleCheck },
  failed: { label: 'Failed', cls: 'bg-pv-err-bg text-pv-err-ink', icon: CircleX },
};

const STATUS_CHIPS: { status: DashboardRunStatus; label: string; tone: string }[] = [
  { status: 'completed', label: 'completed', tone: 'bg-pv-ok-bg text-pv-ok-ink' },
  { status: 'running', label: 'running', tone: 'bg-pv-run-bg text-pv-run-ink' },
  { status: 'draft', label: 'draft', tone: 'bg-pv-chip text-pv-muted' },
  { status: 'failed', label: 'failed', tone: 'bg-pv-err-bg text-pv-err-ink' },
];

const NEXT_STEPS = [
  {
    icon: Play,
    title: 'Finish the Pax Silica pilot',
    body: 'Review its inputs and run the simulation.',
    to: '/scenarios',
  },
  {
    icon: Lightbulb,
    title: 'Review 6 recommendations',
    body: 'Model-based ideas from the baseline run.',
    to: '/recommendations',
  },
  {
    icon: FileText,
    title: 'Prepare a report',
    body: 'Export results with assumptions and methodology.',
    to: '/reports',
  },
];

const SETUP_STEPS = [
  {
    title: 'Set up a baseline',
    body: "Today's operation, used as the reference for every comparison.",
  },
  {
    title: 'Add an alternative',
    body: 'A treatment or operating change you want to test.',
  },
  {
    title: 'Compare and report',
    body: 'See the trade-offs, then export a report or publish a snapshot.',
  },
];

const EMPTY_METRICS = [
  { title: 'Energy consumption', note: 'Appears after your first run' },
  { title: 'CO₂e emissions', note: 'Appears after your first run' },
  { title: 'Operating cost', note: 'Appears after your first run' },
  { title: 'Environmental indicator', note: 'Downstream ecosystem stress' },
];

function StatusChip({ status }: { status: DashboardRunStatus }) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;
  return (
    <span className={clsx('inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium', style.cls)}>
      <Icon size={14} aria-hidden="true" />
      {style.label}
    </span>
  );
}

function StatChip({ label, tone }: { label: string; tone: string }) {
  return <span className={clsx('inline-flex h-6 items-center rounded-full px-2 text-xs font-medium', tone)}>{label}</span>;
}

function PopulatedDashboard({ runs }: { runs: DashboardRun[] }) {
  const counts = runs.reduce(
    (acc, run) => {
      acc[run.status] += 1;
      return acc;
    },
    { draft: 0, running: 0, completed: 0, failed: 0 } as Record<DashboardRunStatus, number>,
  );

  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
          <p className="mt-1 text-sm leading-5 text-pv-muted">
            Sample Water District · representative plant · reporting period 1–5 Jan 2026 (5 days, 61,600 m³ treated)
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/compare"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-pv-border-soft bg-white px-4 text-sm font-semibold text-pv-ink transition-colors hover:bg-pv-bg"
          >
            <GitCompareArrows size={18} aria-hidden="true" />
            Compare scenarios
          </Link>
          <Link
            to="/scenarios"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-pv-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-pv-teal-hover"
          >
            <Plus size={18} aria-hidden="true" />
            New simulation
          </Link>
        </div>
      </div>

      {/* Latest simulated estimates */}
      <section aria-label="Latest simulated estimates" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                Latest simulated estimates
              </h2>
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-pv-info-bg px-2 text-xs font-medium text-pv-info">
                <Info size={14} aria-hidden="true" />
                Simulated estimate
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-pv-muted">
              Reduced mixing (rev 1, run R-0140) compared with Baseline operation (rev 3, run R-0139) · same 61,600 m³ and 5-day period
            </p>
          </div>
          <Link to="/compare" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-pv-teal hover:underline">
            Compare all scenarios
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <article key={card.title} className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-mint">
                  <card.icon size={20} className="text-pv-forest" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5 text-pv-ink">{card.title}</div>
                  <div className="text-xs leading-4 text-pv-muted">{card.subtitle}</div>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">{card.value}</span>
                <span className="text-sm font-medium text-pv-muted">{card.unit}</span>
              </div>
              <div>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-pv-ok-bg px-2 text-xs font-medium text-pv-ok-ink">
                  <ArrowDownRight size={14} aria-hidden="true" />
                  {card.delta}
                </span>
                <div className="mt-2 text-xs leading-4 text-pv-muted">{card.deltaNote}</div>
              </div>
              <div className="mt-auto border-t border-pv-hairline pt-4">
                <p className="text-xs leading-4 text-pv-muted">{card.footnote}</p>
              </div>
            </article>
          ))}

          {/* Environmental indicator — not estimable */}
          <article className="flex flex-col gap-4 rounded-xl border border-pv-border-soft bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-chip">
                <Sprout size={20} className="text-pv-muted" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5 text-pv-ink">Environmental indicator</div>
                <div className="text-xs leading-4 text-pv-muted">Downstream ecosystem stress</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CircleDashed size={20} className="shrink-0 text-pv-muted" aria-hidden="true" />
              <span className="text-lg font-semibold leading-[26px] text-pv-ink">Not estimable</span>
            </div>
            <div>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-chip px-2 text-xs font-medium text-pv-muted">
                Evidence gate not met
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-pv-hairline pt-4">
              <p className="text-xs leading-4 text-pv-muted">No validated local model yet</p>
              <Link to="/methodology" className="shrink-0 text-xs font-semibold text-pv-teal hover:underline">
                See evidence
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Chart + evidence */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[741fr_371fr]">
        <section aria-label="Change compared with baseline" className="rounded-xl border border-pv-divider bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-[26px] text-pv-ink">Change compared with baseline</h3>
              <p className="mt-1 text-xs leading-4 text-pv-muted">
                Percent change per metric · same volume, period, currency and grid factor
              </p>
            </div>
            <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-pv-border-soft bg-white px-4 text-sm font-semibold text-pv-ink">
              <Table size={16} aria-hidden="true" />
              View as table
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6 text-xs leading-4 text-pv-ink">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-pv-violet" aria-hidden="true" />
              Reduced mixing · rev 1 (R-0140)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-pv-ink" aria-hidden="true" />
              Baseline operation = 0
            </span>
          </div>

          <div className="mt-4">
            {CHART_ROWS.map((row) => (
              <div key={row.label} className="flex items-center">
                <div className="w-40 shrink-0 pr-3 text-sm font-medium leading-5 text-pv-ink">{row.label}</div>
                <div className="relative h-10 flex-1">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-pv-ink" aria-hidden="true" />
                  {typeof row.pct === 'number' ? (
                    <>
                      <span
                        className="absolute top-1/2 h-[18px] -translate-y-1/2 rounded-full bg-pv-violet"
                        style={{ right: '50%', width: `${(Math.abs(row.pct) / 10) * 50}%` }}
                        aria-hidden="true"
                      />
                      <span
                        className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold leading-4 text-pv-ink"
                        style={{ right: `calc(50% + ${(Math.abs(row.pct) / 10) * 50}% + 8px)` }}
                      >
                        −{Math.abs(row.pct)}%
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-x-0 top-1/2 flex h-9 -translate-y-1/2 items-center justify-center rounded-md border border-pv-input-border bg-pv-bg px-4 text-xs leading-4 text-pv-muted">
                      Not estimable · no validated local model
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center">
              <div className="w-40 shrink-0" />
              <div className="relative h-5 flex-1 text-xs leading-4 text-pv-muted">
                <span className="absolute left-0 top-1">−10%</span>
                <span className="absolute left-1/4 top-1 -translate-x-1/2">−5%</span>
                <span className="absolute left-1/2 top-1 -translate-x-1/2">0</span>
                <span className="absolute left-3/4 top-1 -translate-x-1/2">+5%</span>
                <span className="absolute right-0 top-1">+10%</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-4 text-pv-muted">
            Bars to the left are lower than the baseline. Lower energy, emissions and cost are generally better, but these are simulated estimates — not measured savings.
          </p>
        </section>

        <section aria-label="Evidence and assumptions" className="rounded-xl border border-pv-divider bg-white p-6">
          <h3 className="text-lg font-semibold leading-[26px] text-pv-ink">Evidence and assumptions</h3>
          <ul className="mt-4 space-y-3">
            {EVIDENCE.map((item) => (
              <li key={item.title} className="flex gap-3">
                <item.icon size={18} className={clsx('mt-0.5 shrink-0', item.tint)} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-5 text-pv-ink">{item.title}</div>
                  <div className="mt-0.5 text-xs leading-4 text-pv-muted">{item.sub}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/methodology"
            className="mt-4 inline-flex h-11 items-center rounded-lg border border-pv-border-soft bg-white px-4 text-sm font-semibold text-pv-ink transition-colors hover:bg-pv-bg"
          >
            View methodology
          </Link>
        </section>
      </div>

      {/* Recent simulations */}
      <section aria-label="Recent simulations" className="rounded-xl border border-pv-divider bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-[26px] text-pv-ink">Recent simulations</h3>
            <p className="mt-1 text-xs leading-4 text-pv-muted">
              Scenario status and their latest runs · values are simulated estimates for 1–5 Jan 2026
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_CHIPS.filter((chip) => counts[chip.status] > 0).map((chip) => (
              <StatChip
                key={chip.status}
                label={`${counts[chip.status]} ${chip.label}`}
                tone={chip.tone}
              />
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[216px]" />
              <col className="w-[132px]" />
              <col className="w-[151px]" />
              <col className="w-[119px]" />
              <col className="w-[110px]" />
              <col className="w-[98px]" />
              <col className="w-[117px]" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Scenario</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Revision · run</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Status</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Updated</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Energy</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">CO₂e</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3 text-left text-xs font-medium text-pv-muted">Operating cost</th>
                <th scope="col" className="border-b border-pv-divider bg-pv-bg px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {runs.map((row, index) => {
                const last = index === runs.length - 1;
                const cell = clsx('px-4 py-4 align-middle', !last && 'border-b border-pv-hairline');
                return (
                  <tr key={row.name}>
                    <td className={cell}>
                      <div className="text-sm font-medium leading-5 text-pv-ink">{row.name}</div>
                      <div className="mt-1 text-xs leading-4 text-pv-muted">{row.sub}</div>
                    </td>
                    <td className={clsx(cell, 'text-pv-ink')}>{row.revRun}</td>
                    <td className={cell}>
                      <StatusChip status={row.status} />
                    </td>
                    <td className={clsx(cell, 'text-pv-ink')}>{row.updated}</td>
                    {row.failedNote ? (
                      <td colSpan={3} className={clsx(cell, 'text-right text-pv-muted')}>
                        {row.failedNote}
                      </td>
                    ) : (
                      <>
                        <td className={clsx(cell, 'text-right text-pv-ink')}>
                          {row.energy ?? <span className="text-pv-muted">—</span>}
                        </td>
                        <td className={clsx(cell, 'text-right text-pv-ink')}>
                          {row.co2e ?? <span className="text-pv-muted">—</span>}
                        </td>
                        <td className={clsx(cell, 'text-right text-pv-ink')}>
                          {row.cost ?? <span className="text-pv-muted">—</span>}
                        </td>
                      </>
                    )}
                    <td className={clsx(cell, 'text-right')}>
                      {row.action.to ? (
                        <Link to={row.action.to} className="text-sm font-semibold text-pv-teal hover:underline">
                          {row.action.label}
                        </Link>
                      ) : (
                        <span className="text-xs leading-4 text-pv-muted">{row.action.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Next steps */}
      <section aria-label="Next steps" className="space-y-4">
        <h2 className="text-2xl font-semibold leading-8 tracking-[-0.24px] text-pv-ink">Next steps</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {NEXT_STEPS.map((step) => (
            <Link
              key={step.title}
              to={step.to}
              className="flex gap-4 rounded-xl border border-pv-divider bg-white p-6 transition-colors hover:border-pv-border-soft"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-mint">
                <step.icon size={20} className="text-pv-forest" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5 text-pv-ink">{step.title}</div>
                <p className="mt-1 text-sm leading-5 text-pv-muted">{step.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* S02 · Dashboard — empty workspace (frame 37:2). */
function EmptyWorkspace({ onLoadSamples }: { onLoadSamples: () => void }) {
  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
          <p className="mt-1 text-[14px] leading-5 text-pv-muted">
            Sample Water District · representative plant · no simulations yet
          </p>
        </div>
        <Link to="/scenarios" className={clsx(btnPrimary, 'shrink-0')}>
          <Plus size={18} aria-hidden="true" />
          New simulation
        </Link>
      </div>

      {/* Empty-state hero */}
      <section
        aria-label="Get started"
        className="flex flex-col items-center gap-6 rounded-xl border border-pv-divider bg-white px-8 py-12 shadow-pv-card"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pv-mint" aria-hidden="true">
          <SlidersHorizontal size={32} className="text-pv-forest" />
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
            Run your first simulation
          </h2>
          <p className="max-w-[560px] text-[14px] leading-5 text-pv-muted">
            Set up a scenario with your plant&apos;s inputs and assumptions, run the offline model, then
            compare the result with a baseline. Results are simulated estimates, not live plant data.
          </p>
        </div>
        <ol className="grid w-full max-w-[840px] grid-cols-1 gap-4 text-left md:grid-cols-3">
          {SETUP_STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl bg-pv-bg p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-pv-mint text-[14px] font-semibold leading-5 text-pv-forest">
                {index + 1}
              </span>
              <span className="text-[14px] font-semibold leading-5 text-pv-ink">{step.title}</span>
              <span className="text-[14px] leading-5 text-pv-muted">{step.body}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/scenarios" className={btnPrimary}>
            New simulation
          </Link>
          <button type="button" onClick={onLoadSamples} className={btnSecondary}>
            Load sample scenarios
          </button>
        </div>
      </section>

      {/* Key metrics — no results yet */}
      <section
        aria-label="Key metrics (no results yet)"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
      >
        {EMPTY_METRICS.map((metric) => (
          <div
            key={metric.title}
            className="flex flex-col gap-3 rounded-xl border border-dashed border-pv-border-soft bg-white p-6"
          >
            <div className="text-[14px] font-semibold leading-5 text-pv-ink">{metric.title}</div>
            <div className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-muted">—</div>
            <div className="text-[12px] leading-4 text-pv-muted">{metric.note}</div>
          </div>
        ))}
      </section>

      {/* Recent simulations — empty */}
      <section
        aria-label="Recent simulations"
        className="flex flex-col gap-2 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
      >
        <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Recent simulations</h2>
        <p className="text-[14px] leading-5 text-pv-muted">
          No scenarios or runs yet. Drafts and runs you create will be listed here with their status.
        </p>
      </section>
    </div>
  );
}

/* S03 · Dashboard — loading (frame 38:2). */
const LOADING_METRICS = [
  { icon: Zap, title: 'Energy consumption', subtitle: 'Electricity · pumps and mixers' },
  { icon: Cloud, title: 'CO₂e emissions', subtitle: 'Electricity-associated only' },
  { icon: Coins, title: 'Operating cost', subtitle: '5-day period · Philippine peso' },
  { icon: Sprout, title: 'Environmental indicator', subtitle: 'Downstream ecosystem stress' },
];

function SkeletonBar({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx('animate-pulse rounded-md bg-pv-chip', className)} />;
}

function LoadingWorkspace() {
  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
          <div role="status" className="flex items-center gap-2">
            <LoaderCircle size={16} className="shrink-0 animate-spin text-pv-teal" aria-hidden="true" />
            <p className="text-[14px] leading-5 text-pv-muted">Loading simulation summaries…</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/compare" className={btnSecondary}>
            Compare scenarios
          </Link>
          <Link to="/scenarios" className={btnPrimary}>
            New simulation
          </Link>
        </div>
      </div>

      {/* Latest simulated estimates — loading */}
      <section aria-label="Latest simulated estimates (loading)" className="flex flex-col gap-4">
        <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
          Latest simulated estimates
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_METRICS.map((card) => (
            <article
              key={card.title}
              className="flex min-h-[248px] flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-mint">
                  <card.icon size={20} className="text-pv-forest" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-5 text-pv-ink">{card.title}</div>
                  <div className="text-[12px] leading-4 text-pv-muted">{card.subtitle}</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <SkeletonBar className="h-7 w-[130px]" />
                <SkeletonBar className="h-4 w-[97px] rounded-full" />
              </div>
              <div className="mt-auto border-t border-pv-hairline pt-4">
                <p className="text-[12px] leading-4 text-pv-muted">Loading…</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Chart + evidence — loading */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[741fr_371fr]">
        <section
          aria-label="Change compared with baseline (loading)"
          className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
        >
          <SkeletonBar className="h-6 w-[277px] max-w-full" />
          <SkeletonBar className="h-3 w-[415px] max-w-full" />
          <div className="flex flex-col gap-4 pt-2">
            <SkeletonBar className="h-5 w-[484px] max-w-full" />
            <SkeletonBar className="h-5 w-[380px] max-w-full" />
            <SkeletonBar className="h-5 w-[429px] max-w-full" />
            <SkeletonBar className="h-9 w-full" />
          </div>
        </section>
        <section
          aria-label="Evidence and assumptions (loading)"
          className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
        >
          <SkeletonBar className="h-6 w-[192px]" />
          <SkeletonBar className="h-4 w-[289px] max-w-full" />
          <SkeletonBar className="h-4 w-[257px] max-w-full" />
          <SkeletonBar className="h-4 w-[273px] max-w-full" />
          <SkeletonBar className="h-4 w-[224px] max-w-full" />
        </section>
      </div>

      {/* Recent simulations — loading */}
      <section
        aria-label="Recent simulations (loading)"
        className="rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
      >
        <div className="pb-2">
          <SkeletonBar className="h-6 w-[220px]" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1086px]">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[330px_165px_165px_165px_165px] items-center gap-6 border-b border-pv-hairline py-4 last:border-b-0"
              >
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-6 rounded-full" />
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* Load failure — no Figma frame exists; kept to the established card language. */
function WorkspaceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
        <p className="mt-1 text-sm leading-5 text-pv-muted">
          Sample Water District · representative plant
        </p>
      </div>
      <section
        aria-label="Workspace failed to load"
        className="flex flex-col items-center gap-6 rounded-xl border border-pv-divider bg-white px-8 py-12 shadow-pv-card"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pv-err-bg" aria-hidden="true">
          <CircleX size={32} className="text-pv-err-field" />
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
            Couldn&apos;t load your workspace
          </h2>
          <p className="max-w-[560px] text-[14px] leading-5 text-pv-muted">
            The dashboard data request failed. Your scenarios and runs are not affected. Check the
            connection and try again.
          </p>
        </div>
        <button type="button" onClick={onRetry} className={btnPrimary}>
          Retry loading
        </button>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const preview = import.meta.env.DEV ? searchParams.get('preview') : null;
  const workspace = useQuery({ queryKey: ['workspace', 'dashboard'], queryFn: fetchDashboardWorkspace });

  const clearPreview = () => {
    if (preview === null) return;
    const next = new URLSearchParams(searchParams);
    next.delete('preview');
    setSearchParams(next, { replace: true });
  };

  const reload = () => {
    clearPreview();
    void queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard'] });
  };

  const loadSamples = () => {
    loadSampleWorkspace();
    reload();
  };

  const runs = workspace.data?.runs ?? [];
  const showLoading = preview === 'loading' || workspace.isPending;
  const showError = preview === 'error' || workspace.isError;
  const showEmpty = !showLoading && !showError && (preview === 'empty' || runs.length === 0);

  return (
    <>
      {showLoading ? (
        <LoadingWorkspace />
      ) : showError ? (
        <WorkspaceError onRetry={reload} />
      ) : showEmpty ? (
        <EmptyWorkspace onLoadSamples={loadSamples} />
      ) : (
        <PopulatedDashboard runs={runs} />
      )}
      {import.meta.env.DEV && (
        <DevStatePreview
          options={[
            { value: 'empty', label: 'Empty workspace' },
            { value: 'loading', label: 'Loading' },
            { value: 'error', label: 'Load error' },
          ]}
        />
      )}
    </>
  );
}
