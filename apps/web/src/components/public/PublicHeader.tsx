import { Link } from 'react-router-dom';
import logoPaxVirentia from '../../assets/pv/logo-pax-virentia.png';
import iconUtilitySignin from '../../assets/pv/icon-utility-signin.svg';

/** Portal navigation; anchor items jump to the landing page's product sections. */
const NAV_ITEMS = [
  { label: 'Features', to: '/public/home#features' },
  { label: 'How it works', to: '/public/home#how-it-works' },
  { label: 'Science', to: '/public/home#science' },
  { label: 'Overview', to: '/public/overview' },
  { label: 'Scenarios', to: '/public/scenarios' },
  { label: 'Reports & methodology', to: '/public/reports' },
];

/**
 * Public portal header (Figma 39:5 / 42:5). Pass `active` (e.g. "Overview")
 * to mark the current journey page in the navigation.
 */
export default function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="border-b border-pv-line bg-white font-inter">
      <div className="mx-auto flex min-h-[71px] w-full max-w-[1264px] items-center gap-8 px-6 lg:px-8">
        <Link
          to="/public/home"
          aria-label="Pax Virentia public portal home"
          className="flex shrink-0 items-center"
        >
          <img src={logoPaxVirentia} alt="" className="h-11 w-[126px] object-contain" />
        </Link>
        <nav aria-label="Public portal" className="hidden items-center gap-0.5 xl:flex">
          {NAV_ITEMS.map((item) => {
            const linkClass = `flex h-[71px] items-center whitespace-nowrap border-b-[3px] px-2.5 text-[14px] font-medium leading-5 transition-colors ${
              item.label === active
                ? 'border-pv-action text-pv-brand'
                : 'border-transparent text-pv-ink-light hover:text-pv-brand'
            }`;
            return item.to.startsWith('/') ? (
              <Link
                key={item.label}
                to={item.to}
                aria-current={item.label === active ? 'page' : undefined}
                className={linkClass}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.to}
                aria-current={item.label === active ? 'page' : undefined}
                className={linkClass}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center">
          <Link
            to="/login"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-ink"
          >
            <img src={iconUtilitySignin} alt="" className="h-[18px] w-[18px]" />
            Utility Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
