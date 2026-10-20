import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { PUBLIC_SCENARIO_COMPARISON } from '../services/mockData';
import iconArrowRightWhite from '../assets/pv/icon-arrow-right-white.svg';

/**
 * P04 · Compare published scenarios (Figma 44:2) — public portal.
 * Scenario cards, a diverging percent-change chart and a benefits table.
 */

type ScenarioId = 'current-operation' | 'pax-silica' | 'reduced-mixing';

/** Swatch colors per scenario (ink / teal / purple, as in P02–P03). */
const SCENARIO_SWATCH: Record<ScenarioId, string> = {
  'current-operation': 'bg-pv-ink',
  'pax-silica': 'bg-pv-action',
  'reduced-mixing': 'bg-pv-analytics',
};

const BAR_COLORS: Record<ScenarioId, string> = {
  'current-operation': 'bg-pv-ink',
  'pax-silica': 'bg-pv-action',
  'reduced-mixing': 'bg-pv-analytics',
};

const CHIP_TONES = {
  info: 'bg-pv-info-bg text-pv-info',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
  highlight: 'bg-pv-highlight text-pv-brand',
} as const;

/** The chart scale: one percentage point equals 10% of the axis column's
 *  363px content width, so a 6.5% bar renders at 235.9px on a 1440px
 *  viewport — exactly the frame's 36.298px-per-point sizing. */

const CARD_CLASS =
  'flex h-full flex-col items-start gap-4 rounded-xl border border-pv-line bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]';

export default function PublicScenariosPage() {
  const { change, table } = PUBLIC_SCENARIO_COMPARISON;

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Scenarios" />

      <main>
        {/* Intro band */}
        <section className="border-b border-pv-line bg-white">
          <div className="mx-auto flex w-full max-w-[1264px] flex-col items-start gap-3 px-6 py-8 lg:px-8">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              {PUBLIC_SCENARIO_COMPARISON.heading}
            </h1>
            <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
              {PUBLIC_SCENARIO_COMPARISON.intro}
            </p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_SCENARIO_COMPARISON.chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-medium leading-4 ${CHIP_TONES[chip.tone]}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1264px] flex-col gap-6 px-6 pb-12 pt-8 lg:px-8">
          {/* Scenario cards */}
          <section aria-label="Published scenarios" className="grid gap-6 lg:grid-cols-3">
            {PUBLIC_SCENARIO_COMPARISON.cards.map((card) => (
              <article key={card.id} className={CARD_CLASS}>
                <div className="flex w-full items-center gap-3">
                  <span className={`h-4 w-4 shrink-0 rounded-[4px] ${SCENARIO_SWATCH[card.id]}`} />
                  <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{card.label}</h2>
                </div>
                <p className="text-[14px] leading-5 text-pv-ink-light">{card.description}</p>
                <div className="flex w-full flex-col">
                  {card.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-pv-line-soft py-3"
                    >
                      <p className="text-[14px] font-medium leading-5 text-pv-ink">{metric.label}</p>
                      <p className="text-[14px] font-semibold leading-5 text-pv-ink">{metric.value}</p>
                      {'sub' in metric && (
                        <p className="text-[12px] leading-4 text-pv-ink-light">{metric.sub}</p>
                      )}
                      {'aside' in metric && (
                        <p
                          className={`text-right text-[12px] leading-4 ${
                            metric.aside.positive === true
                              ? 'font-medium text-pv-positive'
                              : 'text-pv-ink-light'
                          }`}
                        >
                          {metric.aside.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {card.note && (
                  <div className="w-full rounded-lg bg-pv-warning-bg p-3">
                    <p className="max-w-[310px] text-[12px] leading-4 text-pv-warning">{card.note}</p>
                  </div>
                )}
              </article>
            ))}
          </section>

          {/* Diverging percent-change chart */}
          <section className="flex w-full flex-col items-start gap-4 rounded-xl border border-pv-line bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]">
            <div className="flex w-full flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col items-start">
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{change.title}</h2>
                <p className="text-[12px] leading-4 text-pv-ink-light">{change.subtitle}</p>
              </div>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
                Simulated estimate
              </span>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-[2px] bg-pv-action" />
                <span className="text-[12px] leading-4 text-pv-ink">Pax Silica pilot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-[2px] bg-pv-analytics" />
                <span className="text-[12px] leading-4 text-pv-ink">Reduced mixing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-3 bg-pv-ink" />
                <span className="text-[12px] leading-4 text-pv-ink">Current operation = 0</span>
              </div>
            </div>
            <div className="flex w-full max-w-[880px] flex-col gap-3">
              {change.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[90px_minmax(0,365px)_minmax(0,365px)] items-center gap-x-0 sm:grid-cols-[150px_minmax(0,365px)_minmax(0,365px)]">
                  <p className="min-w-0 text-[14px] font-medium leading-5 text-pv-ink">{row.label}</p>
                  <div className="flex flex-col gap-1 border-r-2 border-pv-ink py-1">
                    {row.bars.map((bar) => (
                      <div key={bar.id} className="flex items-center justify-end gap-2">
                        <p className="text-[12px] font-semibold leading-4 text-pv-ink">{bar.text}</p>
                        <div
                          className={`h-4 rounded-l-[3px] ${BAR_COLORS[bar.id]}`}
                          style={{ width: `${bar.pct * 10}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div aria-hidden="true" />
                </div>
              ))}
              <div className="grid grid-cols-[90px_minmax(0,365px)_minmax(0,365px)] items-center gap-x-0 sm:grid-cols-[150px_minmax(0,365px)_minmax(0,365px)]">
                <div aria-hidden="true" />
                <div className="flex items-start justify-between text-[12px] leading-4 text-pv-ink-light">
                  {change.negativeTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="flex items-start justify-between text-[12px] leading-4 text-pv-ink-light">
                  {change.positiveTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Benefits and trade-offs table */}
          <section className="flex w-full flex-col overflow-clip rounded-xl border border-pv-line bg-white shadow-[0px_1px_2px_0px_rgba(21,63,53,0.05)]">
            <div className="w-full px-6 pb-4 pt-6">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{table.title}</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <div className="grid min-w-[980px] grid-cols-[239.6px_492.9px_minmax(0,1fr)]">
                {table.headers.map((header) => (
                  <div key={header} className="border-b border-pv-line bg-pv-page px-4 py-3">
                    <p className="text-[12px] font-medium leading-4 text-pv-ink-light">{header}</p>
                  </div>
                ))}
                {table.rows.map((row, index) => (
                  <div key={row.label} className="contents">
                    <div className="flex items-center border-b border-pv-line bg-pv-page px-4 py-4">
                      <p className="text-[12px] font-semibold leading-4 text-pv-ink-light">{row.label}</p>
                    </div>
                    <div className={`p-4 ${index < table.rows.length - 1 ? 'border-b border-pv-line-soft' : ''}`}>
                      <p className="text-[14px] leading-5 text-pv-ink">{row.benefit}</p>
                    </div>
                    <div className={`p-4 ${index < table.rows.length - 1 ? 'border-b border-pv-line-soft' : ''}`}>
                      <p className="text-[14px] leading-5 text-pv-ink">{row.tradeoff}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Next-step CTA */}
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-line bg-white px-6 py-4 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]">
            <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_SCENARIO_COMPARISON.cta.text}</p>
            <Link
              to="/public/recommendations"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90"
            >
              {PUBLIC_SCENARIO_COMPARISON.cta.button}
              <img src={iconArrowRightWhite} alt="" className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter current="Scenarios" />
    </div>
  );
}
