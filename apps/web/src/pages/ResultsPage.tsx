import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowDownRight,
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Cloud,
  Coins,
  Info,
  Sprout,
  Zap,
} from 'lucide-react';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';

type Metric = {
  icon: ReactNode;
  title: string;
  sub: string;
  value: string;
  unit: string;
  chip: string;
  delta: string;
  footnote: string;
};

const METRICS: Metric[] = [
  {
    icon: <Zap size={20} aria-hidden="true" />,
    title: 'Energy consumption',
    sub: 'Electricity · pumps and mixers',
    value: '23,049',
    unit: 'kWh',
    chip: '6.5% lower',
    delta: '−1,596 kWh vs baseline',
    footnote: 'Simulated estimate · 0.374 kWh per m³',
  },
  {
    icon: <Cloud size={20} aria-hidden="true" />,
    title: 'CO₂e emissions',
    sub: 'Electricity-associated only',
    value: '16,415',
    unit: 'kg CO₂e',
    chip: '6.5% lower',
    delta: '−1,137 kg vs baseline',
    footnote: 'Simulated estimate · grid factor 0.7122 (assumed)',
  },
  {
    icon: <Coins size={20} aria-hidden="true" />,
    title: 'Operating cost',
    sub: '5-day period · Philippine peso',
    value: '₱329,163',
    unit: 'PHP',
    chip: '3.8% lower',
    delta: '−₱13,096 vs baseline',
    footnote: 'Simulated estimate · ₱5.34 per m³',
  },
];

const ENERGY_BARS = [
  {
    label: 'Pax Silica pilot',
    total: '23,049 kWh',
    pumpsWidth: '80.07%',
    mixersWidth: '13.14%',
    caption: 'Pumps 19,800 kWh (85.9%) · Mixers 3,249 kWh (14.1%)',
  },
  {
    label: 'Baseline operation',
    total: '24,645 kWh',
    pumpsWidth: '80.07%',
    mixersWidth: '19.64%',
    caption: 'Pumps 19,800 kWh (80.3%) · Mixers 4,845 kWh (19.7%)',
  },
];

const PER_CUBIC_METRE = [
  { term: 'Energy intensity', value: '0.374 kWh/m³', baseline: 'baseline 0.400 · −0.026' },
  { term: 'Emissions intensity', value: '0.266 kg CO₂e/m³', baseline: 'baseline 0.285 · −0.019' },
  { term: 'Cost per m³', value: '₱5.34', baseline: 'baseline ₱5.56 · −₱0.22' },
];

const COST_ROWS = [
  { label: 'Electricity', value: '₱253,539', pct: '77.0%', width: '77.0%' },
  { label: 'Labor', value: '₱40,000', pct: '12.2%', width: '12.2%' },
  { label: 'Maintenance', value: '₱15,000', pct: '4.6%', width: '4.6%' },
  { label: 'Other non-energy', value: '₱12,000', pct: '3.6%', width: '3.6%' },
  { label: 'Coagulant', value: '₱8,624', pct: '2.6%', width: '2.6%' },
];

const COST_CHANGES = [
  { label: 'Electricity', delta: '−₱17,556', tone: 'ok' as const },
  { label: 'Coagulant', delta: '−₱1,540', tone: 'ok' as const },
  { label: 'Other (material)', delta: '+₱6,000', tone: 'err' as const },
];

type AssumptionRow = {
  input: string;
  value: string;
  evidence: string;
  tone: 'mint' | 'neutral' | 'warn';
  note: string;
};

