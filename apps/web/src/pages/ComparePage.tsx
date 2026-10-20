import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleX,
  GitCompareArrows,
  LoaderCircle,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';
import DevStatePreview from '../components/dev/DevStatePreview';
import {
  fetchCompareWorkspace,
  type CompareRun,
  type IncompatibleRun,
  type RunningCandidate,
} from '../services/workspace';

/* U11 · Scenario comparison — frame 33:2 (populated) · S04 · missing or
   incompatible data — frame 41:2. The state is derived from which runs are
   selected; the dev preview can force S04 for visual review. */

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';

const COMPATIBILITY = [
  '✓ Same treated volume · 61,600 m³',
  '✓ Same period · 1–5 Jan 2026',
  '✓ Same currency · PHP',
  '✓ Same grid factor · Luzon–Visayas 0.7122',
  '✓ Same boundary · electricity only',
];

type ValueCell =
  | { kind: 'plain'; value: string }
  | { kind: 'muted'; text: string }
  | { kind: 'delta'; value: string; delta: string; arrow?: boolean }
  | { kind: 'note'; value: string; note: string };

type MetricRow = {
  label: string;
  cells: Record<string, ValueCell>;
};

const METRIC_ROWS: MetricRow[] = [
  {
    label: 'Energy consumption (kWh)',
    cells: {
      'R-0139': { kind: 'plain', value: '24,645' },
      'R-0142': { kind: 'delta', value: '23,049', delta: '−1,596 · 6.5% lower', arrow: true },
      'R-0140': { kind: 'delta', value: '23,676', delta: '−969 · 3.9% lower', arrow: true },
    },
  },
  {
    label: 'Energy intensity (kWh/m³)',
    cells: {
      'R-0139': { kind: 'plain', value: '0.400' },
      'R-0142': { kind: 'delta', value: '0.374', delta: '−0.026' },
      'R-0140': { kind: 'delta', value: '0.384', delta: '−0.016' },
    },
  },
  {
    label: 'CO₂e emissions (kg CO₂e)',
    cells: {
      'R-0139': { kind: 'plain', value: '17,552' },
      'R-0142': { kind: 'delta', value: '16,415', delta: '−1,137 · 6.5% lower', arrow: true },
      'R-0140': { kind: 'delta', value: '16,862', delta: '−690 · 3.9% lower', arrow: true },
    },
  },
  {
    label: 'Operating cost (₱)',
    cells: {
      'R-0139': { kind: 'plain', value: '342,259' },
      'R-0142': { kind: 'delta', value: '329,163', delta: '−13,096 · 3.8% lower', arrow: true },
      'R-0140': { kind: 'delta', value: '331,600', delta: '−10,659 · 3.1% lower', arrow: true },
    },
  },
  {
    label: 'Cost per m³ (₱)',
    cells: {
      'R-0139': { kind: 'plain', value: '5.56' },
      'R-0142': { kind: 'delta', value: '5.34', delta: '−0.22' },
      'R-0140': { kind: 'delta', value: '5.38', delta: '−0.18' },
    },
  },
  {
    label: 'Coagulant use (kg)',
    cells: {
      'R-0139': { kind: 'plain', value: '203.3' },
      'R-0142': { kind: 'delta', value: '172.5', delta: '−30.8 · 15.2% lower', arrow: true },
      'R-0140': { kind: 'note', value: '203.3', note: 'No change' },
    },
  },
  {
    label: 'Simple payback (illustrative)',
    cells: {
      'R-0139': { kind: 'muted', text: 'Reference' },
      'R-0142': { kind: 'note', value: '≈ 1.9 years', note: '₱1.8M assumed capital' },
      'R-0140': { kind: 'muted', text: 'No capital cost' },
    },
  },
];

