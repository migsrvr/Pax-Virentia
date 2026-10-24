import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Cloud,
  Coins,
  LoaderCircle,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sprout,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { btnPrimary, btnSecondary } from './scenarios/shared';
import {
  fetchDashboardWorkspace,
  type DashboardRun,
  type DashboardRunStatus,
} from '../services/workspace';

/* The dashboard reflects the workspace query lifecycle and its data. */

const STATUS_STYLES: Record<DashboardRunStatus, { label: string; cls: string; icon: typeof Pencil }> = {
  draft: { label: 'Draft', cls: 'bg-pv-chip text-pv-muted', icon: Pencil },
  queued: { label: 'Queued', cls: 'bg-pv-chip text-pv-muted', icon: CircleDashed },
  running: { label: 'Running', cls: 'bg-pv-run-bg text-pv-run-ink', icon: LoaderCircle },
  completed: { label: 'Completed', cls: 'bg-pv-ok-bg text-pv-ok-ink', icon: CircleCheck },
  failed: { label: 'Failed', cls: 'bg-pv-err-bg text-pv-err-ink', icon: CircleX },
  cancelled: { label: 'Cancelled', cls: 'bg-pv-chip text-pv-muted', icon: CircleX },
};

const SETUP_STEPS = [
  {
    title: 'Set up a baseline',
    body: "Today's operation, used as the reference for every comparison.",
  },
  {
    title: 'Add an alternative',
    body: 'A treatment or operating change you want to test.',
  },
  {
    title: 'Compare and report',
    body: 'See the trade-offs, then export a report or publish a snapshot.',
  },
];

const EMPTY_METRICS = [
  { title: 'Energy consumption', note: 'Appears after your first run' },
  { title: 'CO₂e emissions', note: 'Appears after your first run' },
  { title: 'Operating cost', note: 'Appears after your first run' },
  { title: 'Environmental indicator', note: 'Downstream ecosystem stress' },
];

function StatusChip({ status }: { status: DashboardRunStatus }) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;
  return (
    <span className={clsx('inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium', style.cls)}>
      <Icon size={14} aria-hidden="true" />
      {style.label}
    </span>
  );
}

/* Empty workspace. */
function EmptyWorkspace() {
  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
          <p className="mt-1 text-[14px] leading-5 text-pv-muted">
            Scenario workspace · no simulations yet
          </p>
        </div>
        <Link to="/scenarios" className={clsx(btnPrimary, 'shrink-0')}>
          <Plus size={18} aria-hidden="true" />
          New simulation
        </Link>
      </div>

      {/* Empty-state hero */}
      <section
        aria-label="Get started"
        className="flex flex-col items-center gap-6 rounded-xl border border-pv-divider bg-white px-8 py-12"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pv-mint" aria-hidden="true">
          <SlidersHorizontal size={32} className="text-pv-forest" />
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
            Run your first simulation
          </h2>
          <p className="max-w-[560px] text-[14px] leading-5 text-pv-muted">
            Set up a scenario with your plant&apos;s inputs and assumptions, run the offline model, then
            compare the result with a baseline. Results are simulated estimates, not live plant data.
          </p>
        </div>
        <ol className="grid w-full max-w-[840px] grid-cols-1 gap-4 text-left md:grid-cols-3">
          {SETUP_STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl bg-pv-bg p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-pv-mint text-[14px] font-semibold leading-5 text-pv-forest">
                {index + 1}
              </span>
              <span className="text-[14px] font-semibold leading-5 text-pv-ink">{step.title}</span>
              <span className="text-[14px] leading-5 text-pv-muted">{step.body}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/scenarios" className={btnPrimary}>
            New simulation
          </Link>
          <Link to="/scenarios" className={btnSecondary}>Create scenario</Link>
        </div>
      </section>

      {/* Key metrics — no results yet */}
      <section
        aria-label="Key metrics (no results yet)"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
      >
        {EMPTY_METRICS.map((metric) => (
          <div
            key={metric.title}
            className="flex flex-col gap-3 rounded-xl border border-dashed border-pv-border-soft bg-white p-6"
          >
            <div className="text-[14px] font-semibold leading-5 text-pv-ink">{metric.title}</div>
            <div className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-muted">—</div>
            <div className="text-[12px] leading-4 text-pv-muted">{metric.note}</div>
          </div>
        ))}
      </section>

      {/* Recent simulations — empty */}
      <section
        aria-label="Recent simulations"
        className="flex flex-col gap-2 rounded-xl border border-pv-divider bg-white p-6"
      >
        <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Recent simulations</h2>
        <p className="text-[14px] leading-5 text-pv-muted">
          No scenarios or runs yet. Drafts and runs you create will be listed here with their status.
        </p>
      </section>
    </div>
  );
}

/* Loading state. */
const LOADING_METRICS = [
  { icon: Zap, title: 'Energy consumption', subtitle: 'Electricity · pumps and mixers' },
  { icon: Cloud, title: 'CO₂e emissions', subtitle: 'Electricity-associated only' },
  { icon: Coins, title: 'Operating cost', subtitle: 'Modeled period · Philippine peso' },
  { icon: Sprout, title: 'Environmental indicator', subtitle: 'Downstream ecosystem stress' },
];

function SkeletonBar({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx('animate-pulse rounded-md bg-pv-chip', className)} />;
}

