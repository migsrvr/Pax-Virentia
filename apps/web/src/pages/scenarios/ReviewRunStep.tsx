import { ArrowLeft, CircleCheck, Play } from 'lucide-react';
import { Chip, SectionCard, btnGhost, btnPrimary, btnSecondary } from './shared';
import type { ChipTone } from './shared';

/* U06 · Setup 4 — Review and run (frame 30:2). Sample values as shown in the design. */

type ReviewRow = {
  term: string;
  value: string;
  chip?: { label: string; tone: ChipTone };
};

const SCENARIO_ROWS: ReviewRow[] = [
  { term: 'Name', value: 'Pax Silica pilot' },
  { term: 'Type', value: 'Intervention' },
  { term: 'Compared with', value: 'Baseline operation · rev 3 · run R-0139' },
  {
    term: 'Input dataset',
    value: 'Sample plant observations v1.2',
    chip: { label: 'Sample data', tone: 'mint' },
  },
  {
    term: 'Treatment process',
    value: 'Pax Silica intervention · spec v0.4',
    chip: { label: 'Unverified', tone: 'warn' },
  },
];

const OPERATING_ROWS: ReviewRow[] = [
  {
    term: 'Reporting period',
    value: '1–5 Jan 2026 · 120 h',
    chip: { label: 'Sample data', tone: 'mint' },
  },
  { term: 'Treated volume', value: '61,600 m³', chip: { label: 'Sample data', tone: 'mint' } },
  { term: 'Flow rate', value: '520 m³/h', chip: { label: 'Assumed', tone: 'neutral' } },
  { term: 'Pump duty · power', value: '120 h · 165 kW', chip: { label: 'Assumed power', tone: 'neutral' } },
  { term: 'Mixing hours', value: '95 h', chip: { label: 'Sample data', tone: 'mint' } },
  { term: 'Mixer power · load', value: '38 kW · 0.90', chip: { label: 'Unverified', tone: 'warn' } },
  { term: 'Coagulant dose', value: '2.8 mg/L', chip: { label: 'Unverified', tone: 'warn' } },
];

const COST_ROWS: ReviewRow[] = [
  { term: 'Electricity tariff', value: '₱11.00 per kWh', chip: { label: 'Assumed', tone: 'neutral' } },
  { term: 'Coagulant price', value: '₱50.00 per kg', chip: { label: 'Assumed', tone: 'neutral' } },
  { term: 'Labor · maintenance', value: '₱40,000 · ₱15,000', chip: { label: 'Assumed', tone: 'neutral' } },
  {
    term: 'Other non-energy',
    value: '₱12,000 (incl. ₱6,000 material)',
    chip: { label: 'Assumed', tone: 'neutral' },
  },
  {
    term: 'Grid emission factor',
    value: '0.7122 kg CO₂e/kWh · Luzon–Visayas 2026',
    chip: { label: 'Assumed', tone: 'neutral' },
  },
  {
    term: 'Capital cost',
    value: '₱1,800,000 (payback only)',
    chip: { label: 'Assumed', tone: 'neutral' },
  },
];

const MODEL_ITEMS = [
  {
    title: 'Energy (kWh)',
    body: 'Pump power × pump hours + mixer power × load × mixing hours',
  },
  { title: 'CO₂e (kg)', body: 'Energy × grid emission factor' },
  {
    title: 'Operating cost (₱)',
    body: 'Energy × tariff + coagulant × price + labor + maintenance + other',
  },
  {
    title: 'Downstream ecosystem stress',
    body: 'Evidence check only. Reported as “not estimable” until a validated local model exists.',
  },
];

const FROZEN_ITEMS = [
  'Dataset v1.2 · checksum 9f2c…a41b',
  'Treatment spec v0.4 (unverified)',
  'Emission factor set 2026-A (assumed)',
  'Models: energy v1 · carbon v1 · cost v1 · ecology gate v1',
];

function ReviewCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: ReviewRow[];
  onEdit: () => void;
}) {
  return (
    <SectionCard className="gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h2>
        <button type="button" onClick={onEdit} className={btnGhost}>
          Edit
        </button>
      </div>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.term}
            className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-pv-hairline py-3 last:border-b-0 sm:grid-cols-[200px_minmax(0,1fr)]"
          >
            <dt className="text-[14px] leading-5 text-pv-muted">{row.term}</dt>
            <dd className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="text-[14px] font-medium leading-5 text-pv-ink">{row.value}</span>
              {row.chip && <Chip tone={row.chip.tone}>{row.chip.label}</Chip>}
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export default function ReviewRunStep({
  onBack,
  onEdit,
  onRun,
}: {
  onBack: () => void;
  onEdit: (step: number) => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 rounded-xl border border-pv-ok-border bg-pv-ok-bg p-4">
        <CircleCheck size={20} className="mt-0.5 shrink-0 text-pv-ev-green" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-[14px] font-semibold leading-5 text-pv-ok-ink">
            All 5 setup checks passed
          </p>
          <p className="text-[14px] leading-5 text-pv-ink">
            When you run, these inputs are frozen as revision 1, so this result can always be
            reproduced. Editing later creates revision 2.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <ReviewCard title="Scenario" rows={SCENARIO_ROWS} onEdit={() => onEdit(1)} />
          <ReviewCard title="Operating conditions" rows={OPERATING_ROWS} onEdit={() => onEdit(2)} />
          <ReviewCard
            title="Costs and emission factor"
            rows={COST_ROWS}
            onEdit={() => onEdit(3)}
          />
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              What the model calculates
            </h2>
            <ul className="flex flex-col gap-4">
              {MODEL_ITEMS.map((item) => (
                <li key={item.title} className="flex flex-col gap-1">
                  <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                    {item.title}
                  </span>
                  <span className="text-[14px] leading-5 text-pv-muted">{item.body}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Frozen with this run
            </h2>
            <ul className="flex flex-col gap-2">
              {FROZEN_ITEMS.map((item) => (
                <li key={item} className="text-[14px] leading-5 text-pv-ink">
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[12px] leading-4 text-pv-muted">
              The results page shows these versions so anyone can trace a number back to its
              inputs.
            </p>
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card">
        <button type="button" onClick={onBack} className={btnSecondary}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <span className="text-[12px] leading-4 text-pv-muted">
            Runs use the offline model. No plant equipment is affected.
          </span>
          <button type="button" onClick={onRun} className={btnPrimary}>
            <Play size={18} aria-hidden="true" />
            Run simulation
          </button>
        </div>
      </div>
    </div>
  );
}