const CHANGE_BARS: {
  label: string;
  bars: Record<string, { pct: string; width: string; barClass: string }>;
}[] = [
  {
    label: 'Energy use',
    bars: {
      'R-0142': { pct: '−6.5%', width: '64.44%', barClass: 'bg-pv-teal' },
      'R-0140': { pct: '−3.9%', width: '38.66%', barClass: 'bg-pv-violet' },
    },
  },
  {
    label: 'CO₂e emissions',
    bars: {
      'R-0142': { pct: '−6.5%', width: '64.44%', barClass: 'bg-pv-teal' },
      'R-0140': { pct: '−3.9%', width: '38.66%', barClass: 'bg-pv-violet' },
    },
  },
  {
    label: 'Operating cost',
    bars: {
      'R-0142': { pct: '−3.8%', width: '37.67%', barClass: 'bg-pv-teal' },
      'R-0140': { pct: '−3.1%', width: '30.73%', barClass: 'bg-pv-violet' },
    },
  },
];

const CHANGE_LEGEND = [
  { runId: 'R-0142', label: 'Pax Silica pilot', swatchClass: 'bg-pv-teal' },
  { runId: 'R-0140', label: 'Reduced mixing', swatchClass: 'bg-pv-violet' },
];

const TOTALS: {
  title: string;
  rows: { runId: string; value: string; width: string; barClass: string }[];
}[] = [
  {
    title: 'Energy (kWh)',
    rows: [
      { runId: 'R-0139', value: '24,645', width: '100%', barClass: 'bg-pv-ink' },
      { runId: 'R-0142', value: '23,049', width: '93.5%', barClass: 'bg-pv-teal' },
      { runId: 'R-0140', value: '23,676', width: '96.1%', barClass: 'bg-pv-violet' },
    ],
  },
  {
    title: 'Operating cost (₱)',
    rows: [
      { runId: 'R-0139', value: '342,259', width: '100%', barClass: 'bg-pv-ink' },
      { runId: 'R-0142', value: '329,163', width: '96.2%', barClass: 'bg-pv-teal' },
      { runId: 'R-0140', value: '331,600', width: '96.9%', barClass: 'bg-pv-violet' },
    ],
  },
];

const TRADE_OFFS = [
  {
    runIds: ['R-0142'],
    title: 'Pax Silica pilot',
    accent: 'border-pv-teal',
    body: 'Lower mixer power and less coagulant cut electricity by ₱17,556 and chemicals by ₱1,540. The assumed material adds ₱6,000, so the net saving is ₱13,096 for the period.',
    note: 'Trade-off: depends on an unverified specification and ₱1.8M assumed capital.',
    noteClass: 'text-pv-warn-ink',
  },
  {
    runIds: ['R-0140'],
    title: 'Reduced mixing',
    accent: 'border-pv-violet',
    body: 'Running mixers at 80% load saves 969 kWh and ₱10,659 with no new equipment or material.',
    note: "Trade-off: gentler mixing may affect floc formation. Water quality isn't modeled — check with jar tests.",
    noteClass: 'text-pv-warn-ink',
  },
  {
    runIds: ['R-0142', 'R-0140'],
    title: 'Both scenarios',
    accent: 'border-pv-ink',
    body: 'Pump energy (19,800 kWh) is unchanged and is 80–86% of electricity use, so pumping is the bigger lever for future scenarios.',
    note: "Ecosystem effects can't be compared until the indicator becomes estimable.",
    noteClass: 'text-pv-muted',
  },
];

