import { CircleHelp, FlaskConical, LogOut, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import wordmark from '../../assets/pax-virentia-wordmark.png';

function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.display_name ?? user?.email ?? 'Signed in';
  const role = user?.role ?? 'analyst';
  const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)} · sample account`;

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-[72px] shrink-0 items-center border-b border-pv-divider bg-white">
      <div className="hidden h-full w-[240px] shrink-0 items-center border-r border-pv-divider px-6 lg:flex">
        <Link to="/" aria-label="Pax Virentia utility dashboard">
          <img src={wordmark} alt="Pax Virentia" className="h-11 w-auto" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 lg:hidden" aria-label="Pax Virentia utility dashboard">
          <img src={wordmark} alt="Pax Virentia" className="h-9 w-auto" />
        </Link>
        <div className="relative hidden min-w-0 max-w-[360px] flex-1 md:block">
          <Search size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pv-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search scenarios, runs and reports"
            aria-label="Search scenarios, runs and reports"
            className="h-11 w-full rounded-lg border border-pv-divider bg-pv-bg pl-10 pr-4 text-sm text-pv-ink placeholder:text-pv-search"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="hidden h-6 items-center gap-1 rounded-full bg-pv-info-bg px-2 text-xs font-medium text-pv-info md:inline-flex">
            <FlaskConical size={14} aria-hidden="true" />
            Simulated estimates · Sample data
          </span>
          <Link
            to="/methodology"
            aria-label="Help and methodology"
            className="grid h-11 w-11 place-items-center rounded-lg text-pv-muted transition-colors hover:bg-pv-bg"
          >
            <CircleHelp size={20} aria-hidden="true" />
          </Link>
          <div className="flex h-11 items-center gap-3 border-l border-pv-divider pl-2 sm:pl-4">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pv-forest text-sm font-semibold text-pv-mint"
              aria-hidden="true"
            >
              {initials(displayName)}
            </span>
            <div className="hidden min-w-0 xl:block">
              <div className="truncate text-sm font-medium leading-5 text-pv-ink">{displayName}</div>
              <div className="truncate text-xs leading-4 text-pv-muted">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="grid h-11 w-11 place-items-center rounded-lg text-pv-muted transition-colors hover:bg-pv-bg"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
