import { NavLink } from 'react-router-dom';
import {
  Beaker,
  ClipboardCheck,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '../common/Logo';
import { WORKSPACE } from '../../services/mockData';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, job: 'Next action & activity' },
  { to: '/datasets', label: 'Datasets', icon: Database, job: 'Evidence & quality' },
  { to: '/scenarios', label: 'Scenarios', icon: Beaker, job: 'Baseline & intervention' },
  { to: '/results', label: 'Results', icon: ClipboardCheck, job: 'Runs & comparison' },
  { to: '/reports', label: 'Reports', icon: FileText, job: 'Exports & publication' },
  { to: '/settings', label: 'Settings', icon: Settings, job: 'Factors & models' },
];

export default function Sidebar() {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-slate-ink-border bg-white">
      <div className="border-b border-slate-ink-border p-4">
        <Logo />
        <div className="mt-3 rounded-lg bg-mist px-3 py-2">
          <div className="truncate text-[12.5px] font-bold text-slate-ink">{WORKSPACE.plant}</div>
          <div className="text-[12px] text-slate-ink-light">{WORKSPACE.context}</div>
        </div>
      </div>
      <nav aria-label="Workspace" className="flex-1 overflow-y-auto p-2.5">
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-river-teal text-white'
                      : 'text-slate-ink hover:bg-mist',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? 'text-white' : 'text-river-teal'} aria-hidden />
                    <span>
                      <span className="block text-[14.5px] font-bold leading-5">{item.label}</span>
                      <span
                        className={clsx(
                          'block text-[12px] leading-4',
                          isActive ? 'text-white/75' : 'text-slate-ink-muted',
                        )}
                      >
                        {item.job}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-ink-border p-4 text-[12px] leading-5 text-slate-ink-muted">
        <div className="font-bold text-slate-ink-light">Offline scenario analysis</div>
        <div>No live plant synchronization. Runs use frozen revisions.</div>
      </div>
    </aside>
  );
}