const ASSUMPTION_ROWS: AssumptionRow[] = [
  {
    input: 'Reporting period',
    value: '1–5 Jan 2026 · 120 h',
    evidence: 'Sample data',
    tone: 'mint',
    note: 'Sample plant observations v1.2',
  },
  {
    input: 'Treated volume',
    value: '61,600 m³',
    evidence: 'Sample data',
    tone: 'mint',
    note: 'Sample plant observations v1.2',
  },
  {
    input: 'Pump duty',
    value: '120 h',
    evidence: 'Sample data',
    tone: 'mint',
    note: 'Full period',
  },
  {
    input: 'Mixing hours',
    value: '95 h',
    evidence: 'Sample data',
    tone: 'mint',
    note: 'Daily mixing hours, summed',
  },
  {
    input: 'Flow rate',
    value: '520 m³/h',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Within 300–600 m³/h supported range',
  },
  {
    input: 'Pump power',
    value: '165 kW',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Conventional spec v1.1',
  },
  {
    input: 'Mixer power',
    value: '38 kW',
    evidence: 'Unverified',
    tone: 'warn',
    note: 'Pax Silica spec v0.4',
  },
  {
    input: 'Mixing load multiplier',
    value: '0.90',
    evidence: 'Unverified',
    tone: 'warn',
    note: 'Pax Silica spec v0.4',
  },
  {
    input: 'Coagulant dose',
    value: '2.8 mg/L',
    evidence: 'Unverified',
    tone: 'warn',
    note: 'Pax Silica spec v0.4',
  },
  {
    input: 'Electricity tariff',
    value: '₱11.00 per kWh',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Flat rate; time-of-use not modeled',
  },
  {
    input: 'Coagulant price',
    value: '₱50.00 per kg',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Delivered price',
  },
  {
    input: 'Labor · maintenance',
    value: '₱40,000 · ₱15,000',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Per 5-day period',
  },
  {
    input: 'Other non-energy',
    value: '₱12,000',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Includes ₱6,000 Pax Silica material',
  },
  {
    input: 'Grid emission factor',
    value: '0.7122 kg CO₂e/kWh',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'DOE 2023 Luzon–Visayas value carried forward to 2026',
  },
  {
    input: 'Capital cost',
    value: '₱1,800,000',
    evidence: 'Assumed',
    tone: 'neutral',
    note: 'Used only for simple payback',
  },
];

const ESTIMABLE_REQUIREMENTS = [
  'A defined target, such as dissolved oxygen downstream of the discharge',
  'Paired observations of plant operations and that target',
  'An independently validated model',
];

const METHODOLOGY_LINES = [
  { label: 'Energy', formula: '= pump kW × pump hours + mixer kW × load × mixing hours' },
  { label: 'CO₂e', formula: '= energy × grid emission factor' },
  {
    label: 'Operating cost',
    formula: '= energy × tariff + coagulant × price + labor + maintenance + other',
  },
  {
    label: 'Ecosystem stress',
    formula: '= evidence check; not estimable without a validated model',
  },
];

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-mint text-pv-forest">
          {metric.icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[14px] font-semibold leading-5 text-pv-ink">{metric.title}</span>
          <span className="text-[12px] leading-4 text-pv-muted">{metric.sub}</span>
        </span>
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-9 tracking-[-0.01em] text-pv-ink">
          {metric.value}
        </span>
        <span className="text-[14px] font-medium leading-5 text-pv-muted">{metric.unit}</span>
      </p>
      <div className="flex flex-col items-start gap-2">
        <Chip tone="ok" leadingIcon={<ArrowDownRight size={14} aria-hidden="true" />}>
          {metric.chip}
        </Chip>
        <span className="text-[12px] leading-4 text-pv-muted">{metric.delta}</span>
      </div>
      <div className="mt-auto border-t border-pv-hairline pt-4">
        <p className="text-[12px] leading-4 text-pv-muted">{metric.footnote}</p>
      </div>
    </article>
  );
}

