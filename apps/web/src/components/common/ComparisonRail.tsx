import { ArrowRight } from 'lucide-react';
import { formatNum } from '../../services/mockData';
import type { MetricDelta } from '../../types';
import StatusBadge from './StatusBadge';

/**
 * Signature baseline–intervention comparison rail (Branding.md):
 * two consistently identified scenarios, then evidence compatibility
 * and metric differences. Reused in Results and Reports.
 */
export default function ComparisonRail({
  baselineName,
  interventionName,
  compatible = true,
  deltas,
  footnote,
}: {
  baselineName: string;
  interventionName: string;
  compatible?: boolean;
  deltas: MetricDelta[];
  footnote?: string;
}) {
  return (
    <section aria-label="Baseline versus intervention comparison" className="pv-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="border-b md:border-b-0 md:border-r border-slate-ink-border bg-slate-ink text-white p-4">
          <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-white/60">
            Baseline
          </div>
          <div className="mt-0.5 font-heading text-[15.5px] font-bold leading-6">{baselineName}</div>
          <div className="tnum mt-0.5 text-[12.5px] text-white/70">rev 3 · frozen 07 Oct 2026</div>
        </div>
        <div className="hidden md:flex items-center justify-center bg-slate-ink px-2 text-white/70">
          <ArrowRight size={18} aria-hidden />
        </div>
        <div className="bg-canopy-green text-white p-4">
          <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-white/70">
            Intervention
          </div>
          <div className="mt-0.5 font-heading text-[15.5px] font-bold leading-6">{interventionName}</div>
          <div className="tnum mt-0.5 text-[12.5px] text-white/80">rev 2 · frozen 08 Oct 2026</div>
        </div>
      </div>

      <div className="border-t border-slate-ink-border px-4 py-2.5 text-[13px]">
        {compatible ? (
          <span className="text-canopy-green font-semibold">
            ✓ Compatible — same volume, period, currency and emissions boundary.
          </span>
        ) : (
          <span className="text-evidence-amber font-semibold">
            ⚠ Incompatible — resolve volume / period mismatch before comparing.
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-ink-border border-t border-slate-ink-border">
        {deltas.map((d) => (
          <div key={d.key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div>
              <div className="text-[13.5px] font-bold text-slate-ink">{d.label}</div>
              <div className="text-[12px] text-slate-ink-muted">{d.unit}</div>
            </div>
            <div className="tnum text-[14px]">
              <span className="text-slate-ink-muted text-[11.5px] uppercase tracking-wide block">Baseline</span>
              {d.baseline === null ? '—' : formatNum(d.baseline, d.key === 'emissions' ? 1 : 0)}
            </div>
            <div className="tnum text-[14px]">
              <span className="text-slate-ink-muted text-[11.5px] uppercase tracking-wide block">Intervention</span>
              {d.intervention === null ? '—' : formatNum(d.intervention, d.key === 'emissions' ? 1 : 0)}
            </div>
            <div className="tnum text-[14px]">
              <span className="text-slate-ink-muted text-[11.5px] uppercase tracking-wide block">Δ (abs · %)</span>
              {d.delta === null ? (
                <StatusBadge status="not_estimable" />
              ) : (
                <span className={d.delta <= 0 ? 'text-canopy-green font-bold' : 'text-slate-ink font-bold'}>
                  {d.delta > 0 ? '+' : ''}
                  {formatNum(d.delta, d.key === 'emissions' ? 1 : 0)} ·{' '}
                  {d.delta_pct !== null ? `${d.delta_pct > 0 ? '+' : ''}${d.delta_pct.toFixed(2)}%` : 'n/a'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {footnote && (
        <div className="bg-mist px-4 py-2 text-[12.5px] text-slate-ink-light">{footnote}</div>
      )}
    </section>
  );
}
