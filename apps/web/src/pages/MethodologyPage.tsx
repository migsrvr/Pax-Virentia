import { Link } from 'react-router-dom';
import { useCatalogs } from '../services/catalogs';
import { errorMessage, format } from '../services/simulation';
import { Chip, SectionCard } from './scenarios/shared';

/**
 * Methodology, generated from the live catalogs plus the formulas implemented in
 * backend/app/services/simulations.py and backend/app/calculations/*.
 * Scientific wording must be approved by the project's domain reviewer.
 */

const FORMULAS = [
  { title: 'Energy', model: 'equipment-duty-v1', formula: 'kWh = pump kW × 1.0 × pump hours + mixer kW × mixing load × mixing hours',
    notes: ['Energy intensity (kWh/m³) = total kWh ÷ treated volume.', 'Flow rate is checked against capacity and must cover the treated volume (flow × pump hours ≥ volume), but it does not change energy.'] },
  { title: 'Electricity-associated emissions', model: 'electricity-factor-v1', formula: 'kg = total kWh × grid factor (kg per kWh)',
    notes: ['The factor’s gas basis is preserved: CO₂e factors give kg CO₂e, CO₂-only factors give kg CO₂.', 'The reporting period must fall entirely within the factor’s year; there is no carry-forward between years.', 'Only purchased electricity is counted. This is not a complete facility footprint or life-cycle assessment.'] },
  { title: 'Operating cost', model: 'period-opex-v1', formula: 'PHP = kWh × tariff + chemical kg × chemical price + labor + maintenance + other',
    notes: ['Chemical kg = dose (mg/L) × treated volume (m³) ÷ 1,000.', 'Single runs do not estimate savings or payback; comparisons report net operating savings = baseline cost − intervention cost.'] },
  { title: 'Downstream ecosystem stress', model: 'evidence-gate-v1', formula: 'evidence gate → not estimable',
    notes: ['No approved local ecological model is registered, so the value is always not estimable.', 'Not estimable is distinct from zero impact, a finding of safety, or a software failure.'] },
];

const RULES = [
  'Comparisons require the same treated volume, period, currency, grid region and emissions boundary; with emissions, also the same gas basis and factor method.',
  'Each run freezes its inputs, catalog versions, model versions and code version. Results are not recalculated when a catalog changes.',
  'AI explanations only restate stored results and their limitations. They are not evidence or recommendations.',
];

export default function MethodologyPage() {
  const catalogs = useCatalogs();
  return (
    <div className="flex flex-col gap-6 text-pv-ink">
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px]">Methodology</h1>
        <p className="text-[14px] leading-5 text-pv-muted">
          The formulas, factors and specifications behind every estimate, read from the active catalogs. Pax Silica and
          other treatment specifications remain unverified until reviewed against technical evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {FORMULAS.map((item) => (
          <SectionCard key={item.title} className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold">{item.title}</h2>
              <span className="font-mono text-[12px] text-pv-muted">{item.model}</span>
            </div>
            <p className="rounded-lg bg-pv-bg px-3 py-2 font-mono text-[12px]">{item.formula}</p>
            <ul className="list-disc space-y-1 pl-5 text-[14px]">{item.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          </SectionCard>
        ))}
      </div>

      <SectionCard className="gap-3">
        <h2 className="text-[18px] font-semibold">Comparison and reproducibility rules</h2>
        <ul className="list-disc space-y-1 pl-5 text-[14px]">{RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      </SectionCard>

      {catalogs.isPending ? <p role="status">Loading active catalogs…</p> : null}
      {catalogs.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(catalogs.error)}</p> : null}
      {catalogs.data ? (
        <>
          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold">Active grid emission factors</h2>
            <ul className="flex flex-col gap-2 text-[14px]">
              {catalogs.data.factors.map((factor) => (
                <li key={factor.version_id} className="flex flex-wrap items-center gap-2 border-b border-pv-hairline pb-2 last:border-b-0">
                  <span className="font-medium">{factor.grid_region} {factor.reporting_year}</span>
                  <span className="tabular-nums">{format(factor.kg_per_kwh, 4)} kg {factor.gas_basis} per kWh</span>
                  <span className="text-pv-muted">· {factor.factor_method} · {factor.source_ref}</span>
                  <Chip tone="neutral">{factor.evidence_status.replace('_', ' ')}</Chip>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold">Treatment specifications</h2>
            <div className="overflow-x-auto pv-scroll">
              <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
                <thead>
                  <tr>{['Specification', 'Evidence', 'Pump', 'Mixer', 'Capacity', 'Flow', 'Pump duty', 'Mixing load', 'Dose'].map((h) => (
                    <th key={h} scope="col" className="border-b border-pv-divider px-3 py-2 text-[12px] font-medium text-pv-muted">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="tabular-nums">
                  {catalogs.data.technologies.map((tech) => (
                    <tr key={tech.version_id}>
                      <td className="border-b border-pv-hairline px-3 py-2.5"><span className="font-medium">{tech.name}</span><span className="block font-mono text-[12px] text-pv-muted">{tech.version_id}</span></td>
                      <td className="border-b border-pv-hairline px-3 py-2.5"><Chip tone={tech.evidence_status === 'unverified' ? 'warn' : 'neutral'}>{tech.evidence_status}</Chip></td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{format(tech.pump_power_kw)} kW</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{format(tech.mixer_power_kw)} kW</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{format(tech.capacity_m3_per_hour)} m³/h</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{tech.flow_rate_range.minimum}–{tech.flow_rate_range.maximum} m³/h</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{tech.pump_duty_hours_range.minimum}–{tech.pump_duty_hours_range.maximum} h</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{tech.mixing_load_range.minimum}–{tech.mixing_load_range.maximum}</td>
                      <td className="border-b border-pv-hairline px-3 py-2.5">{tech.chemical_dose_range.minimum}–{tech.chemical_dose_range.maximum} mg/L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}

      <p className="text-[12px] text-pv-muted">
        Public visitors see the same formulas on the <Link to="/public/reports#methodology" className="text-pv-teal underline">public methodology page</Link>.
      </p>
    </div>
  );
}
