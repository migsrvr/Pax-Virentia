import clsx from 'clsx';
import type { MetricStatus } from '../../types';

const STYLES: Record<string, string> = {
  valid: 'bg-canopy-green-light text-canopy-green border border-canopy-green/25',
  not_estimable:
    'bg-evidence-amber-light text-evidence-amber border border-evidence-amber-border',
  running: 'bg-river-teal-light text-river-teal border border-river-teal/25',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  pending: 'bg-slate-100 text-slate-ink-light border border-slate-ink-border',
  queued: 'bg-slate-100 text-slate-ink-light border border-slate-ink-border',
  succeeded: 'bg-canopy-green-light text-canopy-green border border-canopy-green/25',
  cancelled: 'bg-slate-100 text-slate-ink-muted border border-slate-ink-border',
};

const LABELS: Record<string, string> = {
  valid: 'Valid',
  not_estimable: 'Not estimable',
  running: 'Running',
  failed: 'Failed',
  pending: 'Pending',
  queued: 'Queued',
  succeeded: 'Succeeded',
  cancelled: 'Cancelled',
};

export default function StatusBadge({
  status,
  className,
}: {
  status: MetricStatus | string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold leading-5',
        STYLES[status] ?? STYLES.pending,
        className,
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          status === 'not_estimable'
            ? 'bg-evidence-amber'
            : status === 'valid' || status === 'succeeded'
              ? 'bg-canopy-green'
              : status === 'running'
                ? 'bg-river-teal animate-pulse'
                : status === 'failed'
                  ? 'bg-red-600'
                  : 'bg-slate-ink-muted',
        )}
      />
      {LABELS[status] ?? status}
    </span>
  );
}
