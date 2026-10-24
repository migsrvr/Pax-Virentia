import { Link } from 'react-router-dom';
import logoPaxVirentia from '../../assets/pv/logo-pax-virentia.png';

type FooterLinkItem = { label: string; to: string };

const EXPLORE_LINKS: FooterLinkItem[] = [
  { label: 'Dashboard', to: '/public/overview' },
  { label: 'Environmental impacts', to: '/public/impacts' },
  { label: 'Scenarios', to: '/public/scenarios' },
];

const TRANSPARENCY_LINKS: FooterLinkItem[] = [
  { label: 'Published reports', to: '/public/reports#published-reports' },
  { label: 'Methodology', to: '/public/reports#methodology' },
  { label: 'Glossary', to: '/public/reports#glossary' },
];

const linkClass =
  'text-[14px] leading-5 text-pv-ink-light transition-colors hover:text-pv-brand';

function FooterLink({ label, to }: FooterLinkItem) {
  if (to.startsWith('/')) {
    return (
      <Link to={to} className={linkClass}>
        {label}
      </Link>
    );
  }
  return (
    <a href={to} className={linkClass}>
      {label}
    </a>
  );
}

function ColumnTitle({ children }: { children: string }) {
  return <span className="text-[12px] font-semibold leading-4 text-pv-ink">{children}</span>;
}

/**
 * Public portal footer (Figma 39:247 / 42:357). Pass `current` (the Explore
 * label of the page you are on, e.g. "Dashboard") to render it as plain text.
 */
export default function PublicFooter({ current }: { current?: string } = {}) {
  return (
    <footer className="border-t border-pv-line bg-white font-inter">
      <div className="mx-auto flex w-full max-w-[1264px] flex-col gap-10 px-6 pb-8 pt-12 lg:flex-row lg:gap-12 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-[422_0_0]">
          <img src={logoPaxVirentia} alt="Pax Virentia" className="h-10 w-[115px] object-contain" />
          <p className="max-w-[420px] text-[14px] leading-5 text-pv-ink-light">
            Reviewed sustainability summaries for a representative water-treatment plant: energy
            use, electricity-associated emissions, operating costs and ecosystem indicators.
          </p>
          <span className="inline-flex h-6 w-fit items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
            Simulated estimates · offline model
          </span>
        </div>

        <nav aria-label="Explore" className="flex flex-col gap-3 lg:flex-[211_0_0]">
          <ColumnTitle>Explore</ColumnTitle>
          {EXPLORE_LINKS.map((item) =>
            item.label === current ? (
              <span key={item.label} className={linkClass} aria-current="page">
                {item.label}
              </span>
            ) : (
              <FooterLink key={item.label} {...item} />
            ),
          )}
        </nav>

        <nav aria-label="Transparency" className="flex flex-col gap-3 lg:flex-[211_0_0]">
          <ColumnTitle>Transparency</ColumnTitle>
          {TRANSPARENCY_LINKS.map((item) => (
            <FooterLink key={item.label} {...item} />
          ))}
        </nav>

        <div className="flex flex-col gap-3 lg:flex-[211_0_0]">
          <ColumnTitle>For utilities</ColumnTitle>
          <FooterLink label="Utility sign in" to="/" />
          <p className="max-w-[212px] text-[14px] leading-5 text-pv-ink-light">
            Accounts are provisioned by your workspace administrator.
          </p>
        </div>
      </div>

      <div className="border-t border-pv-line-soft">
        <div className="mx-auto w-full max-w-[1264px] px-6 py-4 lg:px-8">
          <p className="text-[12px] leading-4 text-pv-ink-light">
            Figures on this site are simulated estimates from an offline model. They are not live
            measurements, validated results or regulatory approvals. © 2026 Pax Virentia
            research prototype.
          </p>
        </div>
      </div>
    </footer>
  );
}
