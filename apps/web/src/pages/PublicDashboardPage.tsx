import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { PUBLIC_DASHBOARD, formatNum } from '../services/mockData';
import iconBolt from '../assets/pv/icon-bolt.svg';
import iconArrowDown from '../assets/pv/icon-arrow-down.svg';
import iconCloud from '../assets/pv/icon-cloud.svg';
import iconCoins from '../assets/pv/icon-coins.svg';
import iconSprout from '../assets/pv/icon-sprout.svg';
import iconDashedCircle from '../assets/pv/icon-dashed-circle.svg';
import iconArrowRightSm from '../assets/pv/icon-arrow-right-sm.svg';

/**
 * Public portal dashboard — Figma "P02 · Public dashboard" (node 42:2).
 * The scenario toggle is functional: card values, deltas and the electricity
 * split all follow the selected published scenario.
 */

type Scenario = (typeof PUBLIC_DASHBOARD.scenarios)[number];
type ScenarioId = Scenario['id'];

const BAR_ORDER: ScenarioId[] = ['current-operation', 'pax-silica', 'reduced-mixing'];

const SCENARIO_BAR_COLORS: Record<ScenarioId, string> = {
  'current-operation': 'bg-pv-ink',
  'pax-silica': 'bg-pv-action',
  'reduced-mixing': 'bg-pv-analytics',
};

const SCENARIO_LABELS = Object.fromEntries(
  PUBLIC_DASHBOARD.scenarios.map((s) => [s.id, s.label]),
) as Record<ScenarioId, string>;

function DeltaPill({ pct, baseline }: { pct: string | null; baseline: boolean }) {
  if (baseline || pct === null) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
        Baseline
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-pv-positive-bg px-2 text-[12px] font-medium leading-4 text-pv-positive">
      <img src={iconArrowDown} alt="" className="h-3.5 w-3.5" />
      {pct}
    </span>
  );
}

function MetricCard({
  icon,
  title,
  detail,
  value,
  unit,
  pct,
  abs,
  note,
  baseline,
}: {
  icon: string;
  title: string;
  detail: string;
  value: string;
  unit: string;
  pct: string | null;
  abs: string;
  note: string;
  baseline: boolean;
}) {
  return (
    <article className="flex min-h-[307px] flex-col gap-4 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pv-highlight">
          <img src={icon} alt="" className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <p className="text-[14px] font-semibold leading-5 text-pv-ink">{title}</p>
          <p className="text-[12px] leading-4 text-pv-ink-light">{detail}</p>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">{value}</p>
        <p className="text-[14px] font-medium leading-5 text-pv-ink-light">{unit}</p>
      </div>
      <div className="flex flex-col items-start gap-2">
        <DeltaPill pct={pct} baseline={baseline} />
        <p className="text-[12px] leading-4 text-pv-ink-light">{abs}</p>
      </div>
      <p className="text-[14px] leading-5 text-pv-ink">{note}</p>
      <div className="mt-auto w-full border-t border-pv-line-soft pt-4">
        <p className="text-[12px] leading-4 text-pv-ink-light">Simulated estimate</p>
      </div>
    </article>
  );
}

