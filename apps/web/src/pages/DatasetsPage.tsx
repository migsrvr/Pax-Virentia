import { CheckCircle2, Upload } from 'lucide-react';
import EvidenceNotice from '../components/common/EvidenceNotice';
import StatusBadge from '../components/common/StatusBadge';
import { DATASETS, PLANT_OBSERVATIONS, formatNum } from '../services/mockData';

export default function DatasetsPage() {
  const active = DATASETS[0];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] text-slate-ink-light">
          Import, validate, and inspect versioned input evidence. Validation produces an accepted,
          versioned dataset and a quality report — rejected rows stay traceable.
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-ink-border bg-white px-4 py-2 text-[14px] font-bold text-slate-ink hover:bg-mist">
          <Upload size={16} /> Import CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section aria-label="Datasets" className="pv-card p-5">
          <h2 className="font-heading text-[17px] font-bold">Dataset versions</h2>
          <ul className="mt-3 space-y-3">
            {DATASETS.map((d) => (
              <li
                key={d.id}
                className={`rounded-lg border p-3 ${d.id === active.id ? 'border-river-teal bg-river-teal-light/40' : 'border-slate-ink-border'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-bold">{d.name}</div>
                  <StatusBadge status={d.status === 'validated' ? 'valid' : 'pending'} />
                </div>
                <div className="tnum mt-0.5 text-[12.5px] text-slate-ink-light">
                  {d.version} · {d.rows} rows · {d.content_hash} · quality {d.quality_score}
                </div>
                <div className="text-[12.5px] text-slate-ink-muted">{d.period}</div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Quality report preview" className="pv-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-[17px] font-bold">Quality report — {active.name} {active.version}</h2>
            <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-canopy-green-light px-3 py-1 text-[13px] font-bold text-canopy-green">
              <CheckCircle2 size={14} /> {active.quality_score}/100
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {active.issues.map((i, idx) => (
              <li key={idx} className="rounded-lg bg-mist px-3 py-2 text-[13px]">
                <span className="font-bold uppercase text-[11px] tracking-wide text-slate-ink-muted">{i.level}</span>
                <span className="ml-2 font-bold">{i.field}</span>
                <span className="text-slate-ink-light"> — {i.message}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-heading text-[15px] font-bold">Observations preview</h3>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-ink-border pv-scroll">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-mist text-slate-ink-light">
                <tr>
                  {['Date', 'Volume (m³)', 'Energy (kWh)', 'Pump (h)', 'Dose (mg/L)', 'Turbidity (NTU)'].map((h) => (
                    <th key={h} className="px-3 py-2 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tnum divide-y divide-slate-ink-border">
                {PLANT_OBSERVATIONS.map((o) => (
                  <tr key={o.period_start}>
                    <td className="px-3 py-2">{o.period_start.slice(0, 10)}</td>
                    <td className="px-3 py-2">{formatNum(o.volume_m3)}</td>
                    <td className="px-3 py-2">{formatNum(o.electricity_kwh)}</td>
                    <td className="px-3 py-2">{o.pump_hours.toFixed(1)}</td>
                    <td className="px-3 py-2">{o.chemical_dose_mg_per_l.toFixed(1)}</td>
                    <td className="px-3 py-2">{o.water_turbidity_ntu.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tnum mt-2 text-[12.5px] text-slate-ink-muted">
            Source: {active.source} · Original CSV bytes + checksum stored · 10 MB / 50,000-row limit
          </p>
        </section>
      </div>

      <EvidenceNotice
        variant="attribution"
        title="Provenance & units"
        body="All values retain raw-to-clean lineage. Known units are converted explicitly (kW·h → kWh, mg/L → kg); unknown units, overlapping duplicates and nonfinite numbers are rejected. Synthetic input would be labeled — this preview is measured plant data."
        sources={['research/data/sample_plant_data.csv', 'Source interval: daily, Asia/Manila · method: plant logbook']}
      />
    </div>
  );
}
