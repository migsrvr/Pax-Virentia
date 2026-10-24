import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  Cpu,
  FileCheck2,
  GitCompareArrows,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Workflow,
  Zap,
} from 'lucide-react';
import PublicHeader from '../components/public/PublicHeader';

const TABS = [
  { id: 'comparison', label: 'Scenario Comparison', icon: GitCompareArrows },
  { id: 'narrative', label: 'Gemini AI Narrative', icon: Sparkles },
  { id: 'parameters', label: 'Operating Parameters', icon: SlidersHorizontal },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PILLARS = [
  {
    icon: Cpu,
    title: 'Offline Digital Twin & Scenario Modeler',
    description:
      'Model pump duty, mixing hours and chemical dosing offline — with no plant sensor integration required.',
  },
  {
    icon: Calculator,
    title: 'Deterministic Comparative Economics',
    description:
      'Compare every intervention against an immutable baseline, with side-by-side deltas for energy, emissions and operating cost.',
  },
  {
    icon: Bot,
    title: 'Grounded Google Gemini AI Engine',
    description:
      'Generate plain-language executive explanations derived strictly from stored calculation runs — never from outside assumptions.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence Gates & Scientific Rigor',
    description:
      'Track unverified technology specifications and keep not_estimable distinct from zero impact.',
  },
];

const LIFECYCLE = [
  {
    step: '01',
    icon: SlidersHorizontal,
    title: 'Configure & Freeze',
    description:
      'Set flow rate, tariffs and the grid factor, then freeze the inputs that define the run.',
  },
  {
    step: '02',
    icon: Workflow,
    title: 'Deterministic Simulation',
    description:
      'A background worker executes pure mathematical routines — no live telemetry and no model drift.',
  },
  {
    step: '03',
    icon: FileCheck2,
    title: 'Review, Compare & Publish',
    description:
      'Inspect the deltas, generate the AI briefing and publish a reviewer-approved snapshot.',
  },
];

const PARAMETERS = [
  {
    icon: Sprout,
    label: 'Treated volume',
    value: '61,600 m³',
    note: 'Same boundary across both runs',
  },
  {
    icon: Zap,
    label: 'Electricity tariff',
    value: '₱11.50/kWh',
    note: 'Utility cost assumption',
  },
  {
    icon: Globe2,
    label: 'Grid factor',
    value: '0.7122 kg/kWh',
    note: 'Luzon–Visayas · DOE 2023',
  },
  {
    icon: Workflow,
    label: 'Operating cycle',
    value: '5 days',
    note: '1–5 January 2026',
  },
];

const AUDIT_POINTS = [
  'Immutable run snapshots with frozen inputs',
  'Versioned technology and emission-factor records',
  'Explicit not_estimable status when evidence is missing',
];

const PRIMARY_LINK =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-pv-brand px-5 text-[14px] font-semibold leading-5 text-white transition-colors hover:bg-pv-pine';
const OUTLINE_LINK =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-5 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-brand';
const MINT_LINK =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-pv-highlight px-5 text-[14px] font-semibold leading-5 text-pv-brand transition-colors hover:bg-white';
const ON_FOREST_OUTLINE =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-pv-on-brand-muted px-5 text-[14px] font-semibold leading-5 text-white transition-colors hover:bg-pv-pine';

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex max-w-[760px] flex-col gap-2">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-pv-action">
        {eyebrow}
      </p>
      <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink sm:text-[32px] sm:leading-10">
        {title}
      </h2>
      {subtitle ? <p className="text-[15px] leading-7 text-pv-ink-light">{subtitle}</p> : null}
    </div>
  );
}

