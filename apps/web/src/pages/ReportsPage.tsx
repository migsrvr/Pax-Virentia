import { useState } from 'react';
import ComparisonRail from '../components/common/ComparisonRail';
import EvidenceNotice from '../components/common/EvidenceNotice';
import StatusBadge from '../components/common/StatusBadge';
import { COMPARISON_DELTAS } from '../services/mockData';

export default function ReportsPage() {
  const [reviewed, setReviewed] = useState(false);
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[14px] text-slate-ink-light">
        Prepare exports and review publication status. Exports render from stored facts and citations —
        a publication is a reviewed, redacted snapshot with a version, reviewer and time.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <section aria-label="Export generation" className="pv-card p-5">
          <h2 className="font-heading text-[17px] font-bold">Export generation</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {[
              ['Comparison report (PDF)', 'Metrics, methods, limitations, sources', 'ready'],
              ['Metrics workbook (CSV)', 'Per-interval energy / emissions / cost', 'ready'],
              ['Public snapshot draft', 'Redacted summary for reviewer approval', 'pending'],
            ].map(([name, desc, st]) => (
              <li key={name} className="flex items-center justify-between gap-3 rounded-lg bg-mist px-3 py-2.5">
                <div>
                  <div className="font-bold">{name}</div>
                  <div className="text-[12.5px] text-slate-ink-light">{desc}</div>
                </div>
                <StatusBadge status={st === 'ready' ? 'valid' : 'pending'} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-river-teal px-4 py-2 text-[14px] font-bold text-white hover:bg-river-teal-hover">
              Queue export
            </button>
            <button className="rounded-lg border border-slate-ink-border bg-white px-4 py-2 text-[14px] font-bold hover:bg-mist">
              Download latest
            </button>
          </div>
        </section>

        <section aria-label="Publication review" className="pv-card p-5">
          <h2 className="font-heading text-[17px] font-bold">Publication review</h2>
          <ol className="mt-3 space-y-2 text-[13.5px]">
            <li className="flex gap-2"><span className="font-bold text-canopy-green">✓</span> Redaction check — raw files and internal notes excluded.</li>
            <li className="flex gap-2"><span className="font-bold text-canopy-green">✓</span> Evidence labels — every number carries units + source.</li>
            <li className="flex gap-2">
              <span className={`font-bold ${reviewed ? 'text-canopy-green' : 'text-evidence-amber'}`}>{reviewed ? '✓' : '○'}</span>
              Reviewer decision — approve or reject with a reason.
            </li>
          </ol>
          <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-mist p-3 text-[13.5px]">
            <input
              type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)}
              className="mt-1 accent-[#135D66]"
            />
            <span>
              <strong>I confirm</strong> this snapshot is simplified, redacted, and does not imply
              regulatory approval. Later private edits cannot silently change public content.
            </span>
          </label>
          <div className="mt-3 flex gap-2">
            <button
              disabled={!reviewed}
              className="rounded-lg bg-canopy-green px-4 py-2 text-[14px] font-bold text-white hover:bg-canopy-green-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit for publication
            </button>
            <button className="rounded-lg border border-red-200 px-4 py-2 text-[14px] font-bold text-red-700 hover:bg-red-50">
              Withdraw public access
            </button>
          </div>
        </section>
      </div>

      <ComparisonRail
        baselineName="Baseline — Conventional operation"
        interventionName="Pax Silica — Intervention draft"
        compatible
        deltas={COMPARISON_DELTAS}
        footnote="Report preview reuses the workspace comparison rail so reviewers recognize the central task."
      />

      <EvidenceNotice
        variant="attribution"
        title="AI-generated explanation (optional)"
        body="Numerical results remain available even if explanation generation fails. Narratives are validated against stored facts; unsupported numbers or sources are discarded and replaced with a deterministic template."
      />
    </div>
  );
}
