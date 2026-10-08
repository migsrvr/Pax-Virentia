import StatusBadge from '../components/common/StatusBadge';
import EvidenceNotice from '../components/common/EvidenceNotice';
import { GRID_FACTORS, MODEL_REGISTRY } from '../services/mockData';

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[14px] text-slate-ink-light">
        Manage authorized workspace settings, factors, models, and users. Curated factors and model
        artifacts are immutable — corrections create a new version; deprecation preserves old runs.
      </p>

      <section aria-label="Grid factors" className="pv-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-[17px] font-bold">Grid factors (DOE / IEA)</h2>
          <StatusBadge status="valid" />
        </div>
        <p className="text-[12.5px] text-slate-ink-muted">Factor set 2026.1 · match region, year/period and methodology.</p>
        <div className="mt-3 overflow-x-auto pv-scroll">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-ink-border text-slate-ink-light">
                {['Region', 'Year', 'Gas basis', 'Method', 'kg/kWh', 'Reference'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[12px] font-bold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-slate-ink-border">
              {GRID_FACTORS.map((f) => (
                <tr key={f.factor_id}>
                  <td className="px-2 py-2.5 font-bold">{f.grid_region}</td>
                  <td className="px-2 py-2.5">{f.reporting_year}</td>
                  <td className="px-2 py-2.5">{f.gas_basis}</td>
                  <td className="px-2 py-2.5">{f.accounting_method}</td>
                  <td className="px-2 py-2.5 font-bold">{f.kg_co2e_per_kwh.toFixed(4)}</td>
                  <td className="px-2 py-2.5 text-slate-ink-light">{f.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Model registry" className="pv-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-[17px] font-bold">Model registry</h2>
          <button className="rounded-lg border border-slate-ink-border bg-white px-3 py-1.5 text-[13px] font-bold hover:bg-mist">
            Propose new version (admin)
          </button>
        </div>
        <div className="mt-3 overflow-x-auto pv-scroll">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-ink-border text-slate-ink-light">
                {['Module', 'Algorithm', 'Status', 'Evidence', 'Supported ranges'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[12px] font-bold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-ink-border">
              {MODEL_REGISTRY.map((m) => (
                <tr key={m.module}>
                  <td className="px-2 py-2.5 font-bold capitalize">{m.module}</td>
                  <td className="tnum px-2 py-2.5">{m.algorithm}</td>
                  <td className="px-2 py-2.5">
                    <StatusBadge status={m.status === 'approved' ? 'valid' : 'not_estimable'} />
                  </td>
                  <td className="px-2 py-2.5 text-slate-ink-light">{m.evaluated}</td>
                  <td className="tnum px-2 py-2.5 text-slate-ink-light">{m.ranges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EvidenceNotice
        variant="attribution"
        title="Workspace roles"
        body="Analyst / plant operator prepares data and runs; Reviewer reads and approves snapshots; Administrator manages users, factors, models and withdrawal; Public visitor reads published summaries only. One research workspace for the MVP — no multi-organization tenancy."
      />
    </div>
  );
}
