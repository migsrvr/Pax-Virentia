import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { PUBLIC_IMPACTS, formatNum } from '../services/mockData';
import iconBoltInk from '../assets/pv/icon-bolt-ink.svg';
import iconCloudInk from '../assets/pv/icon-cloud-ink.svg';
import iconCoinsInk from '../assets/pv/icon-coins-ink.svg';
import iconSproutInk from '../assets/pv/icon-sprout-ink.svg';
import iconDroplet from '../assets/pv/icon-droplet.svg';
import iconDashedCircle from '../assets/pv/icon-dashed-circle.svg';
import iconCheck from '../assets/pv/icon-check.svg';
import iconWarning from '../assets/pv/icon-warning.svg';
import iconXCircle from '../assets/pv/icon-x-circle.svg';
import iconArrowRightWhite from '../assets/pv/icon-arrow-right-white.svg';

/**
 * P03 · Environmental impacts (Figma 43:2) — public portal.
 * Static explainer page: one text column + one chart card per topic.
 */

type ScenarioId = 'current-operation' | 'pax-silica' | 'reduced-mixing';

const TOPIC_ICONS = {
  bolt: iconBoltInk,
  cloud: iconCloudInk,
  coins: iconCoinsInk,
  sprout: iconSproutInk,
} as const;

/** Scenario bar colors — Current ink, Pax teal, Reduced purple (as in P02). */
const SCENARIO_BAR_COLORS: Record<ScenarioId, string> = {
  'current-operation': 'bg-pv-ink',
  'pax-silica': 'bg-pv-action',
  'reduced-mixing': 'bg-pv-analytics',
};

const CARD_CLASS =
  'flex w-full flex-col items-start gap-4 self-start rounded-xl border border-pv-line bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]';

function CardHeader({ title, subtitle, chip }: { title: string; subtitle: string; chip?: string }) {
  return (
    <div className="flex w-full flex-wrap items-start justify-between gap-2">
      <div className="flex flex-col items-start">
        <h3 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h3>
        <p className="text-[12px] leading-4 text-pv-ink-light">{subtitle}</p>
      </div>
      {chip === 'Simulated estimate' && (
        <span className="inline-flex h-6 items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
          {chip}
        </span>
      )}
      {chip === 'Not estimable' && (
        <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
          {chip}
        </span>
      )}
    </div>
  );
}