export default function ResultsPage() {
  const topRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const costsRef = useRef<HTMLDivElement>(null);
  const assumptionsRef = useRef<HTMLElement>(null);
  const ecosystemRef = useRef<HTMLElement>(null);
  const methodologyRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const goTo = (id: string, ref: { current: HTMLElement | null }) => {
    setActiveTab(id);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', ref: topRef },
    { id: 'energy', label: 'Energy', ref: energyRef },
    { id: 'costs', label: 'Costs and emissions', ref: costsRef },
    { id: 'assumptions', label: 'Assumptions', ref: assumptionsRef },
    { id: 'ecosystem', label: 'Ecosystem indicator', ref: ecosystemRef },
    { id: 'methodology', label: 'Methodology', ref: methodologyRef },
  ];

  return (
    <div ref={topRef} className="flex flex-col gap-6 scroll-mt-6">
      {/* Page head */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] leading-4">
          <Link to="/scenarios" className="text-pv-teal hover:underline">
            Simulations
          </Link>
          <span className="text-pv-muted">/</span>
          <Link to="/scenarios" className="text-pv-teal hover:underline">
            Pax Silica pilot
          </Link>
          <span className="text-pv-muted">/</span>
          <span className="text-pv-muted">Run R-0142</span>
        </nav>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
                Pax Silica pilot — results
              </h1>
              <Chip tone="info">Simulated estimate</Chip>
              <Chip tone="ok" leadingIcon={<CircleCheck size={14} aria-hidden="true" />}>
                Completed
              </Chip>
              <Chip tone="warn">Unverified specification</Chip>
            </div>
            <p className="text-[14px] leading-5 text-pv-muted">
              Intervention · revision 1 · run R-0142 · 1–5 Jan 2026 · 61,600 m³ treated · finished
              13 Oct 2026, 10:13
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/reports" className={btnSecondary}>
              Add to report
            </Link>
            <Link to="/recommendations" className={btnSecondary}>
              View recommendations
            </Link>
            <Link to="/compare" className={btnPrimary}>
              Compare scenarios
            </Link>
          </div>
        </div>
      </div>

      {/* Evidence notice */}
      <div className="flex flex-col gap-3.5 rounded-xl bg-pv-info-bg p-4">
        <div className="flex items-start gap-3">
          <span className="pt-0.5 text-pv-ev-blue">
            <Info size={20} aria-hidden="true" />
          </span>
          <p className="text-[14px] leading-5 text-pv-ink">
            Simulated estimates from sample data and an unverified treatment specification (Pax
            Silica v0.4). They aren't measurements or validated results.
          </p>
        </div>
        <button
          type="button"
          onClick={() => goTo('assumptions', assumptionsRef)}
          className="self-start text-[14px] font-semibold leading-5 text-pv-teal hover:underline"
        >
          View assumptions
        </button>
      </div>

      {/* Result sections */}
      <nav
        aria-label="Result sections"
        className="flex flex-wrap items-center gap-1 border-b border-pv-divider"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={activeTab === tab.id ? 'true' : undefined}
            onClick={() => goTo(tab.id, tab.ref)}
            className={clsx(
              '-mb-px inline-flex h-11 items-center border-b-[3px] px-4 text-[14px] font-medium leading-5 transition-colors',
              activeTab === tab.id
                ? 'border-pv-teal text-pv-forest'
                : 'border-transparent text-pv-muted hover:text-pv-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.title} metric={metric} />
        ))}
        <article className="flex flex-col gap-4 rounded-xl border border-dashed border-pv-border-soft bg-white p-6 shadow-pv-card">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-chip text-pv-muted">
              <Sprout size={20} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                Environmental indicator
              </span>
              <span className="text-[12px] leading-4 text-pv-muted">
                Downstream ecosystem stress
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-pv-muted">
            <CircleDashed size={20} aria-hidden="true" />
            <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Not estimable
            </span>
          </div>
          <div className="flex">
            <Chip tone="neutral">Evidence gate not met</Chip>
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-pv-hairline pt-4">
            <p className="text-[12px] leading-4 text-pv-muted">No validated local model yet</p>
            <button
              type="button"
              onClick={() => goTo('ecosystem', ecosystemRef)}
              className="text-[12px] font-semibold leading-4 text-pv-teal hover:underline"
            >
              Why?
            </button>
          </div>
        </article>
      </div>

      {/* Energy and intensity */}
      <div ref={energyRef} className="grid grid-cols-1 gap-6 scroll-mt-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard className="gap-5">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Energy by equipment</h2>
            <p className="text-[12px] leading-4 text-pv-muted">
              kWh over 1–5 Jan 2026 · bar length is relative to the baseline total
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2 text-[12px] leading-4 text-pv-ink">
              <span className="h-3 w-3 shrink-0 rounded-[2px] bg-pv-forest" />
              Pumps
            </span>
            <span className="flex items-center gap-2 text-[12px] leading-4 text-pv-ink">
              <span className="h-3 w-3 shrink-0 rounded-[2px] bg-pv-teal" />
              Mixers
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {ENERGY_BARS.map((bar) => (
              <div key={bar.label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                    {bar.label}
                  </span>
                  <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                    {bar.total}
                  </span>
                </div>
                <div className="flex w-full gap-[2px]">
                  <span
                    className="h-5 shrink-0 rounded-l bg-pv-forest"
                    style={{ width: bar.pumpsWidth }}
                  />
                  <span
                    className="h-5 shrink-0 rounded-r bg-pv-teal"
                    style={{ width: bar.mixersWidth }}
                  />
                </div>
                <p className="text-[12px] leading-4 text-pv-muted">{bar.caption}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-pv-hairline pt-4">
            <p className="max-w-[692px] text-[14px] leading-5 text-pv-ink">
              Only mixer energy changes. Pump power and hours are the same in both scenarios, so the
              1,596 kWh difference comes from mixers running at 38 kW × 0.90 load instead of 51 kW ×
              1.00 for 95 hours.
            </p>
          </div>
        </SectionCard>

        <SectionCard className="gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Per cubic metre treated</h2>
            <p className="text-[12px] leading-4 text-pv-muted">61,600 m³ in both scenarios</p>
          </div>
          <dl className="flex flex-col gap-4">
            {PER_CUBIC_METRE.map((row) => (
              <div key={row.term} className="flex flex-col gap-1">
                <dt className="text-[14px] leading-5 text-pv-muted">{row.term}</dt>
                <dd className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                    {row.value}
                  </span>
                  <span className="text-[12px] leading-4 text-pv-muted">{row.baseline}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex">
            <Chip tone="info">Simulated estimate</Chip>
          </div>
        </SectionCard>
      </div>

      {/* Cost and emissions */}
      <div ref={costsRef} className="grid grid-cols-1 gap-6 scroll-mt-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard className="gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className={H2}>Operating cost breakdown</h2>
              <p className="text-[12px] leading-4 text-pv-muted">
                ₱ for the 5-day period · share of total
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[12px] leading-4 text-pv-muted">Total</span>
              <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">₱329,163</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {COST_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[160px_minmax(0,1fr)_150px]"
              >
                <span className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</span>
                <span className="flex items-center">
                  <span
                    className="h-5 rounded bg-pv-teal"
                    style={{ width: row.width }}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[14px] leading-5 text-pv-ink sm:text-right">
                  {row.value} <span className="text-pv-muted">· {row.pct}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-pv-hairline pt-4">
            <p className="text-[14px] font-semibold leading-5 text-pv-muted">
              Change from baseline (₱342,259)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {COST_CHANGES.map((change) => (
                <div key={change.label} className="flex flex-col gap-1 rounded-xl bg-pv-bg p-4">
                  <span className="text-[12px] leading-4 text-pv-muted">{change.label}</span>
                  <span
                    className={clsx(
                      'text-[14px] font-semibold leading-5',
                      change.tone === 'ok' ? 'text-pv-ok-ink' : 'text-pv-err-ink',
                    )}
                  >
                    {change.delta}
                  </span>
                </div>
              ))}
              <div className="flex flex-col gap-1 rounded-xl bg-pv-ok-bg p-4">
                <span className="text-[12px] leading-4 text-pv-ok-ink">Net change</span>
                <span className="text-[14px] font-semibold leading-5 text-pv-ok-ink">
                  −₱13,096 · 3.8% lower
                </span>
              </div>
            </div>
            <p className="max-w-[692px] text-[12px] leading-4 text-pv-muted">
              Labor and maintenance are unchanged. Simple payback (illustrative): ₱1,800,000 assumed
              capital ÷ ₱956,008 a year (5-day saving × 73) ≈ 1.9 years.
            </p>
          </div>
        </SectionCard>

        <SectionCard className="gap-4">
          <h2 className={H2}>How CO₂e is estimated</h2>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 rounded-xl bg-pv-bg p-4">
              <span className="text-[12px] leading-4 text-pv-muted">Electricity used</span>
              <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                23,049 kWh
              </span>
            </div>
            <p className="text-center text-[14px] leading-5 text-pv-muted">×</p>
            <div className="flex flex-col gap-1 rounded-xl bg-pv-bg p-4">
              <span className="text-[12px] leading-4 text-pv-muted">
                Grid emission factor · assumed
              </span>
              <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                0.7122 kg CO₂e/kWh
              </span>
            </div>
            <p className="text-center text-[14px] leading-5 text-pv-muted">=</p>
            <div className="flex flex-col gap-1 rounded-xl bg-pv-mint p-4">
              <span className="text-[12px] leading-4 text-pv-forest">
                CO₂e emissions · simulated estimate
              </span>
              <span className="text-[18px] font-semibold leading-[26px] text-pv-forest">
                16,415 kg CO₂e
              </span>
            </div>
          </div>
          <p className="max-w-[321px] text-[12px] leading-4 text-pv-ink">
            Electricity-associated only. Excludes chemical manufacturing and transport, direct
            process emissions and construction.
          </p>
        </SectionCard>
      </div>

      {/* Assumptions */}
      <section
        ref={assumptionsRef}
        aria-label="Assumptions used in this run"
        className="flex scroll-mt-6 flex-col overflow-hidden rounded-xl border border-pv-divider bg-white shadow-pv-card"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-6">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Assumptions used in this run</h2>
            <p className="text-[12px] leading-4 text-pv-muted">
              Frozen with run R-0142 · dataset v1.2 · spec v0.4 · factor set 2026-A · models v1
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="mint">4 sample data</Chip>
            <Chip tone="neutral">9 assumed</Chip>
            <Chip tone="warn">3 unverified</Chip>
          </div>
        </div>
        <div className="overflow-x-auto pv-scroll">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[20.1%]" />
              <col className="w-[13.6%]" />
              <col className="w-[46.3%]" />
            </colgroup>
            <thead>
              <tr className="bg-pv-bg">
                {['Input', 'Value', 'Evidence', 'Source or note'].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-pv-divider px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSUMPTION_ROWS.map((row) => (
                <tr key={row.input}>
                  <td className="border-b border-pv-hairline px-4 py-3.5 text-[14px] font-medium leading-5 text-pv-ink">
                    {row.input}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3.5 text-[14px] leading-5 text-pv-ink">
                    {row.value}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3.5">
                    <Chip tone={row.tone}>{row.evidence}</Chip>
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3.5 text-[14px] leading-5 text-pv-muted">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ecosystem and methodology */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section
          ref={ecosystemRef}
          aria-label="Downstream ecosystem stress"
          className="flex scroll-mt-6 flex-col gap-4 rounded-xl border border-dashed border-pv-border-soft bg-white p-6 shadow-pv-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className={H2}>Downstream ecosystem stress</h2>
              <p className="text-[12px] leading-4 text-pv-muted">Environmental indicator</p>
            </div>
            <Chip tone="neutral">Not estimable</Chip>
          </div>
          <p className="max-w-[506px] text-[14px] leading-5 text-pv-ink">
            <span className="font-semibold">Why there's no value:</span> there's no validated local
            exposure–response model and no paired river or coastal observations for this plant.
            Showing a number would imply evidence we don't have — and “not estimable” isn't the same
            as zero impact.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">
              What would make it estimable
            </p>
            <ul className="flex flex-col gap-1 pl-5">
              {ESTIMABLE_REQUIREMENTS.map((item) => (
                <li key={item} className="relative text-[14px] leading-5 text-pv-ink">
                  <span aria-hidden="true" className="absolute -left-5">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          ref={methodologyRef}
          aria-label="Methodology and versions"
          className="flex scroll-mt-6 flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
        >
          <h2 className={H2}>Methodology and versions</h2>
          <ul className="flex flex-col gap-3 text-[14px] leading-5 text-pv-muted">
            {METHODOLOGY_LINES.map((line) => (
              <li key={line.label}>
                <span className="font-semibold text-pv-ink">{line.label}</span> {line.formula}
              </li>
            ))}
          </ul>
          <p className="text-[12px] leading-4 text-pv-muted">
            Models energy v1 · carbon v1 · cost v1 · ecology gate v1 · dataset v1.2 (checksum
            9f2c…a41b)
          </p>
          <div className="flex">
            <Link to="/methodology" className={btnSecondary}>
              Read the full methodology
            </Link>
          </div>
        </section>
      </div>

      {/* Next steps */}
      <section
        aria-label="Next steps"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card"
      >
        <p className="text-[14px] leading-5 text-pv-muted">
          Next: compare this run with the baseline and the reduced-mixing scenario.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/reports" className={btnSecondary}>
            Add to report
          </Link>
          <Link to="/recommendations" className={btnSecondary}>
            View recommendations
          </Link>
          <Link to="/compare" className={btnPrimary}>
            Compare scenarios
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