function MetricCell({ cell }: { cell: ValueCell }) {
  if (cell.kind === 'plain') {
    return <span className="block text-[14px] leading-5 text-pv-ink">{cell.value}</span>;
  }
  if (cell.kind === 'muted') {
    return <span className="block text-[14px] leading-5 text-pv-muted">{cell.text}</span>;
  }
  if (cell.kind === 'delta') {
    return (
      <>
        <span className="block text-[14px] font-semibold leading-5 text-pv-ink">{cell.value}</span>
        <span className="flex items-center gap-1 text-[12px] font-medium leading-4 text-pv-ok-ink">
          {cell.arrow && <ArrowDownRight size={14} aria-hidden="true" />}
          {cell.delta}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="block text-[14px] font-semibold leading-5 text-pv-ink">{cell.value}</span>
      <span className="block text-[12px] leading-4 text-pv-muted">{cell.note}</span>
    </>
  );
}

function PopulatedCompare({ runs, onRemove }: { runs: CompareRun[]; onRemove: (id: string) => void }) {
  const colWidths =
    runs.length === 3 ? [26, 20.9, 26.55, 26.55] : [26, ...runs.map(() => 74 / runs.length)];
  const selectedIds = runs.map((run) => run.id);
  const interventions = runs.filter((run) => run.kind === 'intervention');
  const tradeOffs = TRADE_OFFS.filter((column) =>
    column.runIds.every((id) => selectedIds.includes(id)),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page head */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              Compare scenarios
            </h1>
            <Chip tone="info">Simulated estimates</Chip>
          </div>
          <p className="text-[14px] leading-5 text-pv-muted">
            Baseline and alternatives for the same plant, volume, period and boundaries · Sample Water
            District · 1–5 Jan 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/reports" className={btnSecondary}>
            Add comparison to report
          </Link>
          <Link to="/recommendations" className={btnPrimary}>
            View recommendations
          </Link>
        </div>
      </div>

      {/* Runs being compared */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => (
          <article
            key={run.id}
            className="flex items-center gap-3 rounded-xl border border-pv-divider bg-white py-4 pl-5 pr-4 shadow-pv-card"
          >
            <span className={clsx('h-10 w-3 shrink-0 rounded-[4px]', run.strip)} aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span className="w-full text-[14px] font-semibold leading-5 text-pv-ink">
                {run.name}
              </span>
              <span className="w-full text-[12px] leading-4 text-pv-muted">{run.cardSub}</span>
              <Chip tone={run.pill.tone}>{run.pill.label}</Chip>
            </div>
            <button
              type="button"
              aria-label={`Remove ${run.name} from comparison`}
              onClick={() => onRemove(run.id)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-pv-muted transition-colors hover:bg-pv-bg"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      {/* Compatibility banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-pv-ok-border bg-pv-ok-bg p-4">
        <div className="flex items-start gap-3">
          <CircleCheck size={20} className="shrink-0 text-pv-ev-green" aria-hidden="true" />
          <p className="text-[14px] font-semibold leading-5 text-pv-ok-ink">
            Compatible comparison — differences are like for like
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 pl-8 text-[12px] leading-4 text-pv-ok-ink">
          {COMPATIBILITY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Results side by side */}
      <section
        aria-label="Results side by side"
        className="flex flex-col overflow-hidden rounded-xl border border-pv-divider bg-white shadow-pv-card"
      >
        <div className="flex flex-col gap-1 px-6 pb-4 pt-6">
          <h2 className={H2}>Results side by side</h2>
          <p className="text-[12px] leading-4 text-pv-muted">
            Differences are against the baseline. Green text with a down arrow means lower than the
            baseline.
          </p>
        </div>
        <div className="overflow-x-auto pv-scroll">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="h-14 border-b border-pv-divider bg-pv-bg px-4 align-bottom text-[12px] font-medium leading-4 text-pv-muted">
                  <span className="block">Metric (unit)</span>
                </th>
                {runs.map((run) => (
                  <th
                    key={run.id}
                    className="h-14 border-b border-pv-divider bg-pv-bg px-4 align-bottom text-[12px] font-medium leading-4 text-pv-muted"
                  >
                    <span className="block">{run.name}</span>
                    <span className="block font-normal">{run.id}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="h-[61px] border-b border-pv-divider bg-white px-4 py-3 align-bottom text-[14px] font-medium leading-4 text-pv-ink"
                  >
                    {row.label}
                  </th>
                  {runs.map((run) => (
                    <td key={run.id} className="border-b border-pv-hairline px-4 py-3 align-top">
                      <MetricCell cell={row.cells[run.id]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th
                  scope="row"
                  className="h-12 border-b border-pv-divider bg-white px-4 py-3 align-bottom text-[14px] font-medium leading-4 text-pv-ink"
                >
                  Downstream ecosystem stress
                </th>
                {runs.map((run) => (
                  <td key={run.id} className="px-4 py-3 align-top">
                    <Chip tone="neutral">Not estimable</Chip>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Change chart and totals */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
        <SectionCard className="gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Change compared with baseline</h2>
            <p className="text-[12px] leading-4 text-pv-muted">
              Percent change · bars to the left are lower than the baseline
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {CHANGE_LEGEND.filter((entry) => selectedIds.includes(entry.runId)).map((entry) => (
              <span key={entry.runId} className="flex items-center gap-2 text-[12px] leading-4 text-pv-ink">
                <span className={clsx('h-3 w-3 shrink-0 rounded-[2px]', entry.swatchClass)} />
                {entry.label}
              </span>
            ))}
            <span className="flex items-center gap-2 text-[12px] leading-4 text-pv-ink">
              <span className="h-0.5 w-3 shrink-0 bg-pv-ink" />
              Baseline = 0
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {CHANGE_BARS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] items-center"
              >
                <span className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</span>
                <div className="flex flex-col gap-1 border-r-2 border-pv-ink py-1">
                  {interventions.map((run) => {
                    const bar = row.bars[run.id];
                    return (
                      <span key={run.id} className="flex items-center justify-end gap-2">
                        <span className="text-[12px] font-semibold leading-4 text-pv-ink">
                          {bar.pct}
                        </span>
                        <span
                          className={clsx('h-4 shrink-0 rounded-l-[3px]', bar.barClass)}
                          style={{ width: bar.width }}
                          aria-hidden="true"
                        />
                      </span>
                    );
                  })}
                </div>
                <div aria-hidden="true" />
              </div>
            ))}
            <div className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] items-center">
              <span className="text-[14px] font-medium leading-5 text-pv-ink">Ecosystem stress</span>
              <div className="col-span-2 flex h-10 min-w-0 items-center justify-center rounded-md border-2 border-dashed border-pv-input-border bg-pv-bg text-[12px] leading-4 text-pv-muted">
                Not estimable for any scenario
              </div>
            </div>
            <div className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]">
              <div aria-hidden="true" />
              <div className="flex items-center justify-between text-[12px] leading-4 text-pv-muted">
                <span>−10%</span>
                <span>−5%</span>
                <span>0</span>
              </div>
              <div className="flex items-center justify-between text-[12px] leading-4 text-pv-muted">
                <span>+5%</span>
                <span>+10%</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="gap-5">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Totals on a common scale</h2>
            <p className="text-[12px] leading-4 text-pv-muted">
              Bars start at zero, so small differences look small
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {TOTALS.map((group) => (
              <div key={group.title} className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold leading-5 text-pv-ink">{group.title}</p>
                <div className="flex flex-col gap-1">
                  {group.rows
                    .filter((row) => selectedIds.includes(row.runId))
                    .map((row) => (
                      <div
                        key={row.runId}
                        className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-2"
                      >
                        <span
                          className={clsx('h-4 rounded-[3px]', row.barClass)}
                          style={{ width: row.width }}
                          aria-hidden="true"
                        />
                        <span className="text-[12px] leading-4 text-pv-ink">{row.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Trade-offs */}
      <SectionCard className="gap-4">
        <h2 className={H2}>What drives the difference — and the trade-offs</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tradeOffs.map((column) => (
            <div
              key={column.title}
              className={clsx('flex flex-col gap-2 border-t-[3px] pt-3', column.accent)}
            >
              <p className="text-[14px] font-semibold leading-5 text-pv-ink">{column.title}</p>
              <p className="text-[14px] leading-5 text-pv-ink">{column.body}</p>
              <p className={clsx('text-[12px] leading-4', column.noteClass)}>{column.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Comparison actions */}
      <section
        aria-label="Comparison actions"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card"
      >
        <Link to="/results" className={btnSecondary}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to results
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/reports" className={btnSecondary}>
            Add comparison to report
          </Link>
          <Link to="/recommendations" className={btnPrimary}>
            View recommendations
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* S04 · Compare — missing or incompatible data (frame 41:2). */
function MissingDataCompare({
  remaining,
  candidates,
  running,
  incompatible,
  onAdd,
}: {
  remaining: CompareRun[];
  candidates: CompareRun[];
  running: RunningCandidate;
  incompatible: IncompatibleRun;
  onAdd: (id: string) => void;
}) {
  const addSpan = clsx(
    remaining.length === 0 && 'sm:col-span-2 lg:col-span-3',
    remaining.length === 1 && 'lg:col-span-2',
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page head */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
          Compare scenarios
        </h1>
        <p className="text-[14px] leading-5 text-pv-muted">
          Baseline and alternatives for the same plant, volume, period and boundaries
        </p>
      </div>

      {/* Runs being compared */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {remaining.map((run) => (
          <article
            key={run.id}
            className="flex items-center gap-3 rounded-xl border border-pv-divider bg-white py-4 pl-5 pr-4 shadow-pv-card"
          >
            <span className={clsx('h-10 w-3 shrink-0 rounded-[4px]', run.strip)} aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span className="w-full text-[14px] font-semibold leading-5 text-pv-ink">
                {run.name}
              </span>
              <span className="w-full text-[12px] leading-4 text-pv-muted">{run.missingSub}</span>
              <Chip tone={run.pill.tone}>{run.pill.label}</Chip>
            </div>
          </article>
        ))}
        <Link
          to="/scenarios"
          className={clsx(
            'flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pv-border-soft bg-white px-4 py-6 transition-colors hover:border-pv-teal sm:py-0',
            addSpan,
          )}
        >
          <Plus size={20} className="shrink-0 text-pv-teal" aria-hidden="true" />
          <span className="text-[14px] font-semibold leading-5 text-pv-teal">
            Add a run to compare · up to 3
          </span>
        </Link>
      </div>

      {/* Candidate runs + incompatible run */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section
          aria-label="Add another run to compare"
          className="flex flex-col gap-2 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
        >
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-mint">
              <GitCompareArrows size={24} className="text-pv-forest" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Add another run to compare
              </h2>
              <p className="max-w-[446px] text-[14px] leading-5 text-pv-muted">
                A comparison needs at least two completed runs with the same volume, period, currency
                and grid factor. These runs match the baseline:
              </p>
            </div>
          </div>
          {candidates.map((run) => (
            <div
              key={run.id}
              className="flex items-center gap-4 border-b border-pv-hairline py-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                  {`${run.name} · ${run.id}`}
                </span>
                <span className="text-[12px] leading-4 text-pv-muted">{run.candidateSub}</span>
              </div>
              <Chip tone="ok">Compatible</Chip>
              <button type="button" onClick={() => onAdd(run.id)} className={btnSecondary}>
                Add
              </button>
            </div>
          ))}
          <div className="flex items-center gap-4 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14px] font-semibold leading-5 text-pv-ink">{running.title}</span>
              <span className="text-[12px] leading-4 text-pv-muted">{running.sub}</span>
            </div>
            <Chip tone="run">Running</Chip>
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-pv-divider bg-pv-bg px-4 text-[14px] font-semibold leading-5 text-[#6B7A74]"
            >
              Add when done
            </button>
          </div>
        </section>

        <section
          aria-label={incompatible.title}
          className="flex flex-col gap-4 rounded-xl border border-pv-warn-border bg-white p-6 shadow-pv-card"
        >
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-warn-bg">
              <TriangleAlert size={24} className="text-pv-amber" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                {incompatible.title}
              </h2>
              <p className="max-w-[446px] text-[14px] leading-5 text-pv-muted">
                {incompatible.body}
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {incompatible.differences.map((row) => (
              <li key={row.label} className="flex gap-2">
                {row.ok ? (
                  <CircleCheck size={18} className="mt-0.5 shrink-0 text-pv-ev-green" aria-hidden="true" />
                ) : (
                  <CircleX size={18} className="mt-0.5 shrink-0 text-pv-err-field" aria-hidden="true" />
                )}
                <span className="text-[14px] leading-5 text-pv-ink">
                  <strong className="font-semibold">{row.label}:</strong> {row.rest}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[14px] leading-5 text-pv-muted">{incompatible.advice}</p>
          <div>
            <Link to="/scenarios" className={btnSecondary}>
              Re-run for 1–5 Jan 2026
            </Link>
          </div>
        </section>
      </div>

      {/* Nothing to compare yet */}
      <section className="flex flex-col items-center gap-2 rounded-xl border border-pv-divider bg-white px-6 py-12 text-center shadow-pv-card">
        <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Nothing to compare yet</h2>
        <p className="max-w-[520px] text-[14px] leading-5 text-pv-muted">
          The side-by-side table and charts appear once two compatible runs are selected.
        </p>
      </section>
    </div>
  );
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const preview = import.meta.env.DEV ? searchParams.get('preview') : null;
  const compare = useQuery({ queryKey: ['workspace', 'compare'], queryFn: fetchCompareWorkspace });
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const devBar = import.meta.env.DEV ? (
    <DevStatePreview options={[{ value: 'missing', label: 'Missing data' }]} />
  ) : null;

  const data = compare.data;

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
            Compare scenarios
          </h1>
          {compare.isError ? (
            <p className="text-[14px] leading-5 text-pv-muted">
              The comparison data request failed. Your runs are not affected.
            </p>
          ) : (
            <div role="status" className="flex items-center gap-2">
              <LoaderCircle size={16} className="shrink-0 animate-spin text-pv-teal" aria-hidden="true" />
              <p className="text-[14px] leading-5 text-pv-muted">Loading comparison workspace…</p>
            </div>
          )}
        </div>
        {compare.isError && (
          <section className="flex flex-col items-center gap-4 rounded-xl border border-pv-divider bg-white px-6 py-12 text-center shadow-pv-card">
            <CircleX size={28} className="text-pv-err-field" aria-hidden="true" />
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Couldn&apos;t load the comparison
            </h2>
            <button
              type="button"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['workspace', 'compare'] })}
              className={btnSecondary}
            >
              Retry loading
            </button>
          </section>
        )}
        {devBar}
      </div>
    );
  }

  const defaultIds = data.runs.map((run) => run.id);
  const liveSelection = selectedIds ?? defaultIds;
  const selection = preview === 'missing' ? [data.baselineId] : liveSelection;
  const selectedRuns = data.runs.filter((run) => selection.includes(run.id));
  const candidates = data.runs.filter((run) => !selection.includes(run.id));
  const populated = selection.includes(data.baselineId) && selectedRuns.length >= 2;

  return (
    <>
      {populated ? (
        <PopulatedCompare
          runs={selectedRuns}
          onRemove={(id) => setSelectedIds(liveSelection.filter((runId) => runId !== id))}
        />
      ) : (
        <MissingDataCompare
          remaining={selectedRuns}
          candidates={candidates}
          running={data.running}
          incompatible={data.incompatible}
          onAdd={(id) => setSelectedIds(Array.from(new Set([...liveSelection, id])))}
        />
      )}
      {devBar}
    </>
  );
}
