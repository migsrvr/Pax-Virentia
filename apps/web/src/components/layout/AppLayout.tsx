import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import Header from './Header';

const MOBILE_NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/scenarios', label: 'Simulations' },
  { to: '/results', label: 'Results' },
  { to: '/compare', label: 'Compare' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/reports', label: 'Reports' },
  { to: '/methodology', label: 'Methodology' },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-pv-bg text-pv-ink">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <nav
            aria-label="Workspace mobile"
            className="flex gap-1 overflow-x-auto border-b border-pv-divider bg-white px-3 py-2 lg:hidden pv-scroll"
          >
            {MOBILE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium',
                    isActive ? 'bg-pv-mint text-pv-forest' : 'text-pv-muted hover:bg-pv-bg',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
