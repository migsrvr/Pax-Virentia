import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SectionCard, UnitInput, btnPrimary, btnSecondary } from './shared';
import { format, number } from '../../services/simulation';
import type { Draft, DraftProps, Technology } from '../../services/simulation';

export default function OperatingConditionsStep({ draft, onChange, technology, onBack, onContinue }: DraftProps & {
  technology?: Technology; onBack: () => void; onContinue: () => void;
}) {
  const fields: { key: keyof Draft; title: string; unit: string }[] = [
    { key: 'volume', title: 'Treated volume', unit: 'm³' },
    { key: 'flow', title: 'Flow rate', unit: 'm³/h' },
    { key: 'pumpDuty', title: 'Pump duty hours', unit: 'h' },
    { key: 'mixingHours', title: 'Mixing hours', unit: 'h' },
    { key: 'multiplier', title: 'Mixing load multiplier', unit: '×' },
    { key: 'dose', title: 'Chemical dose', unit: 'mg/L' },
  ];
  const covered = number(draft.flow) * number(draft.pumpDuty);
  return <div className="flex flex-col gap-6">
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Reporting period and operating conditions</h2>
          <p className="text-sm text-pv-muted">Times use Asia/Manila (UTC+08:00). Values are analyst assumptions unless linked to evidence.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(['periodStart', 'periodEnd'] as const).map(key => <label key={key} className="flex flex-col gap-2 text-sm">
              {key === 'periodStart' ? 'Period start' : 'Period end'}
              <input type="datetime-local" step="any" required value={draft[key]} onChange={e => onChange({ [key]: e.target.value })}
                className="h-11 min-w-0 rounded-lg border border-pv-input-border bg-white px-3 focus:outline-pv-teal" />
            </label>)}
            {fields.map(field => <label key={field.key} className="flex flex-col gap-2 text-sm">
              {field.title}
              <UnitInput value={draft[field.key]} onChange={value => onChange({ [field.key]: value })} unit={field.unit} ariaLabel={field.title} />
            </label>)}
          </div>
        </SectionCard>
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Specification power</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><dt>Pump power</dt><dd>{format(technology?.pump_power_kw)} kW</dd></div>
            <div><dt>Mixer power</dt><dd>{format(technology?.mixer_power_kw)} kW</dd></div>
          </dl>
          <p className="text-sm text-pv-muted">Power comes from the selected versioned specification. Water-quality effects are not modeled.</p>
        </SectionCard>
      </div>
      <div className="flex flex-col gap-6">
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Input checks</h2>
          <p className={covered < number(draft.volume) ? 'text-pv-err-ink' : 'text-pv-muted'}>Flow × pump duty covers {format(covered)} of {format(number(draft.volume))} m³.</p>
          {technology && <dl className="flex flex-col gap-3 text-sm">
            <div><dt>Flow range</dt><dd>{technology.flow_rate_range.minimum}–{technology.flow_rate_range.maximum} m³/h</dd></div>
            <div><dt>Capacity</dt><dd>{technology.capacity_m3_per_hour} m³/h</dd></div>
            <div><dt>Pump duty range</dt><dd>{technology.pump_duty_hours_range.minimum}–{technology.pump_duty_hours_range.maximum} h</dd></div>
            <div><dt>Mixing load range</dt><dd>{technology.mixing_load_range.minimum}–{technology.mixing_load_range.maximum}</dd></div>
            <div><dt>Chemical dose range</dt><dd>{technology.chemical_dose_range.minimum}–{technology.chemical_dose_range.maximum} mg/L</dd></div>
          </dl>}
        </SectionCard>
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Chemical use preview</h2>
          <p>{format(number(draft.dose) * number(draft.volume) / 1000)} kg for the period</p>
          <p className="text-sm text-pv-muted">Derived from dose × volume ÷ 1,000. The worker calculates final results.</p>
        </SectionCard>
      </div>
    </div>
    <div className="flex flex-wrap justify-between gap-4 rounded-xl border border-pv-divider bg-white p-4">
      <button type="button" onClick={onBack} className={btnSecondary}><ArrowLeft size={18} aria-hidden />Back</button>
      <button type="button" onClick={onContinue} className={btnPrimary}>Continue to costs<ArrowRight size={18} aria-hidden /></button>
    </div>
  </div>;
}