export default function PublicDashboardPage() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('pax-silica');
  const scenario =
    PUBLIC_DASHBOARD.scenarios.find((s) => s.id === scenarioId) ?? PUBLIC_DASHBOARD.scenarios[0];

  const pumpsKwh = scenario.pumpsKwh;
  const mixersKwh = scenario.electricity - pumpsKwh;
  const pumpsPct = ((pumpsKwh / scenario.electricity) * 100).toFixed(1);
  const mixersPct = ((mixersKwh / scenario.electricity) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Overview" />

      <main>
        {/* Page header band */}
        <section className="border-b border-pv-line bg-white">
          <div className="flex w-full flex-col gap-3 px-6 py-8 lg:px-8">
            <p className="text-[12px] font-medium leading-4 text-pv-ink-light">
              Published snapshot PS-004
            </p>
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              Sustainability dashboard
            </h1>
            <p className="text-[14px] leading-5 text-pv-ink-light">
              Sample Water District · representative treatment plant · 1–5 Jan 2026 (5 days, 61,600
              m³ of water treated) · published 13 Oct 2026
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <span className="inline-flex h-6 items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
                Simulated estimate
              </span>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
                Sample data
              </span>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-highlight px-2 text-[12px] font-medium leading-4 text-pv-brand">
                Reviewed internally · not a regulatory approval
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1264px] px-6 pb-12 pt-8 lg:px-8">
          <div className="flex flex-col gap-6">
            {/* Showing + scenario toggle */}
            <section className="flex min-w-0 flex-col">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                {scenario.showingTitle}
              </h2>
              <p className="mt-1 text-[14px] leading-5 text-pv-ink-light">
                {scenario.showingDetail}
              </p>
              <div className="mt-4 inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-pv-line bg-white p-1">
                {PUBLIC_DASHBOARD.scenarios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenarioId(s.id)}
                    aria-pressed={s.id === scenario.id}
                    className={`inline-flex h-9 items-center rounded-lg px-4 text-[14px] font-semibold leading-5 transition-colors ${
                      s.id === scenario.id
                        ? 'bg-pv-brand text-white'
                        : 'text-pv-ink hover:bg-pv-muted-bg'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Published indicators */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={iconBolt}
                title="Electricity used"
                detail="To treat 61,600 m³ over 5 days"
                value={formatNum(scenario.electricity)}
                unit="kWh"
                pct={scenario.electricityDelta.pct}
                abs={scenario.electricityDelta.abs}
                note={scenario.electricityNote}
                baseline={scenario.baseline}
              />
              <MetricCard
                icon={iconCloud}
                title="CO₂e emissions"
                detail="From the electricity used"
                value={formatNum(scenario.co2e)}
                unit="kg CO₂e"
                pct={scenario.co2eDelta.pct}
                abs={scenario.co2eDelta.abs}
                note={scenario.co2eNote}
                baseline={scenario.baseline}
              />
              <MetricCard
                icon={iconCoins}
                title="Operating cost"
                detail="For the 5-day period"
                value={`₱${formatNum(scenario.cost)}`}
                unit="PHP"
                pct={scenario.costDelta.pct}
                abs={scenario.costDelta.abs}
                note={scenario.costNote}
                baseline={scenario.baseline}
              />
              <article className="flex min-h-[307px] flex-col gap-4 rounded-xl border border-dashed border-pv-line-strong bg-white p-6 shadow-pv">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pv-muted-bg">
                    <img src={iconSprout} alt="" className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col">
                    <p className="text-[14px] font-semibold leading-5 text-pv-ink">
                      Environmental indicator
                    </p>
                    <p className="text-[12px] leading-4 text-pv-ink-light">
                      Downstream ecosystem stress
                    </p>
                  </div>
                </div>
                <div className="flex min-h-[36px] items-center gap-2">
                  <img src={iconDashedCircle} alt="" className="h-5 w-5" />
                  <p className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                    Not estimable
                  </p>
                </div>
                <div className="flex flex-col items-start">
                  <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
                    Evidence gate not met
                  </span>
                </div>
                <p className="text-[14px] leading-5 text-pv-ink">
                  There isn’t enough local river and coastal data to estimate this reliably yet.
                </p>
                <div className="mt-auto flex w-full items-center justify-between border-t border-pv-line-soft pt-4">
                  <p className="text-[12px] leading-4 text-pv-ink-light">Not a zero — just unknown</p>
                  <a
                    href="#"
                    className="text-[12px] font-semibold leading-4 text-pv-action transition-colors hover:underline"
                  >
                    Learn why
                  </a>
                </div>
              </article>
            </section>

            {/* Scenario comparison + electricity split */}
            <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[784px_392px]">
              <article className="flex min-h-[514px] flex-col gap-5 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                    How the published scenarios compare
                  </h2>
                  <p className="text-[12px] leading-4 text-pv-ink-light">
                    Same water volume, period and grid · bars start at zero
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  {BAR_ORDER.map((id) => (
                    <span key={id} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-[2px] ${SCENARIO_BAR_COLORS[id]}`} />
                      <span className="text-[12px] leading-4 text-pv-ink">
                        {SCENARIO_LABELS[id]}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-5">
                  {PUBLIC_DASHBOARD.comparison.map((group) => {
                    const max = Math.max(...Object.values(group.values));
                    return (
                      <div key={group.heading} className="flex flex-col gap-1.5">
                        <p className="text-[14px] font-semibold leading-5 text-pv-ink">
                          {group.heading}
                        </p>
                        {BAR_ORDER.map((id) => {
                          const value = group.values[id];
                          return (
                            <div
                              key={id}
                              className="grid grid-cols-[140px_minmax(0,1fr)_96px] items-center gap-3"
                            >
                              <p className="text-[12px] leading-4 text-pv-ink-light">
                                {SCENARIO_LABELS[id]}
                              </p>
                              <div
                                className={`h-3.5 rounded-[3px] ${SCENARIO_BAR_COLORS[id]}`}
                                style={{ width: `${(value / max) * 100}%` }}
                              />
                              <p className="text-[12px] leading-4 text-pv-ink">
                                {formatNum(value)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <Link
                  to="/public/scenarios"
                  className="mt-auto inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold leading-5 text-pv-action transition-colors hover:underline"
                >
                  Compare scenarios in detail
                  <img src={iconArrowRightSm} alt="" className="h-4 w-4" />
                </Link>
              </article>

              <article className="flex flex-col gap-4 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                    Where the electricity goes
                  </h2>
                  <p className="text-[12px] leading-4 text-pv-ink-light">{scenario.label}</p>
                </div>
                <div className="flex h-7 w-full gap-0.5">
                  <div className="rounded-l bg-pv-brand" style={{ width: `${pumpsPct}%` }} />
                  <div className="min-w-0 flex-1 rounded-r bg-pv-action" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-[2px] bg-pv-brand" />
                    <div className="flex flex-col">
                      <p className="text-[14px] font-semibold leading-5 text-pv-ink">
                        Pumps · {pumpsPct}%
                      </p>
                      <p className="text-[14px] leading-5 text-pv-ink-light">
                        {formatNum(pumpsKwh)} kWh moving water through the plant
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-[2px] bg-pv-action" />
                    <div className="flex flex-col">
                      <p className="text-[14px] font-semibold leading-5 text-pv-ink">
                        Mixers · {mixersPct}%
                      </p>
                      <p className="text-[14px] leading-5 text-pv-ink-light">
                        {formatNum(mixersKwh)} kWh helping chemicals bind dirt so it settles
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] leading-4 text-pv-ink-light">
                  Other equipment, such as filters and disinfection, isn’t modeled yet.
                </p>
              </article>
            </section>

            {/* Meaning / limits */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className="flex min-h-[224px] flex-col gap-3 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  What these numbers mean
                </h2>
                <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-pv-ink">
                  {PUBLIC_DASHBOARD.meaning.map((item) => (
                    <li key={item} className="text-[14px] leading-5 text-pv-ink">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="flex min-h-[224px] flex-col gap-3 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  Limits of this snapshot
                </h2>
                <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-pv-ink">
                  {PUBLIC_DASHBOARD.limits.map((item) => (
                    <li key={item} className="text-[14px] leading-5 text-pv-ink">
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className="mt-auto inline-flex min-h-[44px] items-center text-[14px] font-semibold leading-5 text-pv-action transition-colors hover:underline"
                >
                  Read the methodology and assumptions
                </a>
              </article>
            </section>

            {/* Next-step CTA */}
            <section className="flex min-h-[76px] flex-col gap-4 rounded-xl border border-pv-line bg-white px-6 py-4 shadow-pv lg:flex-row lg:items-center lg:justify-between">
              <p className="text-[14px] leading-5 text-pv-ink-light">
                Next: see how each estimate is made and what it leaves out.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/public/scenarios"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-ink"
                >
                  Compare scenarios
                </Link>
                <Link
                  to="/public/impacts"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90"
                >
                  Explore environmental impacts
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter current="Dashboard" />
    </div>
  );
}
