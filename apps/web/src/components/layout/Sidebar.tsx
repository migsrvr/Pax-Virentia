import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileText,
  GitCompareArrows,
  Globe,
  Info,
  LayoutDashboard,
  Lightbulb,
  SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../services/auth';
import { canReview } from '../../services/roles';

type NavEntry = {
  to: string;
  label: string;
  icon: typeof BookOpen;
  end?: boolean;
  external?: boolean;
};

const WORKSPACE_NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/scenarios', label: 'Simulations', icon: SlidersHorizontal },
  { to: '/results', label: 'Results', icon: ChartColumn },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/recommendations', label: 'Comparison insights', icon: Lightbulb },
  { to: '/reports', label: 'Reports', icon: FileText },
];

const REVIEW_NAV: NavEntry[] = [{ to: '/reviews', label: 'Publication reviews', icon: ClipboardCheck }];

const REFERENCE_NAV: NavEntry[] = [
  { to: '/methodology', label: 'Methodology', icon: BookOpen },
  { to: '/public/home', label: 'Public portal', icon: Globe, external: true },
];

function NavItem({ item }: { item: NavEntry }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      className={({ isActive }) =>
        clsx(
          'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-pv-mint text-pv-forest'
            : 'text-pv-side-text hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={20}
            className={clsx('shrink-0', isActive ? 'text-pv-teal' : 'text-pv-side-muted')}
            aria-hidden="true"
          />
          <span className="truncate">{item.label}</span>
          {item.external ? (
            <ExternalLink size={16} className="ml-auto shrink-0 text-pv-side-muted" aria-hidden="true" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="hidden h-full w-[240px] shrink-0 flex-col bg-pv-forest lg:flex">
      <nav aria-label="Workspace" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 py-6">
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-pv-pine-border bg-pv-pine p-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs leading-4 text-pv-side-muted">Representative plant</div>
            <div className="mt-0.5 text-sm font-medium leading-5 text-white">
              Sample WTP · Luzon–Visayas
            </div>
          </div>
        </div>

        <div className="px-3 pb-1 pt-4 text-xs font-medium leading-4 text-pv-side-muted">Workspace</div>
        {WORKSPACE_NAV.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}

        {canReview(user) ? (
          <>
            <div className="px-3 pb-1 pt-5 text-xs font-medium leading-4 text-pv-side-muted">Review</div>
            {REVIEW_NAV.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </>
        ) : null}

        <div className="px-3 pb-1 pt-5 text-xs font-medium leading-4 text-pv-side-muted">Reference</div>
        {REFERENCE_NAV.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}

        <div className="mt-auto flex gap-3 border-t border-pv-pine-border pt-4">
          <Info size={20} className="mt-0.5 shrink-0 text-pv-mint" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-xs font-semibold leading-4 text-white">Offline simulation</div>
            <p className="mt-1 text-xs leading-4 text-pv-side-muted">
              Simulated estimates from sample data. No live plant monitoring or sensor feeds.
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