function ScenarioComparison() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-pv-brand p-6 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pv-on-brand-muted">
            Net Cost Savings
          </p>
          <p className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.5px] tabular-nums">
            ₱10,659
          </p>
          <p className="mt-3 text-[14px] leading-5 text-pv-on-brand-soft">
            PHP · <span className="font-semibold text-white">−3.1% OPEX</span>
          </p>
        </div>
        <div className="rounded-xl bg-pv-action p-6 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pv-on-brand-soft">
            Emissions Avoided
          </p>
          <p className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.5px] tabular-nums">
            690 kg CO₂e
          </p>
          <p className="mt-3 text-[14px] leading-5 text-pv-on-brand-soft">
            <span className="font-semibold text-white">−3.9% CO₂e</span> against the baseline
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-pv-line">
        <table className="w-full min-w-[680px] border-collapse text-left text-[14px]">
          <caption className="sr-only">
            Stored comparison for run R-0140. Differences are intervention minus baseline.
          </caption>
          <thead className="bg-pv-page text-[12px] uppercase tracking-[0.08em] text-pv-ink-light">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Metric</th>
              <th scope="col" className="px-4 py-3 font-semibold">Baseline</th>
              <th scope="col" className="px-4 py-3 font-semibold">Intervention</th>
              <th scope="col" className="px-4 py-3 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-pv-line">
              <th scope="row" className="px-4 py-4 font-semibold text-pv-ink">Energy</th>
              <td className="px-4 py-4 tabular-nums text-pv-ink">23,676 kWh</td>
              <td className="px-4 py-4 tabular-nums text-pv-ink">22,706 kWh</td>
              <td className="px-4 py-4 tabular-nums">
                <span className="font-semibold text-pv-positive">−970 kWh</span>
                <span className="ml-2 text-[12px] text-pv-ink-light">−3.9%</span>
              </td>
            </tr>
            <tr className="border-t border-pv-line">
              <th scope="row" className="px-4 py-4 font-semibold text-pv-ink">Emissions</th>
              <td className="px-4 py-4 tabular-nums text-pv-ink">16,862 kg</td>
              <td className="px-4 py-4 tabular-nums text-pv-ink">16,172 kg</td>
              <td className="px-4 py-4 tabular-nums">
                <span className="font-semibold text-pv-positive">−690 kg CO₂e</span>
                <span className="ml-2 text-[12px] text-pv-ink-light">−3.9%</span>
              </td>
            </tr>
            <tr className="border-t border-pv-line">
              <th scope="row" className="px-4 py-4 font-semibold text-pv-ink">Ecosystem stress</th>
              <td className="px-4 py-4">
                <span className="inline-flex items-center rounded-full bg-pv-chip px-2 py-1 text-[12px] font-medium text-pv-muted">
                  Not estimable
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center rounded-full bg-pv-chip px-2 py-1 text-[12px] font-medium text-pv-muted">
                  Not estimable
                </span>
              </td>
              <td className="px-4 py-4 text-[12px] leading-4 text-pv-ink-light">
                Requires validated local model
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-4 text-pv-ink-light">
        Representative stored run R-0140 · 61,600 m³ treated · 5-day cycle · changes are intervention
        minus baseline.
      </p>
    </div>
  );
}

function GeminiNarrative() {
  return (
    <div className="flex flex-col gap-5">
      <span className="inline-flex w-fit items-center rounded-full bg-pv-highlight px-3 py-1.5 text-[12px] font-semibold leading-4 text-pv-brand">
        Fact-Grounded Explanation · Pinned to Stored Run R-0140
      </span>
      <blockquote className="border-l-4 border-pv-action pl-5 text-[18px] leading-8 text-pv-ink sm:text-[20px]">
        “Optimized mixing schedule reduces auxiliary power demand by 3.9%, generating net period
        savings of ₱10,659 across 61,600 m³ treated with zero chemical overhead.”
      </blockquote>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pv-positive-bg px-3 py-1.5 text-[12px] font-medium leading-4 text-pv-positive">
          <CheckCircle2 size={14} aria-hidden="true" />
          Deterministic fallback verified
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pv-positive-bg px-3 py-1.5 text-[12px] font-medium leading-4 text-pv-positive">
          <CheckCircle2 size={14} aria-hidden="true" />
          Zero hallucinated metrics
        </span>
      </div>
      <p className="text-[12px] leading-4 text-pv-ink-light">
        Narratives explain stored calculation outputs only. They do not replace the numerical results,
        source evidence or calculation methods.
      </p>
    </div>
  );
}

