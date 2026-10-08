import { Link, useParams } from 'react-router-dom';
import Logo from '../components/common/Logo';
import StatusBadge from '../components/common/StatusBadge';
import { COMPARISON_DELTAS, formatNum } from '../services/mockData';

/**
 * Simplified, unauthenticated read-only view for public visitors at /public/:id.
 * No workspace chrome, no raw files, no internal notes.
 */
export default function PublicSnapshotPage() {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-mist">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Logo />
        <p className="mt-3 text-[12.5px] font-bold uppercase tracking-[0.08em] text-slate-ink-muted">
          Published snapshot · {id ?? 'pv-2026-10-08'} · reviewed 08 Oct 2026
        </p>
        <h1 className="mt-1 font-heading text-[30px] font-bold leading-9">
          Water-treatment scenario comparison — representative plant
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-ink-light">
          Simplified public summary. Compare scenarios. Understand the tradeoffs. This page shows
          approved results and limitations only.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {COMPARISON_DELTAS.filter((d) => d.key !== 'ecology').map((d) => (
            <div key={d.key} className="pv-card p-4">
              <div className="text-[13px] font-bold text-slate-ink-light">{d.label}</div>
              <div className="tnum mt-1 font-heading text-[22px] font-bold">
                {d.delta !== null ? `${d.delta <= 0 ? '−' : '+'}${formatNum(Math.abs(d.delta))}` : '—'}
              </div>
              <div className="tnum text-[12.5px] text-canopy-green font-bold">
                {d.delta_pct !== null ? `${d.delta_pct.toFixed(2)}% vs baseline` : ''}
              </div>
              <div className="text-[12px] text-slate-ink-muted">{d.unit}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-evidence-amber-border bg-evidence-amber-light p-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-evidence-amber">Ecological effect</span>
            <StatusBadge status="not_estimable" />
          </div>
          <p className="mt-1 text-[13.5px] text-[#5c3d00]">
            Not estimable — no validated local model or paired observations. Zero is not shown as a
            substitute for unavailable data.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-ink-border bg-white p-4 text-[13px] text-slate-ink-light">
          <div className="font-bold text-slate-ink">Sources & boundaries</div>
          <ul className="mt-1 space-y-0.5">
            <li>· Period 01–05 Jan 2026 · volume 61,600 m³ · PHP · Asia/Manila</li>
            <li>· Grid factor Luzon-Visayas 2023, 0.7122 kgCO₂e/kWh (DOE)</li>
            <li>· Offline model — no live synchronization · no regulatory approval implied</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-2">
          <Link to="/" className="rounded-lg bg-river-teal px-4 py-2 text-[14px] font-bold text-white">
            Open workspace sign-in
          </Link>
          <span className="px-2 py-2 text-[13px] text-slate-ink-muted">
            Public visitors cannot see drafts, raw files, or internal notes.
          </span>
        </div>
      </div>
    </div>
  );
}
