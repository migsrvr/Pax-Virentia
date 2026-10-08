import { formatNum } from '../../services/mockData';
import type { MetricStatus } from '../../types';
import StatusBadge from './StatusBadge';

export default function MetricCard({
  label,
  value,
  unit,
  status = 'valid',
  delta,
  hint,
}: {
  label: string;
  value: number | null;
  unit: string;
  status?: MetricStatus;
  delta?: string;
  hint?: string;
}) {
  const isMissing = value === null || status === 'not_estimable';
  return (
    <div className="pv-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13.5px] font-semibold text-slate-ink-light">{label}</div>
        {status !== 'valid' && <StatusBadge status={status} />}
      </div>
      <div
        className="tnum mt-1 font-heading text-[28px] font-bold leading-8 text-slate-ink"
        aria-live="polite"
      >
        {isMissing ? '—' : formatNum(value, label.includes('emissions') ? 1 : 0)}
        {!isMissing && (
          <span className="ml-1.5 align-middle text-[13px] font-semibold text-slate-ink-light">
            {unit}
          </span>
        )}
      </div>
      {isMissing ? (
        <div className="mt-1 text-[13px] text-evidence-amber">
          Not estimable — evidence unavailable.
        </div>
      ) : (
        <>
          {delta && (
            <div className="tnum mt-1 text-[13.5px] font-semibold text-canopy-green">{delta}</div>
          )}
          {hint && <div className="mt-0.5 text-[12.5px] text-slate-ink-muted">{hint}</div>}
        </>
      )}
    </div>
  );
}