function OperatingParameters() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PARAMETERS.map(({ icon: Icon, label, value, note }) => (
          <div key={label} className="rounded-xl border border-pv-line bg-pv-page p-5">
            <div className="flex items-center gap-2 text-pv-action">
              <Icon size={18} aria-hidden="true" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">{label}</span>
            </div>
            <p className="mt-3 text-[24px] font-semibold leading-7 tracking-[-0.2px] tabular-nums text-pv-ink">
              {value}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-pv-ink-light">{note}</p>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-4 text-pv-ink-light">
        Frozen inputs for run R-0140. Comparisons require the same volume, period, currency and grid
        region.
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-pv-line bg-white">
      <div className="mx-auto flex w-full max-w-[1264px] flex-col items-center gap-6 px-6 pb-14 pt-16 text-center lg:px-8 lg:pb-20 lg:pt-24">
        <span className="inline-flex items-center rounded-full bg-pv-highlight px-3 py-1.5 text-[12px] font-semibold leading-4 text-pv-brand">
          Pax Virentia Engine · Enterprise Decision Support
        </span>
        <h1 className="max-w-[900px] text-[38px] font-semibold leading-[1.1] tracking-[-0.8px] text-pv-ink sm:text-[52px] sm:leading-[1.05]">
          Model Treatment Scenarios Before You Alter Operations
        </h1>
        <p className="max-w-[820px] text-[16px] leading-7 text-pv-ink-light sm:text-[18px] sm:leading-8">
          An offline decision-support platform for municipal water districts to compare energy demand,
          electricity-associated emissions, and operating costs across treatment interventions with
          mathematical precision and fact-grounded AI.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className={PRIMARY_LINK}>
            Enter Utility Workspace
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/public/overview" className={OUTLINE_LINK}>
            Explore Public Portal
          </Link>
        </div>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] leading-4 text-pv-ink-light">
          <span>Zero plant sensor integration required</span>
          <span aria-hidden="true">·</span>
          <span>Bounded offline modeling</span>
          <span aria-hidden="true">·</span>
          <span>Deterministic calculations</span>
        </p>
      </div>
    </section>
  );
}

function PlatformShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>('comparison');

  return (
    <section aria-labelledby="platform-showcase-title" className="bg-pv-page">
      <div className="mx-auto w-full max-w-[1264px] px-6 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Platform core"
          title="One model. Three decisive views."
          subtitle="Move from comparable deltas to an executive briefing without leaving the stored run."
        />
        <div className="mt-8 rounded-2xl border border-pv-line bg-white">
          <div
            role="tablist"
            aria-label="Platform core views"
            className="flex flex-wrap gap-2 border-b border-pv-line p-4"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={
                    selected
                      ? 'inline-flex h-10 items-center gap-2 rounded-lg bg-pv-brand px-3 text-[13px] font-semibold leading-5 text-white'
                      : 'inline-flex h-10 items-center gap-2 rounded-lg border border-pv-line bg-white px-3 text-[13px] font-semibold leading-5 text-pv-ink transition-colors hover:bg-pv-page'
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
          {TABS.map(({ id }) => (
            <div
              key={id}
              role="tabpanel"
              id={`panel-${id}`}
              aria-labelledby={`tab-${id}`}
              hidden={activeTab !== id}
              className="p-4 sm:p-6"
            >
              {id === 'comparison' ? <ScenarioComparison /> : null}
              {id === 'narrative' ? <GeminiNarrative /> : null}
              {id === 'parameters' ? <OperatingParameters /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section id="features" className="scroll-mt-24 border-y border-pv-line bg-white">
      <div className="mx-auto w-full max-w-[1264px] px-6 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Operational pillars"
          title="Built for defensible operating decisions."
          subtitle="Four systems work together: model the plant, calculate the deltas, explain the result and hold every claim to its evidence."
        />
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex flex-col gap-3 rounded-xl border border-pv-line bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-pv-highlight text-pv-brand">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h3>
              <p className="text-[14px] leading-6 text-pv-ink-light">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lifecycle() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-pv-page">
      <div className="mx-auto w-full max-w-[1264px] px-6 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Simulation lifecycle"
          title="Configure. Simulate. Publish."
          subtitle="A bounded three-step path from operating assumptions to a reviewed public snapshot."
        />
        <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {LIFECYCLE.map(({ step, icon: Icon, title, description }) => (
            <li key={step} className="flex flex-col gap-4 rounded-xl border border-pv-line bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-pv-action">
                  Step {step}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pv-highlight text-pv-brand">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <h3 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h3>
              <p className="text-[14px] leading-6 text-pv-ink-light">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Accountability() {
  return (
    <section id="science" className="scroll-mt-24 border-y border-pv-line bg-white">
      <div className="mx-auto grid w-full max-w-[1264px] grid-cols-1 gap-8 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Public accountability & auditability"
            title="Every number carries its source."
            subtitle="Emissions are calculated with the official Philippine DOE grid factor for the Luzon–Visayas grid. Results stay bounded, versioned and open to inspection."
          />
          <div className="rounded-xl border border-pv-line bg-pv-page p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pv-action">
                  Philippine DOE grid emission factor
                </p>
                <p className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.6px] tabular-nums text-pv-ink">
                  0.7122
                </p>
                <p className="mt-2 text-[14px] font-medium leading-5 text-pv-ink">
                  kg CO₂e per kWh · Luzon–Visayas
                </p>
              </div>
              <Globe2 size={28} className="shrink-0 text-pv-action" aria-hidden="true" />
            </div>
            <p className="mt-5 border-t border-pv-line pt-4 text-[12px] leading-4 text-pv-ink-light">
              2023 reporting year, carried forward for the modeled 2026 period. The gas basis and
              factor evidence status travel with every stored run.
            </p>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-pv-line bg-pv-page p-6">
          <h3 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Audit the evidence</h3>
          <ul className="flex flex-col gap-3">
            {AUDIT_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[14px] leading-5 text-pv-ink">
                <LockKeyhole size={16} className="mt-0.5 shrink-0 text-pv-action" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col gap-3">
            <Link to="/public/overview" className={PRIMARY_LINK}>
              View public overview
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/public/reports" className={OUTLINE_LINK}>
              Read reports & methodology
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ClosingBanner() {
  return (
    <section className="bg-pv-brand">
      <div className="mx-auto w-full max-w-[1264px] px-6 py-14 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-[700px] flex-col gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-pv-on-brand-muted">
              Pax Virentia Engine
            </p>
            <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-white sm:text-[34px] sm:leading-10">
              Decide with the numbers you can defend.
            </h2>
            <p className="text-[15px] leading-7 text-pv-on-brand-soft">
              Bring your operating assumptions into a bounded, auditable model — then publish only
              what the evidence supports.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className={MINT_LINK}>
              Enter Utility Workspace
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/public/overview" className={ON_FOREST_OUTLINE}>
              Explore Public Portal
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-pv-pine-border pt-6">
          <nav aria-label="Public portal" className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-medium leading-4 text-pv-on-brand-soft">
            <Link to="/public/overview" className="transition-colors hover:text-white">Overview</Link>
            <Link to="/public/impacts" className="transition-colors hover:text-white">Environmental impacts</Link>
            <Link to="/public/scenarios" className="transition-colors hover:text-white">Scenarios</Link>
            <Link to="/public/reports" className="transition-colors hover:text-white">Reports & methodology</Link>
            <Link to="/login" className="transition-colors hover:text-white">Utility sign in</Link>
          </nav>
          <div className="flex flex-col gap-2 text-[12px] leading-4 text-pv-on-brand-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Simulated estimates from an offline model. Not live measurements or a regulatory
              approval.
            </p>
            <p>© 2026 Pax Virentia. All rights reserved.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader />
      <main>
        <Hero />
        <PlatformShowcase />
        <Pillars />
        <Lifecycle />
        <Accountability />
        <ClosingBanner />
      </main>
    </div>
  );
}
