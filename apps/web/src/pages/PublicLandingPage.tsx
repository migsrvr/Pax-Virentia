import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { LoadState, MetricList } from '../components/public/PublicData';
import { boundaryText, publishedOn, useLatestPublicReport } from '../components/public/publicPortal';
import logoStacked from '../assets/pv/logo-pax-virentia-stacked.png';
import iconArrowRightLg from '../assets/pv/icon-arrow-right-lg.svg';
import iconArrowRightSm from '../assets/pv/icon-arrow-right-sm.svg';
import iconUtilitySigninHero from '../assets/pv/icon-utility-signin-hero.svg';
import iconDashboard from '../assets/pv/icon-dashboard.svg';
import iconImpacts from '../assets/pv/icon-impacts.svg';
import iconScenarios from '../assets/pv/icon-scenarios.svg';
import iconReports from '../assets/pv/icon-reports.svg';
import iconCheck from '../assets/pv/icon-check.svg';
import iconCross from '../assets/pv/icon-cross.svg';

/**
 * Public portal landing page — Figma "P01 · Landing" (node 39:2).
 * The snapshot card shows the most recently approved publication; with none
 * published it says so instead of showing sample figures.
 */

const EXPLORE_CARDS = [
  {
    title: 'Sustainability dashboard',
    description: 'The four headline indicators, explained in plain language.',
    icon: iconDashboard,
    to: '/public/overview',
  },
  {
    title: 'Environmental impacts',
    description:
      'Energy, emissions, costs and ecosystem indicators — and how each is estimated.',
    icon: iconImpacts,
    to: '/public/impacts',
  },
  {
    title: 'Scenario comparison',
    description: 'Published scenarios with the same boundary, side by side.',
    icon: iconScenarios,
    to: '/public/scenarios',
  },
  {
    title: 'Reports and methodology',
    description: 'Download reports and read every assumption behind the numbers.',
    icon: iconReports,
    to: '/public/reports',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Utilities model scenarios',
    description:
      'Analysts enter plant data and assumptions into an offline model — no live connection to the plant.',
  },
  {
    step: '2',
    title: 'The model estimates outcomes',
    description:
      'Electricity use, CO₂e emissions and operating costs for each scenario, over the same water volume and period.',
  },
  {
    step: '3',
    title: 'Results are reviewed, then published',
    description:
      'Selected results appear here with their assumptions and limits. Drafts and internal notes never do.',
  },
];

const PORTAL_IS = [
  'Simulated estimates from a model and sample data',
  'Published only after an internal review',
  'Open about every assumption and limitation',
];

const PORTAL_IS_NOT = [
  'Live monitoring of a treatment plant or its sensors',
  'A regulatory approval or certification',
  'Independently validated measurements',
];

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
        {title}
      </h2>
      {subtitle && <p className="text-[14px] leading-5 text-pv-ink-light">{subtitle}</p>}
    </div>
  );
}

function ExploreCard({ card }: { card: (typeof EXPLORE_CARDS)[number] }) {
  const className =
    'flex flex-col gap-3 rounded-xl border border-pv-line bg-white p-6 shadow-pv transition-colors hover:border-pv-line-strong';
  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pv-highlight">
        <img src={card.icon} alt="" className="h-[22px] w-[22px]" />
      </span>
      <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">{card.title}</span>
      <span className="text-[14px] leading-5 text-pv-ink-light">{card.description}</span>
    </>
  );
  return card.to.startsWith('/') ? (
    <Link to={card.to} className={className}>
      {content}
    </Link>
  ) : (
    <a href={card.to} className={className}>
      {content}
    </a>
  );
}

function PortalListCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-pv-line bg-white p-6 shadow-pv">
      <h3 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{title}</h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <img src={icon} alt="" className="h-5 w-5 shrink-0" />
            <span className="text-[14px] leading-5 text-pv-ink">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SnapshotCard() {
  const latest = useLatestPublicReport();
  const report = latest.data;
  return (
    <div className="w-full shrink-0 rounded-xl border border-pv-line bg-white p-6 shadow-pv lg:w-[520px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
            Latest published snapshot
          </h2>
          {report ? (
            <p className="text-[12px] leading-4 text-pv-ink-light">
              {report.title} · {boundaryText(report.snapshot_data)}
            </p>
          ) : null}
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
          Simulated estimate
        </span>
      </div>
      <LoadState query={latest}>
        {report?.snapshot_data ? (
          <>
            <div className="mt-2"><MetricList snapshot={report.snapshot_data} /></div>
            <Link
              to={`/public/reports/${report.slug}`}
              className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold leading-5 text-pv-action transition-colors hover:underline"
            >
              Read the full report
              <img src={iconArrowRightSm} alt="" className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <p className="mt-3 text-[14px] leading-5 text-pv-ink-light">
            No snapshot has been published yet. Results appear here only after a utility reviewer approves them.
          </p>
        )}
      </LoadState>
    </div>
  );
}

function SnapshotFootnote() {
  const latest = useLatestPublicReport();
  if (!latest.data) return null;
  return (
    <p className="text-[12px] leading-4 text-pv-on-brand-muted">
      Latest snapshot published {publishedOn(latest.data.published_at)} after internal review · not a regulatory approval
    </p>
  );
}

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-pv-brand">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center lg:px-8">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <span className="inline-flex h-6 w-fit items-center rounded-full bg-pv-highlight px-2 text-[12px] font-medium leading-4 text-pv-brand">
                Public portal · representative plant · simulated estimates
              </span>
              <h1 className="max-w-[560px] text-[28px] font-semibold leading-9 tracking-[-0.28px] text-white">
                See how treating your water affects energy use, emissions and costs
              </h1>
              <p className="max-w-[560px] text-[14px] leading-5 text-pv-on-brand-soft">
                Pax Virentia publishes simulation results for a representative water-treatment
                plant, so anyone can see the trade-offs between treatment options. Every figure here
                is a simulated estimate — not a live measurement.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/public/overview"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-pv-highlight px-4 text-[14px] font-semibold leading-5 text-pv-brand transition-colors hover:bg-white"
                >
                  Explore published results
                  <img src={iconArrowRightLg} alt="" className="h-[18px] w-[18px]" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-pv-on-brand-muted px-4 text-[14px] font-semibold leading-5 text-white transition-colors hover:bg-white/10"
                >
                  <img src={iconUtilitySigninHero} alt="" className="h-[18px] w-[18px]" />
                  Utility sign in
                </Link>
              </div>
              <SnapshotFootnote />
            </div>
            <SnapshotCard />
          </div>
        </section>

        {/* What you can explore */}
        <section className="mx-auto w-full max-w-[1264px] px-6 pt-12 lg:px-8">
          <SectionHeading
            title="What you can explore"
            subtitle="Published, reviewed results — no account needed."
          />
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {EXPLORE_CARDS.map((card) => (
              <ExploreCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-[1264px] px-6 pt-12 lg:px-8">
          <SectionHeading title="How it works" />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="flex flex-col gap-3 rounded-xl border border-pv-line bg-white p-6 shadow-pv"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-pv-brand text-[14px] font-semibold leading-5 text-white">
                  {step.step}
                </span>
                <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  {step.title}
                </span>
                <p className="text-[14px] leading-5 text-pv-ink-light">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What this portal is — and isn't */}
        <section className="mx-auto w-full max-w-[1264px] px-6 pt-12 lg:px-8">
          <SectionHeading title="What this portal is — and isn't" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PortalListCard title="It is" icon={iconCheck} items={PORTAL_IS} />
            <PortalListCard title="It isn't" icon={iconCross} items={PORTAL_IS_NOT} />
          </div>
        </section>

        {/* Utility CTA */}
        <section className="mx-auto w-full max-w-[1264px] px-6 py-12 lg:px-8">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-pv-highlight p-8 lg:flex-row lg:items-center lg:gap-8">
            <img src={logoStacked} alt="" className="h-[120px] w-[125px] object-contain" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-brand">
                Work at a water utility?
              </h2>
              <p className="text-[14px] leading-5 text-pv-ink">
                Sign in to set up scenarios, run simulations and prepare reviewed snapshots for this
                portal.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/"
                className="inline-flex h-11 items-center rounded-lg bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90"
              >
                Utility sign in
              </Link>
              <Link
                to="/public/reports#methodology"
                className="inline-flex h-11 items-center rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-ink"
              >
                Read the methodology
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
