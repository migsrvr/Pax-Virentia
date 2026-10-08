import { Link } from 'react-router-dom';
import { ArrowRight, Database, Beaker, Play } from 'lucide-react';
import EvidenceNotice from '../components/common/EvidenceNotice';
import StatusBadge from '../components/common/StatusBadge';
import { RUNS, SCENARIOS, WORKSPACE } from '../services/mockData';

/**
 * Branding.md Section 5.A — Overview answers "What can I do next?"
 * Next step, recent scenarios, run activity, workspace evidence.
 */
export default function OverviewPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-slate-ink-light">
          {WORKSPACE.context} — <em>{WORKSPACE.tagline}</em>
        </p>
        <Link
          to="/scenarios"
          className="inline-flex items-center gap-2 rounded-lg bg-river-teal px-4 py-2 text-[14px] font-bold text-white hover:bg-river-teal-hover"
        >
          Create scenario <ArrowRight size={16} />
        </Link>
      </div>

      {/* Next step */}
      <section aria-label="Next step" className="pv-card border-l-4 border-l-river-teal p-5">
        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-river-teal">Next step</div>
        <h2 className="mt-1 font-heading text-[22px] font-bold">
          Select a validated dataset to prepare your first baseline.
        </h2>
        <p className="mt-1 max-w-2xl text-[14px] text-slate-ink-light">
          Your Jan 2026 plant observations are validated (v1.2, quality 94). Define a baseline
          revision, then pair it with a Pax Silica intervention over the same volume and period.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/datasets" className="inline-flex items-center gap-1.5 rounded-lg border border-river-teal px-3.5 py-2 text-[13.5px] font-bold text-river-teal hover:bg-river-teal-light">
            <Database size={15} /> View datasets
          </Link>
          <Link to="/scenarios" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-ink-border bg-white px-3.5 py-2 text-[13.5px] font-bold text-slate-ink hover:bg-mist">
            <Beaker size={15} /> Open scenarios
          </Link>
          <Link to="/results" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-ink-border bg-white px-3.5 py-2 text-[13.5px] font-bold text-slate-ink hover:bg-mist">
            <Play size={15} /> Inspect runs
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent scenarios */}
        <section aria-label="Recent scenarios" className="pv-card p-5">
          <h3 className="font-heading text-[17px] font-bold">Recent scenarios</h3>
          <p className="text-[12.5px] text-slate-ink-muted">Name / revision / last updated</p>
          <ul className="mt-3 divide-y divide-slate-ink-border">
            {SCENARIOS.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-[14px] font-bold">{s.name}</div>
                  <div className="tnum text-[12.5px] text-slate-ink-muted">
                    rev {s.revision_no} · {s.updated_at}
                  </div>
                </div>
                <StatusBadge status={s.kind === 'baseline' ? 'valid' : 'pending'} />
              </li>
            ))}
          </ul>
          <Link to="/scenarios" className="mt-2 inline-block text-[13.5px] font-bold text-river-teal hover:underline">
            Open scenario builder →
          </Link>
        </section>

        {/* Run activity */}
        <section aria-label="Run activity" className="pv-card p-5">
          <h3 className="font-heading text-[17px] font-bold">Run activity</h3>
          <p className="text-[12.5px] text-slate-ink-muted">Scenario / state / started</p>
          <ul className="mt-3 divide-y divide-slate-ink-border">
            {RUNS.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-[14px] font-bold">{r.scenario_name}</div>
                  <div className="tnum text-[12.5px] text-slate-ink-muted">rev {r.revision_no} · {r.started_at}</div>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
          <Link to="/results" className="mt-2 inline-block text-[13.5px] font-bold text-river-teal hover:underline">
            Compare compatible runs →
          </Link>
        </section>
      </div>

      {/* Workspace evidence */}
      <section aria-label="Workspace evidence" className="pv-card p-5">
        <h3 className="font-heading text-[17px] font-bold">Workspace evidence</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Dataset coverage', '5 / 5 Jan days validated · Dec needs review', 'valid'],
            ['Factor availability', 'Luzon-Visayas 2023 · 0.7122 kgCO₂e/kWh', 'valid'],
            ['Unresolved limitations', 'Ecological model · Pax Silica tech source', 'not_estimable'],
          ].map(([label, detail, st]) => (
            <div key={label} className="rounded-lg bg-mist p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold">{label}</span>
                <StatusBadge status={st} />
              </div>
              <div className="tnum mt-1 text-[13px] text-slate-ink-light">{detail}</div>
            </div>
          ))}
        </div>
      </section>

      <EvidenceNotice
        variant="limitation"
        title="Offline model — no live synchronization"
        body="This workspace evaluates proposed operating conditions against frozen evidence. It does not monitor the plant live, and ecological effects are not estimable until the evidence gate is met. See Results for per-metric limitations."
        sources={[
          'Plant observations Jan 2026 v1.2 (measured)',
          'DOE National Grid Emission Factor Report — Luzon-Visayas 2023',
          'Pax Silica spec v0.4 — unverified, technical source pending',
        ]}
      />
    </div>
  );
}
