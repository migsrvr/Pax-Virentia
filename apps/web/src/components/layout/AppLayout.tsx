import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-mist text-slate-ink">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} subtitle={subtitle} />
        {/* Mobile nav */}
        <nav aria-label="Workspace mobile" className="flex gap-1 overflow-x-auto border-b border-slate-ink-border bg-white px-3 py-2 lg:hidden pv-scroll">
          {[
            ['/', 'Overview'],
            ['/datasets', 'Datasets'],
            ['/scenarios', 'Scenarios'],
            ['/results', 'Results'],
            ['/reports', 'Reports'],
            ['/settings', 'Settings'],
          ].map(([to, label]) => (
            <a
              key={to}
              href={to}
              className="whitespace-nowrap rounded-full bg-mist px-3 py-1 text-[13px] font-bold text-river-teal"
            >
              {label}
            </a>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
