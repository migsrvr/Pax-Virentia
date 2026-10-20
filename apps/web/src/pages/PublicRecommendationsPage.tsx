import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { PUBLIC_RECOMMENDATIONS } from '../services/mockData';
import iconInfo from '../assets/pv/icon-info.svg';
import iconArrowRightWhite from '../assets/pv/icon-arrow-right-white.svg';

/**
 * P05 · Public recommendations (Figma 46:2) — public portal.
 * Intro callout + six recommendation cards with benefit boxes and pinned
 * "who acts" footers, then a reports/methodology CTA.
 */

const CHIP_TONES = {
  highlight: 'bg-pv-highlight text-pv-brand',
  analytics: 'bg-pv-analytics-bg text-pv-analytics-ink',
  info: 'bg-pv-info-bg text-pv-info',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
} as const;

const CARD_CLASS =
  'flex h-full flex-col items-start gap-4 rounded-xl border border-pv-line bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]';

export default function PublicRecommendationsPage() {
  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Recommendations" />

      <main>
        {/* Intro band */}
        <section className="border-b border-pv-line bg-white">
          <div className="mx-auto flex w-full max-w-[1264px] flex-col items-start gap-3 px-6 py-8 lg:px-8">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              {PUBLIC_RECOMMENDATIONS.heading}
            </h1>
            <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
              {PUBLIC_RECOMMENDATIONS.intro}
            </p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_RECOMMENDATIONS.chips.map((chip) => (
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
          {/* Scope callout */}
          <div className="flex w-full items-start gap-3 rounded-xl bg-pv-info-bg p-4">
            <div className="flex shrink-0 items-start pt-0.5">
              <img src={iconInfo} alt="" className="h-5 w-5" />
            </div>
            <p className="text-[14px] leading-5 text-pv-ink">{PUBLIC_RECOMMENDATIONS.callout}</p>
          </div>

          {/* Recommendation cards */}
          <section aria-label="Recommendations" className="grid gap-6 lg:grid-cols-3">
            {PUBLIC_RECOMMENDATIONS.cards.map((card) => {
              const benefitText =
                card.benefit.tone === 'positive' ? 'text-pv-positive' : 'text-pv-ink-light';
              const benefitBg =
                card.benefit.tone === 'positive' ? 'bg-pv-positive-bg' : 'bg-pv-page';
              return (
                <article key={card.id} className={CARD_CLASS}>
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-medium leading-4 ${CHIP_TONES[card.chip.tone]}`}
                  >
                    {card.chip.label}
                  </span>
                  <h2 className="max-w-[334px] text-[18px] font-semibold leading-[26px] text-pv-ink">{card.title}</h2>
                  <p
                    className="max-w-[334px] text-[14px] leading-5 text-pv-ink"
                    style={'descMaxPx' in card ? { maxWidth: card.descMaxPx } : undefined}
                  >
                    {card.description}
                  </p>
                  <div className={`flex w-full flex-col items-start gap-1 rounded-xl p-4 ${benefitBg}`}>
                    <p className={`text-[12px] font-medium leading-4 ${benefitText}`}>
                      {card.benefit.label}
                    </p>
                    <p className={`max-w-[302px] text-[14px] font-semibold leading-5 ${benefitText}`}>
                      {card.benefit.value}
                    </p>
                  </div>
                  <p className="text-[12px] leading-4 text-pv-ink-light">{card.note}</p>
                  <div className="mt-auto flex w-full flex-wrap items-start gap-4 border-t border-pv-line-soft pt-4">
                    {card.meta.map((item) => (
                      <p key={item} className="text-[12px] leading-4 text-pv-ink-light">
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Next-step CTA */}
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-pv-line bg-white px-6 py-4 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]">
            <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_RECOMMENDATIONS.cta.text}</p>
            <Link
              to="/public/reports"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90"
            >
              {PUBLIC_RECOMMENDATIONS.cta.button}
              <img src={iconArrowRightWhite} alt="" className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter current="Recommendations" />
    </div>
  );
}
