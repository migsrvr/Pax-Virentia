import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Chip, SectionCard, UnitInput, btnPrimary, btnSecondary } from './shared';
import type { Draft, DraftProps, Factor } from '../../services/simulation';

export default function CostsEmissionStep({ draft, onChange, factors, onBack, onContinue }: DraftProps & {
  factors: Factor[]; onBack: () => void; onContinue: () => void;
}) {
  const factor = factors.find(item => item.id === draft.factorId);
  const fields: { key: keyof Draft; title: string; unit: string }[] = [
    { key: 'tariff', title: 'Electricity tariff', unit: 'PHP/kWh' },
    { key: 'chemicalPrice', title: 'Chemical price', unit: 'PHP/kg' },
    { key: 'labor', title: 'Labor cost', unit: 'PHP' },
    { key: 'maintenance', title: 'Maintenance cost', unit: 'PHP' },
    { key: 'other', title: 'Other non-energy cost', unit: 'PHP' },
  ];
  return <div className="flex flex-col gap-6">
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard>
        <h2 className="text-[18px] font-semibold">Operating cost assumptions</h2>
        <p className="text-sm text-pv-muted">Prefilled costs are assumed values; review and replace them with your evidence. All costs apply to the reporting period. Currency: PHP.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(field => <label key={field.key} className="flex flex-col gap-2 text-sm">{field.title}
            <UnitInput value={draft[field.key]} onChange={value => onChange({ [field.key]: value })} unit={field.unit} ariaLabel={field.title} />
          </label>)}
        </div>
        <label className="flex flex-col gap-2 text-sm">Cost assumptions source
          <input required maxLength={1000} value={draft.costSource} onChange={e => onChange({ costSource: e.target.value })}
            className="h-11 rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal" />
        </label>
      </SectionCard>
      <SectionCard>
        <h2 className="text-[18px] font-semibold">Grid emission factor</h2>
        <label className="flex flex-col gap-2 text-sm">Versioned factor
          <select value={draft.factorId} onChange={e => onChange({ factorId: e.target.value })} className="h-11 w-full rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal">
            <option value="">Select a factor</option>
            {factors.map(item => <option key={item.id} value={item.id}>{item.name} · {item.reporting_year} · {item.gas_basis}</option>)}
          </select>
        </label>
        {!factors.length && <p role="status">No emission factors are available.</p>}
        {factor && <>
          <Chip tone={factor.evidence_status === 'unverified' || factor.evidence_status === 'assumed' ? 'warn' : 'neutral'}>{factor.evidence_status}</Chip>
          <p>{factor.kg_per_kwh} kg {factor.gas_basis}/kWh · {factor.grid_region}</p>
          <p className="break-words text-sm text-pv-muted">Version: {factor.version_id}<br />Method: {factor.factor_method}<br />Source: {factor.source_ref}</p>
        </>}
        <p className="text-sm text-pv-muted">Electricity-associated emissions only. These figures do not represent a complete facility footprint.</p>
      </SectionCard>
    </div>
    <div className="flex flex-wrap justify-between gap-4 rounded-xl border border-pv-divider bg-white p-4">
      <button type="button" onClick={onBack} className={btnSecondary}><ArrowLeft size={18} aria-hidden />Back</button>
      <button type="button" onClick={onContinue} className={btnPrimary}>Review inputs<ArrowRight size={18} aria-hidden /></button>
    </div>
  </div>;
}
