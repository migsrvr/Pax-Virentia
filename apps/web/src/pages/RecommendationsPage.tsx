import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, CircleCheck } from 'lucide-react';
import { Chip, btnPrimary, btnSecondary } from './scenarios/shared';
import type { ChipTone } from './scenarios/shared';

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';

type Category = 'All' | 'Energy' | 'Cost' | 'Scenario' | 'Evidence';
type TagCategory = Exclude<Category, 'All'>;

const CATEGORIES: { label: Category; count: number }[] = [
  { label: 'All', count: 6 },
  { label: 'Energy', count: 2 },
  { label: 'Cost', count: 1 },
  { label: 'Scenario', count: 1 },
  { label: 'Evidence', count: 2 },
];

const TAG_TONES: Record<TagCategory, ChipTone> = {
  Energy: 'mint',
  Cost: 'mint',
  Scenario: 'violet',
  Evidence: 'info',
};

type Metric = { label: string; value: string; tone: 'ok' | 'muted' };

type RecList = { title: string; tone: 'ink' | 'warn'; items: string[] };

type Rec = {
  id: number;
  priority: 'High' | 'Medium' | 'Low';
  category: TagCategory;
  linked: string;
  title: string;
  body: string;
  chip?: boolean;
  metrics: Metric[];
  metricCols: 1 | 3 | 4;
  lists?: RecList[];
  actions: { label: string; to?: string }[];
};

const RECS: Rec[] = [
  {
    id: 1,
    priority: 'High',
    category: 'Energy',
    linked: 'Linked scenario: Reduced mixing · R-0140',
    title: '1. Lower the mixing load from 1.00 to 0.80',
    body: 'Mixers run at full rated power for 95 hours. Running them at 0.80 load — inside the supported 0.60–1.00 range — cuts mixer energy by a fifth.',
    chip: true,
    metrics: [
      { label: 'Energy', value: '−969 kWh · 3.9% lower', tone: 'ok' },
      { label: 'CO₂e', value: '−690 kg', tone: 'ok' },
      { label: 'Operating cost', value: '−₱10,659 per 5 days', tone: 'ok' },
    ],
    metricCols: 3,
    lists: [
      {
        title: 'Assumptions',
        tone: 'ink',
        items: ['Mixer power 51 kW (spec v1.1, assumed)', 'Same 95 mixing hours and ₱11.00/kWh tariff'],
      },
      {
        title: 'Limitations',
        tone: 'warn',
        items: ["Floc formation and treated-water quality aren't modeled", 'Confirm with jar tests before changing operations'],
      },
    ],
    actions: [
      { label: 'View comparison', to: '/compare' },
      { label: 'Simulate this change', to: '/scenarios' },
    ],
  },
  {
    id: 2,
    priority: 'Medium',
    category: 'Scenario',
    linked: 'Linked scenario: Pax Silica pilot · R-0142',
    title: '2. Evaluate Pax Silica once its specification is verified',
    body: 'The pilot shows the largest modeled reductions of the scenarios run so far, but every one of them depends on an unverified specification.',
    chip: true,
    metrics: [
      { label: 'Energy', value: '−1,596 kWh · 6.5%', tone: 'ok' },
      { label: 'CO₂e', value: '−1,137 kg', tone: 'ok' },
      { label: 'Operating cost', value: '−₱13,096 per 5 days', tone: 'ok' },
      { label: 'Payback · illustrative', value: '≈ 1.9 years', tone: 'muted' },
    ],
    metricCols: 4,
    lists: [
      {
        title: 'Assumptions',
        tone: 'ink',
        items: ['Spec v0.4: 38 kW mixers, 0.90 load, 2.8 mg/L dose', '₱6,000 material per period · ₱1.8M capital'],
      },
      {
        title: 'Limitations',
        tone: 'warn',
        items: ['Specification unverified — confirm equipment behavior with a technical source', 'Payback scales a 5-day result to a year'],
      },
    ],
    actions: [
      { label: 'View results', to: '/results' },
      { label: 'Simulate this change', to: '/scenarios' },
    ],
  },
  {
    id: 3,
    priority: 'Medium',
    category: 'Cost',
    linked: 'Linked scenario: Baseline operation · R-0139',
    title: '3. Trim the coagulant dose from 3.3 to 3.0 mg/L',
    body: 'Dose sets chemical use directly: 0.3 mg/L less across 61,600 m³ is 18.5 kg less coagulant for the period.',
    chip: true,
    metrics: [
      { label: 'Coagulant', value: '−18.5 kg', tone: 'ok' },
      { label: 'Operating cost', value: '−₱924 per 5 days', tone: 'ok' },
      { label: 'Energy and CO₂e', value: 'No modeled change', tone: 'muted' },
    ],
    metricCols: 3,
    lists: [
      {
        title: 'Assumptions',
        tone: 'ink',
        items: ['Coagulant price ₱50/kg (assumed)', '3.0 mg/L is inside the 1.5–4.5 mg/L range'],
      },
      {
        title: 'Limitations',
        tone: 'warn',
        items: ["Treatment quality isn't modeled", 'Check turbidity with jar tests and lab results first'],
      },
    ],
    actions: [{ label: 'Simulate this change', to: '/scenarios' }],
  },
  {
    id: 4,
    priority: 'Low',
    category: 'Energy',
    linked: 'Linked scenario: Baseline operation · R-0139',
    title: '4. Reduce pump duty from 120 to 119 hours',
    body: 'At 520 m³/h, 119 hours still delivers 61,880 m³ — enough for the 61,600 m³ volume.',
    chip: true,
    metrics: [
      { label: 'Energy', value: '−165 kWh · 0.7% lower', tone: 'ok' },
      { label: 'CO₂e', value: '−118 kg', tone: 'ok' },
      { label: 'Operating cost', value: '−₱1,815 per 5 days', tone: 'ok' },
    ],
    metricCols: 3,
    lists: [
      {
        title: 'Assumptions',
        tone: 'ink',
        items: ['Constant 165 kW pump power (no load curve)', 'Flow stays at 520 m³/h'],
      },
      {
        title: 'Limitations',
        tone: 'warn',
        items: ["Storage and demand peaks aren't simulated", 'Check reservoir levels before shortening runs'],
      },
    ],
    actions: [{ label: 'Simulate this change', to: '/scenarios' }],
  },
  {
    id: 5,
    priority: 'Medium',
    category: 'Evidence',
    linked: 'Affects every run',
    title: '5. Replace the carried-forward grid emission factor',
    body: "All runs use the DOE 2023 Luzon–Visayas value as an assumed 2026 factor. Load the published 2026 factor when it's available, then re-run.",
    metrics: [{ label: 'Benefit', value: 'More accurate CO₂e estimates · no modeled saving', tone: 'muted' }],
    metricCols: 1,
    actions: [{ label: 'Open emission factors', to: '/methodology' }],
  },
  {
    id: 6,
    priority: 'Low',
    category: 'Evidence',
    linked: 'Environmental indicator',
    title: '6. Collect paired ecological observations',
    body: 'Downstream ecosystem stress is not estimable without local data. A defined target, paired observations and an independent validation would let the model report it.',
    metrics: [
      { label: 'Benefit', value: 'Makes the ecosystem indicator estimable · no modeled saving', tone: 'muted' },
    ],
    metricCols: 1,
    actions: [{ label: "Read why it's not estimable", to: '/methodology' }],
  },
];

