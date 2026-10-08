import ComparisonRail from '../components/common/ComparisonRail';
import EvidenceNotice from '../components/common/EvidenceNotice';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import { COMPARISON_DELTAS, RUNS } from '../services/mockData';

export default function ResultsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[14px] text-slate-ink-light">
          Inspect runs and compare compatible findings side by side. HTTP success does not mean every
          metric exists — missing evidence yields <StatusBadge status="not_estimable" /> with a reason,
          never a zero.
        </p>
        <button className="rounded-lg border border-slate-ink-border bg-white px-4 py-2 text-[14px] font-bold hover:bg-mist">
          Explain these results (AI)
        </button>
      </div>

      {/* Run inspector */}
      <section aria-label="Run inspector" className="pv-card p-5">
        <h2 className="font-heading text-[17px] font-bold">Run inspector</h2>
        <div className="mt-3 overflow-x-auto pv-scroll">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-ink-border text-slate-ink-light">
                {['Run', 'Revision', 'State', 'Energy', 'Emissions', 'OPEX'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[12.5px] font-bold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-slate-ink-border">
              {RUNS.map((r) => (
                <tr key={r.id} className="hover:bg-mist/60">
                  <td className="px-2 py-2.5 font-bold">{r.scenario_name}</td>
                  <td className="px-2 py-2.5">rev {r.revision_no}</td>
                  <td className="px-2 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-2 py-2.5">{r.energy_kwh === null ? '—' : `${r.energy_kwh.toLocaleString()} kWh`}</td>
                  <td className="px-2 py-2.5">{r.emissions_kgco2e === null ? '—' : `${r.emissions_kgco2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e`}</td>
                  <td className="px-2 py-2.5">{r.opex_php === null ? '—' : `₱${r.opex_php.toLocaleString()}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-ink-muted">
          Polling run-paxsilica-r3 every 2 s while active · cancellation available · retry creates a new attempt.
        </p>
      </section>

      {/* Signature comparison rail */}
      <ComparisonRail
        baselineName="Baseline — Conventional operation"
        interventionName="Pax Silica — Intervention draft"
        compatible
        deltas={COMPARISON_DELTAS}
        footnote="Same volume (61,600 m³), period (01–05 Jan 2026), currency (PHP) and boundary (operating-margin grid average). Green marks a per-metric decrease only — not a sustainability verdict."
      />

      {/* Multi-metric cards + ecological card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Electricity demand" value={22176} unit="kWh" delta="−2,464 kWh · −10.00% vs baseline" hint="E = Σ(Pᵢ · load · hours) · deterministic v1.3" />
        <MetricCard label="Electricity-associated emissions" value={15793.7} unit="kgCO₂e" delta="−1,754.9 kgCO₂e · −10.00% vs baseline" hint="Luzon-Visayas 2023 · 0.7122 kg/kWh · DOE" />
        <MetricCard label="Period operating cost" value={289120} unit="PHP" delta="−₱23,338 · −7.47% net operating savings" hint="Tariff ₱10.45/kWh · same inclusions" />
        <MetricCard label="Ecological indicator" value={null} unit="—" status="not_estimable" />
      </div>

      <EvidenceNotice
        variant="limitation"
        title="Ecological effect: not estimable"
        body="Electricity-associated carbon alone does not establish damage to nearby land or marine ecosystems. No validated exposure–response relationship, thresholds, or paired outcome dataset are available, so no damage percentage is shown."
        sources={['Required: defined target · paired observations · validation', 'FR-04 cannot be declared fulfilled while the gate is unmet']}
      />
    </div>
  );
}
