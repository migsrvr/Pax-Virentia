import { ArrowLeft, Play } from 'lucide-react';
import { Chip, SectionCard, btnPrimary, btnSecondary, btnGhost } from './shared';
import type { Draft, Factor, Technology } from '../../services/simulation';

export default function ReviewRunStep({ draft, technology, factor, busy, onBack, onEdit, onRun }: {
  draft: Draft; technology?: Technology; factor?: Factor; busy: boolean;
  onBack: () => void; onEdit: (step: number) => void; onRun: () => void;
}) {
  const groups = [
    { title: 'Scenario and process', step: 1, rows: [
      ['Scenario', draft.name], ['Type', draft.kind], ['Technology', technology?.name ?? 'Not selected'],
      ['Specification', technology?.version_id ?? '—'], ['Dataset version', draft.datasetId || 'No dataset linked; analyst assumptions'],
    ] },
    { title: 'Operating conditions', step: 2, rows: [
      ['Period (Asia/Manila)', `${draft.periodStart} to ${draft.periodEnd}`], ['Treated volume', `${draft.volume} m³`],
      ['Flow rate', `${draft.flow} m³/h`], ['Pump duty / power', `${draft.pumpDuty} h / ${technology?.pump_power_kw ?? '—'} kW`],
      ['Mixing hours / power', `${draft.mixingHours} h / ${technology?.mixer_power_kw ?? '—'} kW`],
      ['Mixing load', draft.multiplier], ['Chemical dose', `${draft.dose} mg/L`],
    ] },
    { title: 'Costs and emission factor', step: 3, rows: [
      ['Electricity tariff', `${draft.tariff} PHP/kWh`], ['Chemical price', `${draft.chemicalPrice} PHP/kg`],
      ['Labor', `${draft.labor} PHP`], ['Maintenance', `${draft.maintenance} PHP`], ['Other non-energy', `${draft.other} PHP`],
      ['Cost source', draft.costSource], ['Factor', factor ? `${factor.kg_per_kwh} kg ${factor.gas_basis}/kWh · ${factor.version_id}` : 'Not selected'],
      ['Factor source', factor?.source_ref ?? '—'],
    ] },
  ];
  return <div className="flex flex-col gap-6">
    <p className="rounded-xl bg-pv-info-bg p-4 text-sm">Running freezes these inputs into an immutable revision. Later edits create a new revision.</p>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">{groups.map(group => <SectionCard key={group.title}>
        <div className="flex items-center justify-between gap-4"><h2 className="text-[18px] font-semibold">{group.title}</h2>
          <button type="button" onClick={() => onEdit(group.step)} className={btnGhost}>Edit</button></div>
        <dl className="divide-y divide-pv-hairline">{group.rows.map(([term, value]) => <div key={term} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <dt className="text-sm text-pv-muted">{term}</dt><dd className="break-words text-sm font-medium">{value}</dd>
        </div>)}</dl>
      </SectionCard>)}</div>
      <div className="flex flex-col gap-6">
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Scientific boundaries</h2>
          <Chip tone={technology?.evidence_status === 'unverified' ? 'warn' : 'neutral'}>{technology?.evidence_status ?? 'Evidence requires review'}</Chip>
          <p className="text-sm">Pax Silica performance remains unverified. Simulated changes do not establish expected plant performance.</p>
          <p className="text-sm">Ecological stress is not estimable without an approved local model and supporting observations. It is distinct from zero impact.</p>
        </SectionCard>
        <SectionCard>
          <h2 className="text-[18px] font-semibold">What the worker calculates</h2>
          <p className="text-sm">Pump and mixer electricity; electricity-associated emissions; period operating cost; ecological evidence gate.</p>
          <p className="text-sm text-pv-muted">This offline model does not affect plant equipment.</p>
        </SectionCard>
      </div>
    </div>
    <div className="flex flex-wrap justify-between gap-4 rounded-xl border border-pv-divider bg-white p-4">
      <button type="button" onClick={onBack} className={btnSecondary}><ArrowLeft size={18} aria-hidden />Back</button>
      <button type="button" disabled={busy} onClick={onRun} className={btnPrimary + ' disabled:opacity-50'}><Play size={18} aria-hidden />{busy ? 'Saving inputs…' : 'Run simulation'}</button>
    </div>
  </div>;
}