function LoadingWorkspace() {
  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
          <div role="status" className="flex items-center gap-2">
            <LoaderCircle size={16} className="shrink-0 animate-spin text-pv-teal" aria-hidden="true" />
            <p className="text-[14px] leading-5 text-pv-muted">Loading simulation summaries…</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/compare" className={btnSecondary}>
            Compare scenarios
          </Link>
          <Link to="/scenarios" className={btnPrimary}>
            New simulation
          </Link>
        </div>
      </div>

      {/* Latest simulated estimates — loading */}
      <section aria-label="Latest simulated estimates (loading)" className="flex flex-col gap-4">
        <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
          Latest simulated estimates
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_METRICS.map((card) => (
            <article
              key={card.title}
              className="flex min-h-[248px] flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pv-mint">
                  <card.icon size={20} className="text-pv-forest" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-5 text-pv-ink">{card.title}</div>
                  <div className="text-[12px] leading-4 text-pv-muted">{card.subtitle}</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <SkeletonBar className="h-7 w-[130px]" />
                <SkeletonBar className="h-4 w-[97px] rounded-full" />
              </div>
              <div className="mt-auto border-t border-pv-hairline pt-4">
                <p className="text-[12px] leading-4 text-pv-muted">Loading…</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Chart + evidence — loading */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[741fr_371fr]">
        <section
          aria-label="Change compared with baseline (loading)"
          className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6"
        >
          <SkeletonBar className="h-6 w-[277px] max-w-full" />
          <SkeletonBar className="h-3 w-[415px] max-w-full" />
          <div className="flex flex-col gap-4 pt-2">
            <SkeletonBar className="h-5 w-[484px] max-w-full" />
            <SkeletonBar className="h-5 w-[380px] max-w-full" />
            <SkeletonBar className="h-5 w-[429px] max-w-full" />
            <SkeletonBar className="h-9 w-full" />
          </div>
        </section>
        <section
          aria-label="Evidence and assumptions (loading)"
          className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6"
        >
          <SkeletonBar className="h-6 w-[192px]" />
          <SkeletonBar className="h-4 w-[289px] max-w-full" />
          <SkeletonBar className="h-4 w-[257px] max-w-full" />
          <SkeletonBar className="h-4 w-[273px] max-w-full" />
          <SkeletonBar className="h-4 w-[224px] max-w-full" />
        </section>
      </div>

      {/* Recent simulations — loading */}
      <section
        aria-label="Recent simulations (loading)"
        className="rounded-xl border border-pv-divider bg-white p-6"
      >
        <div className="pb-2">
          <SkeletonBar className="h-6 w-[220px]" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1086px]">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[330px_165px_165px_165px_165px] items-center gap-6 border-b border-pv-hairline py-4 last:border-b-0"
              >
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-6 rounded-full" />
                <SkeletonBar className="h-4" />
                <SkeletonBar className="h-4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* Load failure — no Figma frame exists; kept to the established card language. */
function WorkspaceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Dashboard</h1>
        <p className="mt-1 text-sm leading-5 text-pv-muted">
          Scenario workspace
        </p>
      </div>
      <section
        aria-label="Workspace failed to load"
        className="flex flex-col items-center gap-6 rounded-xl border border-pv-divider bg-white px-8 py-12"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pv-err-bg" aria-hidden="true">
          <CircleX size={32} className="text-pv-err-field" />
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
            Couldn&apos;t load your workspace
          </h2>
          <p className="max-w-[560px] text-[14px] leading-5 text-pv-muted">
            The dashboard data request failed. Your scenarios and runs are not affected. Check the
            connection and try again.
          </p>
        </div>
        <button type="button" onClick={onRetry} className={btnPrimary}>
          Retry loading
        </button>
      </section>
    </div>
  );
}

function LiveDashboard({ runs }: { runs: DashboardRun[] }) {
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold text-pv-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-pv-muted">Saved scenarios and server-reported run activity.</p></div>
      <Link to="/scenarios" className={btnPrimary}><Plus size={18} aria-hidden />Create scenario</Link>
    </div>
    <section aria-labelledby="live-workspace-title" className="overflow-hidden rounded-xl border border-pv-divider bg-white">
      <div className="p-6"><h2 id="live-workspace-title" className="text-lg font-semibold">Scenarios and runs</h2>
        <p className="mt-2 text-sm text-pv-muted">Open a completed run for its calculated metrics and evidence. Saved drafts have no calculated results.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm">
        <caption className="sr-only">Live saved drafts and run records</caption>
        <thead className="bg-pv-bg"><tr>{['Scenario', 'Revision / run', 'Status', 'Updated', 'Action'].map(title => <th key={title} scope="col" className="px-6 py-3">{title}</th>)}</tr></thead>
        <tbody>{runs.map((run, index) => <tr key={`${run.revRun}-${index}`} className="border-t border-pv-hairline">
          <th scope="row" className="px-6 py-4 font-medium">{run.name}<span className="block text-xs font-normal text-pv-muted">{run.sub}</span></th>
          <td className="max-w-xs break-words px-6 py-4">{run.revRun}</td><td className="px-6 py-4"><StatusChip status={run.status} />{run.failedNote && <p className="mt-1 text-xs">{run.failedNote}</p>}</td>
          <td className="px-6 py-4">{run.updated}</td><td className="px-6 py-4">{run.action.to ? <Link to={run.action.to} className="font-semibold text-pv-teal hover:underline">{run.action.label}</Link> : <span className="text-pv-muted">{run.action.label}</span>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ['workspace', 'dashboard'], queryFn: fetchDashboardWorkspace, refetchInterval: 15000 });

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard'] });
  };

  const runs = workspace.data?.runs ?? [];

  if (workspace.isPending) return <LoadingWorkspace />;
  if (workspace.isError) return <WorkspaceError onRetry={reload} />;
  if (!runs.length) return <EmptyWorkspace />;
  return <LiveDashboard runs={runs} />;
}
