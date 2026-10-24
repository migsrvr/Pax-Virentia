import { Link } from 'react-router-dom';
import { Bolt, Cloud, Coins, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { LimitationsCard, LoadState, NoPublishedSnapshot } from '../components/public/PublicData';
import { CARD_CLASS, OUTLINE_BTN, boundaryText, findMetric, metricValue, useLatestPublicReport } from '../components/public/publicPortal';
import type { PublicSnapshot } from '../services/publications';
import { format } from '../services/simulation';

/**
 * P03 · Environmental impacts. Explains how each indicator is estimated by the
 * active offline model, beside the value from the latest reviewed snapshot.
 */

type Topic = {
  key: 'energy' | 'carbon' | 'economics' | 'ecology';
  anchor: string;
  title: string;
  icon: LucideIcon;
  how: string[];
  leavesOut: string;
  detail?: (snapshot: PublicSnapshot) => string | null;
};

const TOPICS: Topic[] = [
  {
    key: 'energy', anchor: 'energy-use', title: 'Energy use', icon: Bolt,
    how: [
      'Electricity = power rating of each pump and mixer × its load × the hours it runs over the period.',
      'Pumps are modelled at full load; mixers use the scenario’s mixing load.',
    ],
    leavesOut: 'Other plant loads such as lighting, offices or sludge handling are outside the model.',
    detail: (snapshot) => snapshot.energy?.energy_intensity_kwh_per_m3 != null
      ? `About ${format(snapshot.energy.energy_intensity_kwh_per_m3, 4)} kWh to treat each cubic metre (1,000 litres).` : null,
  },
  {
    key: 'carbon', anchor: 'emissions', title: 'Emissions from electricity', icon: Cloud,
    how: [
      'Emissions = electricity used × the published grid emission factor (kg per kWh) for the stated region and year.',
      'The factor’s gas basis (CO₂ or CO₂e) is kept with the result.',
    ],
    leavesOut: 'Chemical manufacture, transport, process emissions and other life-cycle stages are not included.',
    detail: (snapshot) => snapshot.carbon?.factor_kg_per_kwh != null
      ? `Grid factor used: ${format(snapshot.carbon.factor_kg_per_kwh, 4)} kg per kWh (${snapshot.carbon.gas_basis ?? 'stated basis'}).` : null,
  },
  {
    key: 'economics', anchor: 'costs', title: 'Operating cost', icon: Coins,
    how: [
      'Cost = electricity × tariff + chemical use × chemical price + labor + maintenance + other stated costs.',
      'Chemical use (kg) = dose (mg/L) × volume treated (m³) ÷ 1,000.',
    ],
    leavesOut: 'Capital cost, financing and long-term payback are not estimated.',
    detail: (snapshot) => {
      const total = snapshot.economics?.total_opex_php;
      const volume = snapshot.boundary.volume_m3;
      return total != null && volume ? `About ₱${format(total / volume)} per cubic metre for this period.` : null;
    },
  },
  {
    key: 'ecology', anchor: 'ecosystem', title: 'Ecosystem', icon: Sprout,
    how: [
      'No approved local ecological model exists yet, so downstream ecosystem stress is reported as not estimable.',
      'It would need paired water-quality observations and agreed ecological thresholds for the receiving waters.',
    ],
    leavesOut: '“Not estimable” is not zero impact and is not a finding that the water is safe.',
  },
];

export default function PublicImpactsPage() {
  const latest = useLatestPublicReport();
  const snapshot = latest.data?.snapshot_data;

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Environmental impacts" />
      <main className="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-6 pb-12 pt-8 lg:px-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Environmental impacts</h1>
          <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
            What the model estimates for the representative plant, how it does it, and what it leaves out.
            {snapshot ? ` Figures are simulated estimates from “${latest.data?.title}” (${boundaryText(snapshot)}).` : ''}
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <a key={topic.anchor} href={`#${topic.anchor}`}
                className="inline-flex h-11 items-center rounded-full border border-pv-line-strong bg-white px-4 text-[14px] font-medium leading-5 text-pv-ink hover:bg-pv-page">
                {topic.title}
              </a>
            ))}
          </nav>
        </div>

        <LoadState query={latest}>
          {!snapshot ? <NoPublishedSnapshot title="No published figures to show yet" /> : null}
          {TOPICS.map((topic) => {
            const metric = findMetric(snapshot, topic.key);
            const detail = snapshot && topic.detail ? topic.detail(snapshot) : null;
            return (
              <section key={topic.key} id={topic.anchor} className={`scroll-mt-6 grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_320px] ${CARD_CLASS}`}>
                <div className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-3 text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-pv-highlight">
                      <topic.icon size={22} className="text-pv-brand" aria-hidden="true" />
                    </span>
                    {topic.title}
                  </h2>
                  <h3 className="text-[14px] font-semibold text-pv-ink">How it is estimated</h3>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-5 text-pv-ink">
                    {topic.how.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                  <h3 className="text-[14px] font-semibold text-pv-ink">What it leaves out</h3>
                  <p className="text-[14px] leading-5 text-pv-ink-light">{topic.leavesOut}</p>
                </div>
                {snapshot ? (
                  <div className="flex flex-col gap-2 self-start rounded-xl bg-pv-page p-4">
                    <span className="text-[12px] font-medium leading-4 text-pv-ink-light">Latest published value</span>
                    <span className="text-[24px] font-semibold leading-8 tabular-nums text-pv-ink">
                      {metric ? metricValue(metric) : 'Not in this snapshot'}
                    </span>
                    {detail ? <span className="text-[12px] leading-4 text-pv-ink-light">{detail}</span> : null}
                  </div>
                ) : null}
              </section>
            );
          })}
          {snapshot ? <LimitationsCard snapshot={snapshot} /> : null}
        </LoadState>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[14px] text-pv-ink">Next: see how published scenarios with the same boundary compare.</p>
          <Link to="/public/scenarios" className={OUTLINE_BTN}>Compare published scenarios</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
