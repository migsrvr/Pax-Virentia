import { useState } from 'react';
import EvidenceNotice from '../components/common/EvidenceNotice';
import StatusBadge from '../components/common/StatusBadge';
import { GRID_FACTORS } from '../services/mockData';

export default function ScenariosPage() {
  const [mixing, setMixing] = useState(14.5);
  const [dose, setDose] = useState(2.6);
  const [tariff, setTariff] = useState(10.45);
  const [factorId, setFactorId] = useState(GRID_FACTORS[0].factor_id);

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[14px] text-slate-ink-light">
        Create and revise baseline and intervention assumptions. Editing a scenario creates a new
        revision — historical runs keep their frozen inputs. A <strong>scenario</strong> defines
        assumptions; a <strong>run</strong> evaluates a fixed revision.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Baseline — read-only reference */}
        <section aria-label="Baseline scenario" className="pv-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-[17px] font-bold">Baseline — Conventional operation</h2>
            <StatusBadge status="valid" />
          </div>
          <p className="text-[12.5px] text-slate-ink-muted">rev 3 · frozen 07 Oct 2026 · verified spec v1.1</p>
          <dl className="tnum mt-4 grid grid-cols-2 gap-3 text-[13.5px]">
            {[
              ['Service volume', '61,600 m³'],
              ['Period', '01–05 Jan 2026'],
              ['Mixing intensity', '18.5 h/day avg'],
              ['Chemical dose', '3.3 mg/L'],
              ['Tariff', '₱10.45 / kWh'],
              ['Grid factor', '0.7122 kgCO₂e/kWh'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-mist px-3 py-2">
                <dt className="text-[12px] text-slate-ink-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12.5px] text-slate-ink-muted">
            Baseline is locked as the comparison reference. Clone it to test a new intervention.
          </p>
        </section>

        {/* Intervention editor */}
        <section aria-label="Pax Silica intervention editor" className="pv-card border-t-4 border-t-canopy-green p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-[17px] font-bold">Pax Silica — Intervention (draft rev 3)</h2>
            <StatusBadge status="pending" />
          </div>
          <p className="text-[12.5px] text-slate-ink-muted">
            Unverified spec v0.4 — technical source pending (Ch.2 pp.26–27). Illustrative fixtures only.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="flex justify-between text-[13.5px] font-bold">
                Mixing hours <span className="tnum text-canopy-green">{mixing.toFixed(1)} h/day</span>
              </span>
              <input
                type="range" min={8} max={21} step={0.5} value={mixing}
                onChange={(e) => setMixing(Number(e.target.value))}
                className="mt-1 w-full accent-[#41745B]" aria-label="Mixing hours per day"
              />
              <span className="text-[12px] text-slate-ink-muted">Supported range 8–21 h/day · maps to power only via explicit spec.</span>
            </label>

            <label className="block">
              <span className="flex justify-between text-[13.5px] font-bold">
                Chemical dose <span className="tnum text-canopy-green">{dose.toFixed(1)} mg/L</span>
              </span>
              <input
                type="range" min={1.5} max={4.5} step={0.1} value={dose}
                onChange={(e) => setDose(Number(e.target.value))}
                className="mt-1 w-full accent-[#41745B]" aria-label="Chemical dose mg per liter"
              />
              <span className="text-[12px] text-slate-ink-muted">Affects chemical cost; effect on electricity needs evidence.</span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13.5px] font-bold">Tariff (₱/kWh)</span>
                <input
                  type="number" step={0.01} value={tariff}
                  onChange={(e) => setTariff(Number(e.target.value))}
                  className="tnum mt-1 w-full rounded-lg border border-slate-ink-border px-3 py-2 text-[14px]"
                />
              </label>
              <label className="block">
                <span className="text-[13.5px] font-bold">Grid factor</span>
                <select
                  value={factorId} onChange={(e) => setFactorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-ink-border bg-white px-3 py-2 text-[14px]"
                >
                  {GRID_FACTORS.map((f) => (
                    <option key={f.factor_id} value={f.factor_id}>
                      {f.grid_region} {f.reporting_year} · {f.kg_co2e_per_kwh}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button className="rounded-lg bg-canopy-green px-4 py-2 text-[14px] font-bold text-white hover:bg-canopy-green-hover">
                Save draft rev 3
              </button>
              <button className="rounded-lg bg-river-teal px-4 py-2 text-[14px] font-bold text-white hover:bg-river-teal-hover">
                Review inputs & run simulation
              </button>
            </div>
            <p className="tnum text-[12.5px] text-slate-ink-muted">
              Frozen on run: dataset hash · tech version · factor-set 2026.1 · model v1.3 · seed · code release.
            </p>
          </div>
        </section>
      </div>

      <EvidenceNotice
        variant="limitation"
        title="Pax Silica technology is unverified"
        body="Chapter 2 notes the Pax Silica reference does not establish a water-treatment method. Do not present intervention deltas as validated savings until a technical source defines equipment behavior and operating limits."
      />
    </div>
  );
}