const NOT_CONSIDERED = [
  'Treated-water quality',
  'Equipment wear and safety',
  'Time-of-use tariffs',
  'Financing costs',
];

function MetricBox({ metric }: { metric: Metric }) {
  const toneClass = metric.tone === 'ok' ? 'text-pv-ok-ink' : 'text-pv-muted';
  return (
    <div
      className={clsx(
        'flex flex-col gap-1 rounded-xl px-4 py-3',
        metric.tone === 'ok' ? 'bg-pv-ok-bg' : 'bg-pv-bg',
      )}
    >
      <span className={clsx('text-[12px] leading-4', toneClass)}>{metric.label}</span>
      <span className={clsx('text-[14px] font-semibold leading-5', toneClass)}>{metric.value}</span>
    </div>
  );
}

function RecCard({
  rec,
  reviewed,
  onToggleReviewed,
}: {
  rec: Rec;
  reviewed: boolean;
  onToggleReviewed: () => void;
}) {
  const meta = (
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={rec.priority === 'High' ? 'run' : 'neutral'}>{rec.priority} priority</Chip>
      <Chip tone={TAG_TONES[rec.category]}>{rec.category}</Chip>
      <span className="text-[12px] leading-4 text-pv-muted">{rec.linked}</span>
    </div>
  );
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
      {rec.chip ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {meta}
            <h2 className={H2}>{rec.title}</h2>
          </div>
          <Chip tone="info">Simulated estimate</Chip>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {meta}
          <h2 className={H2}>{rec.title}</h2>
        </div>
      )}

      <p className="text-[14px] leading-5 text-pv-ink">{rec.body}</p>

      {rec.metricCols === 1 ? (
        <div className="flex flex-col items-start">
          <MetricBox metric={rec.metrics[0]} />
        </div>
      ) : (
        <div
          className={clsx(
            'grid grid-cols-1 gap-4 sm:grid-cols-2',
            rec.metricCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          {rec.metrics.map((metric) => (
            <MetricBox key={`${metric.label}-${metric.value}`} metric={metric} />
          ))}
        </div>
      )}

      {rec.lists ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {rec.lists.map((list) => (
            <div key={list.title} className="flex flex-col gap-2">
              <span
                className={clsx(
                  'text-[14px] font-semibold leading-5',
                  list.tone === 'warn' ? 'text-pv-warn-ink' : 'text-pv-ink',
                )}
              >
                {list.title}
              </span>
              <ul className="flex flex-col gap-1 pl-5 text-[14px] leading-5 text-pv-muted">
                {list.items.map((item) => (
                  <li key={item} className="relative">
                    <span aria-hidden="true" className="absolute -left-5">
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center gap-4 border-t border-pv-hairline pt-4">
        {rec.actions.map((action) =>
          action.to ? (
            <Link key={action.label} to={action.to} className={btnSecondary}>
              {action.label}
            </Link>
          ) : null,
        )}
        <button
          type="button"
          aria-pressed={reviewed}
          onClick={onToggleReviewed}
          className={clsx(
            'inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-semibold leading-5 transition-colors hover:bg-pv-bg',
            reviewed ? 'text-pv-ok-ink' : 'text-pv-teal',
          )}
        >
          {reviewed ? <CircleCheck size={18} aria-hidden="true" /> : null}
          {reviewed ? 'Reviewed' : 'Mark reviewed'}
        </button>
      </footer>
    </article>
  );
}

export default function RecommendationsPage() {
  const [filter, setFilter] = useState<Category>('All');
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const visible = filter === 'All' ? RECS : RECS.filter((rec) => rec.category === filter);
  const pct = Math.round((reviewedIds.size / RECS.length) * 100);

  const toggleReviewed = (id: number) => {
    setReviewedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[760px] flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
            Recommendations
          </h1>
          <p className="text-[14px] leading-5 text-pv-muted">
            Suggestions from the baseline run R-0139 and the scenarios run so far. Each benefit is a
            simulated estimate from re-running the model with one input changed — not a guaranteed
            saving.
          </p>
        </div>
        <Link to="/reports" className={btnPrimary}>
          Generate report
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(({ label, count }) => (
          <button
            key={label}
            type="button"
            aria-pressed={filter === label}
            onClick={() => setFilter(label)}
            className={clsx(
              'inline-flex h-11 items-center rounded-full px-4 text-[14px] font-medium leading-5 transition-colors',
              filter === label
                ? 'bg-pv-forest text-white'
                : 'border border-pv-border-soft bg-white text-pv-ink hover:bg-pv-bg',
            )}
          >
            {label} · {count}
          </button>
        ))}
        <span className="ml-auto text-[12px] leading-4 text-pv-muted">
          Sorted by priority, then modeled saving
        </span>
      </div>

      {/* Cards + sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[772fr_340fr]">
        <div className="flex flex-col gap-6">
          {visible.map((rec) => (
            <RecCard
              key={rec.id}
              rec={rec}
              reviewed={reviewedIds.has(rec.id)}
              onToggleReviewed={() => toggleReviewed(rec.id)}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
            <h2 className={H2}>How these are generated</h2>
            <p className="max-w-[290px] text-[14px] leading-5 text-pv-ink">
              Each suggestion re-runs the model from the baseline with one input changed inside its
              supported range, keeping everything else the same. The benefit is the modeled difference.
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-semibold leading-5 text-pv-ink">Not considered</p>
              <ul className="flex flex-col gap-1 pl-5 text-[14px] leading-5 text-pv-muted">
                {NOT_CONSIDERED.map((item) => (
                  <li key={item} className="relative">
                    <span aria-hidden="true" className="absolute -left-5">
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
            <h2 className={H2}>Review status</h2>
            <div className="flex items-center justify-between gap-4 text-[14px] leading-5">
              <span className="text-pv-ink">
                {reviewedIds.size} of {RECS.length} reviewed
              </span>
              <span className="text-pv-muted">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Review progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 w-full overflow-hidden rounded-full bg-pv-chip"
            >
              <div
                className="h-full rounded-full bg-pv-teal transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="max-w-[290px] text-[12px] leading-4 text-pv-muted">
              Recommendations support decisions; a qualified operator decides what changes at the
              plant.
            </p>
          </section>
        </aside>
      </div>

      {/* Page footer bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card">
        <Link to="/compare" className={btnSecondary}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to comparison
        </Link>
        <Link to="/reports" className={btnPrimary}>
          Generate report
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