function Legend({ items, colors }: { items: readonly string[]; colors: string[] }) {
  return (
    <div className="flex flex-wrap gap-6">
      {items.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-[2px] ${colors[i]}`} />
          <span className="text-[12px] leading-4 text-pv-ink">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Left text column shared by all four sections. */
function TextColumn({
  heading,
  intro,
  children,
}: {
  heading: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 self-start">
      <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">{heading}</h2>
      <div className="text-[14px] leading-5 text-pv-ink">{intro}</div>
      {children}
    </div>
  );
}

function MiniHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-[14px] font-semibold leading-5 text-pv-ink">{children}</h3>;
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-1 pl-5">
      {items.map((item) => (
        <li key={item} className="relative text-[14px] leading-5 text-pv-ink-light">
          <span className="absolute -left-5 flex w-[14px] items-center justify-end">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PublicImpactsPage() {
  const { energy, emissions, costs, ecosystem } = PUBLIC_IMPACTS;
  const maxEnergy = Math.max(...energy.rows.map((r) => r.total));
  const maxEmissions = Math.max(...emissions.rows.map((r) => r.total));
  const maxCosts = Math.max(...costs.rows.map((r) => r.total));

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Environmental impacts" />

      <main>
        {/* Intro band */}
        <section className="border-b border-pv-line bg-white">
          <div className="mx-auto flex w-full max-w-[1264px] flex-col items-start gap-4 px-6 py-8 lg:px-8">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              Environmental impacts
            </h1>
            <p className="max-w-[720px] text-[14px] leading-5 text-pv-ink-light">
              {PUBLIC_IMPACTS.intro}
            </p>
            <nav aria-label="Topics on this page" className="flex flex-wrap gap-2">
              {PUBLIC_IMPACTS.topics.map((topic) => (
                <a
                  key={topic.anchor}
                  href={`#${topic.anchor}`}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-pv-line-strong bg-white px-4 text-[14px] font-medium leading-5 text-pv-ink transition-colors hover:border-pv-ink"
                >
                  <img src={TOPIC_ICONS[topic.icon]} alt="" className="h-[18px] w-[18px]" />
                  {topic.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1264px] flex-col gap-12 px-6 py-12 lg:px-8">
          {/* Energy use */}
          <section id="energy-use" className="grid gap-6 scroll-mt-6 lg:grid-cols-[490px_minmax(0,686px)]">
            <TextColumn heading={energy.heading} intro={energy.intro}>
              <MiniHeading>How it's estimated</MiniHeading>
              <p className="text-[14px] leading-5 text-pv-ink-light">{energy.how}</p>
              <MiniHeading>Not included</MiniHeading>
              <BulletList items={energy.notIncluded} />
              <div className="flex w-full items-center gap-3 rounded-xl bg-pv-info-bg p-4">
                <img src={iconDroplet} alt="" className="h-6 w-6 shrink-0" />
                <div className="flex flex-col">
                  <p className="text-[14px] font-semibold leading-5 text-pv-info">{energy.callout.title}</p>
                  <p className="text-[12px] leading-4 text-pv-info">{energy.callout.detail}</p>
                </div>
              </div>
            </TextColumn>
            <div className={CARD_CLASS}>
              <CardHeader title={energy.cardTitle} subtitle={energy.cardSubtitle} chip="Simulated estimate" />
              <Legend items={energy.legend} colors={['bg-pv-brand', 'bg-pv-action']} />
              <div className="flex w-full flex-col gap-4">
                {energy.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[130px_minmax(0,372px)_110px] items-center gap-x-3"
                  >
                    <p className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</p>
                    <div
                      className="flex h-[22px] gap-[2px]"
                      style={{ width: `${(row.total / maxEnergy) * 100}%` }}
                    >
                      <div
                        className="min-w-px rounded-l-[3px] bg-pv-brand"
                        style={{ flex: `${energy.pumpsKwh} 0 0` }}
                      />
                      <div
                        className="min-w-px rounded-r-[3px] bg-pv-action"
                        style={{ flex: `${row.mixersKwh} 0 0` }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[14px] leading-5 text-pv-ink">
                      {formatNum(row.total)} kWh
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[14px] leading-5 text-pv-ink-light">{energy.footnote}</p>
            </div>
          </section>

          {/* Emissions */}
          <section id="emissions" className="grid gap-6 scroll-mt-6 lg:grid-cols-[490px_minmax(0,686px)]">
            <TextColumn heading={emissions.heading} intro={emissions.intro}>
              <MiniHeading>How it's estimated</MiniHeading>
              <p className="text-[14px] leading-5 text-pv-ink-light">{emissions.how}</p>
              <MiniHeading>Not included</MiniHeading>
              <BulletList items={emissions.notIncluded} />
            </TextColumn>
            <div className={CARD_CLASS}>
              <CardHeader title={emissions.cardTitle} subtitle={emissions.cardSubtitle} chip="Simulated estimate" />
              <div className="flex w-full flex-col gap-4">
                {emissions.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[130px_minmax(0,372px)_110px] items-center gap-x-3"
                  >
                    <p className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</p>
                    <div className="min-w-0">
                      <div
                        className={`h-[22px] rounded-[3px] ${SCENARIO_BAR_COLORS[row.id]}`}
                        style={{ width: `${(row.total / maxEmissions) * 100}%` }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[14px] leading-5 text-pv-ink">
                      {formatNum(row.total)} kg
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 rounded-xl bg-pv-page p-4">
                <div className="flex flex-col">
                  <p className="text-[12px] leading-4 text-pv-ink-light">{emissions.formula.electricityLabel}</p>
                  <p className="text-[14px] font-semibold leading-5 text-pv-ink">{emissions.formula.electricity}</p>
                </div>
                <span className="text-[14px] leading-5 text-pv-ink-light">×</span>
                <div className="flex flex-col">
                  <p className="text-[12px] leading-4 text-pv-ink-light">{emissions.formula.factorLabel}</p>
                  <p className="text-[14px] font-semibold leading-5 text-pv-ink">{emissions.formula.factor}</p>
                </div>
                <span className="text-[14px] leading-5 text-pv-ink-light">=</span>
                <div className="flex flex-col">
                  <p className="text-[12px] leading-4 text-pv-ink-light">{emissions.formula.resultLabel}</p>
                  <p className="text-[14px] font-semibold leading-5 text-pv-ink">{emissions.formula.result}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Costs */}
          <section id="costs" className="grid gap-6 scroll-mt-6 lg:grid-cols-[490px_minmax(0,686px)]">
            <TextColumn heading={costs.heading} intro={costs.intro}>
              <MiniHeading>How it's estimated</MiniHeading>
              <p className="text-[14px] leading-5 text-pv-ink-light">{costs.how}</p>
            </TextColumn>
            <div className={CARD_CLASS}>
              <CardHeader title={costs.cardTitle} subtitle={costs.cardSubtitle} chip="Simulated estimate" />
              <Legend items={costs.legend} colors={['bg-pv-action', 'bg-pv-brand']} />
              <div className="flex w-full flex-col gap-4">
                {costs.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[130px_minmax(0,372px)_110px] items-center gap-x-3"
                  >
                    <p className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</p>
                    <div
                      className="flex h-[22px] gap-[2px]"
                      style={{ width: `${(row.total / maxCosts) * 100}%` }}
                    >
                      <div
                        className="min-w-px rounded-l-[3px] bg-pv-action"
                        style={{ flex: `${row.electricity} 0 0` }}
                      />
                      <div
                        className="min-w-px rounded-r-[3px] bg-pv-brand"
                        style={{ flex: `${row.total - row.electricity} 0 0` }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[14px] leading-5 text-pv-ink">
                      ₱{formatNum(row.total)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[14px] leading-5 text-pv-ink-light">{costs.footnote}</p>
            </div>
          </section>

          {/* Ecosystem indicators */}
          <section id="ecosystem" className="grid gap-6 scroll-mt-6 lg:grid-cols-[490px_minmax(0,686px)]">
            <TextColumn
              heading={ecosystem.heading}
              intro={
                <>
                  {ecosystem.introLead}
                  <strong className="font-semibold">{ecosystem.introBold}</strong>
                  {ecosystem.introTail}
                </>
              }
            >
              <MiniHeading>{ecosystem.whyHeading}</MiniHeading>
              <p className="text-[14px] leading-5 text-pv-ink-light">{ecosystem.why}</p>
              <MiniHeading>{ecosystem.whatHeading}</MiniHeading>
              <BulletList items={ecosystem.what} />
            </TextColumn>
            <div className="flex w-full flex-col items-start gap-4 self-start rounded-xl border border-dashed border-pv-line-strong bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]">
              <CardHeader title={ecosystem.cardTitle} subtitle={ecosystem.cardSubtitle} chip={ecosystem.chip} />
              <div className="flex w-full items-center gap-3 rounded-xl bg-pv-page p-4">
                <img src={iconDashedCircle} alt="" className="h-6 w-6 shrink-0" />
                <p className="text-[14px] leading-5 text-pv-ink">{ecosystem.callout}</p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-pv-warning-bg px-2 text-[12px] font-medium leading-4 text-pv-warning">
                    {ecosystem.scaleChip}
                  </span>
                  <span className="text-[12px] leading-4 text-pv-ink-light">{ecosystem.scaleCaption}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {ecosystem.scale.map((level) => {
                    const tone =
                      level.tone === 'positive'
                        ? 'bg-pv-positive-bg text-pv-positive'
                        : level.tone === 'warning'
                          ? 'bg-pv-warning-bg text-pv-warning'
                          : 'bg-pv-critical-bg text-pv-critical';
                    const [bgClass, textClass] = tone.split(' ');
                    const icon =
                      level.tone === 'positive' ? iconCheck : level.tone === 'warning' ? iconWarning : iconXCircle;
                    return (
                      <div key={level.title} className={`flex flex-col gap-2 rounded-xl p-4 ${bgClass} ${textClass}`}>
                        <div className="flex items-center gap-2">
                          <img src={icon} alt="" className="h-[18px] w-[18px]" />
                          <p className="text-[14px] font-semibold leading-5">{level.title}</p>
                        </div>
                        <p className="text-[12px] leading-4">{level.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Next-step CTA */}
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-line bg-white px-6 py-4 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]">
            <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_IMPACTS.cta.text}</p>
            <Link
              to="/public/scenarios"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90"
            >
              {PUBLIC_IMPACTS.cta.button}
              <img src={iconArrowRightWhite} alt="" className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter current="Environmental impacts" />
    </div>
  );
}
