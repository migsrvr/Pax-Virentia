import { api, ApiError } from './api';

export type Range = { minimum: number; maximum: number };
export type Technology = {
  id: string; name: string; version_id: string; source_ref: string; evidence_status: string;
  capacity_m3_per_hour: number; pump_power_kw: number; mixer_power_kw: number;
  flow_rate_range: Range; pump_duty_hours_range: Range; mixing_load_range: Range; chemical_dose_range: Range;
};
export type Factor = {
  id: string; name: string; version_id: string; source_ref: string; evidence_status: string;
  grid_region: string; reporting_year: number; gas_basis: 'CO2' | 'CO2e'; factor_method: string; kg_per_kwh: number;
};
export type Parameters = {
  volume_m3: number; period_start: string; period_end: string; currency: 'PHP'; grid_region: string;
  flow_rate_m3_per_hour: number; pump_duty_hours: number; mixing_hours: number;
  mixing_load_multiplier: number; chemical_dose_mg_per_l: number;
  technology: Omit<Technology, 'id' | 'name'>; factor: Omit<Factor, 'id' | 'name'>;
  costs: { tariff_php_per_kwh: number; chemical_price_php_per_kg: number; labor_php: number;
    maintenance_php: number; other_nonenergy_php: number; source_ref: string };
  dataset_version_id?: string;
  source_time_basis?: { period_start: string; period_end: string };
};
export type Draft = {
  name: string; kind: 'baseline' | 'intervention'; technologyId: string; factorId: string;
  periodStart: string; periodEnd: string; volume: string; flow: string; pumpDuty: string;
  mixingHours: string; multiplier: string; dose: string; tariff: string; chemicalPrice: string;
  labor: string; maintenance: string; other: string; costSource: string; datasetId: string;
};
export const initialDraft: Draft = {
  name: '', kind: 'baseline', technologyId: '', factorId: '',
  periodStart: '', periodEnd: '', volume: '', flow: '',
  pumpDuty: '', mixingHours: '', multiplier: '', dose: '', tariff: '11',
  chemicalPrice: '50', labor: '40000', maintenance: '15000', other: '12000',
  costSource: 'Analyst-entered operating assumptions', datasetId: '',
};
export type DraftProps = { draft: Draft; onChange: (patch: Partial<Draft>) => void };
export type Revision = { id: string; revision_no: number; scenario_id: string; parameters: Parameters };
export type Scenario = { id: string; name: string; kind: 'baseline' | 'intervention'; revision_no?: number; revision_id?: string; latest_revision?: Revision };
export type Run = {
  id: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  scenario_revision_id: string; scenario_name?: string; kind?: 'baseline' | 'intervention'; revision_no?: number;
  created_at: string; ended_at?: string; cancel_requested?: boolean;
  error?: { code?: string; message?: string } | null; error_message?: string;
  frozen_inputs?: { parameters: Parameters; revision_no: number; provenance?: Record<string, unknown> };
};
export type MetricStatus = 'valid' | 'not_estimable' | string;
export type ResultMetric = {
  key: 'energy' | 'carbon' | 'economics' | 'ecology' | string; value: number | null;
  unit: string | null; status: MetricStatus; interval_key: string; reason?: string; required_evidence?: string[];
};
/** Mirrors backend/app/services/simulations.py `calculate_snapshot` plus stored run identity. */
export type Results = {
  run_id: string; snapshot_hash: string; code_version: string;
  requested_modules: string[];
  energy: { total_kwh: number; energy_intensity_kwh_per_m3: number | null; status: MetricStatus; warnings: string[] };
  carbon?: { emissions_kg_co2e?: number; emissions_kg_co2?: number; unit: 'kg CO2e' | 'kg CO2' | string;
    gas_basis: 'CO2e' | 'CO2' | string; grid_region: string; factor_kg_per_kwh: number };
  economics?: { electricity_cost_php: number; chemical_cost_php: number; labor_cost_php: number;
    maintenance_cost_php: number; other_cost_php: number; total_opex_php: number; chemical_kg_used: number;
    net_savings_php: number | null; simple_payback_years: number | null };
  ecology?: { indicator_key: string; status: MetricStatus; value: number | null; unit: string | null;
    reason: string; required_evidence: string[] };
  metrics: ResultMetric[];
  provenance: Record<string, unknown>; warnings: string[];
};
export type Comparison = {
  baseline_run_id: string; intervention_run_id: string;
  compatible: boolean; volume_m3: number; period_start: string; period_end: string; currency: string;
  net_savings_php: number | null;
  deltas: { key: string; baseline: number | null; intervention: number | null; delta: number | null;
    delta_pct: number | null; unit: string | null; baseline_status: string; intervention_status: string }[];
};
export type Explanation = { narrative?: string; summary?: string; key_findings?: string[]; limitations?: string[]; generated_at?: string };
export type RunInputs = {
  run_id: string; scenario_id: string; scenario_name: string; kind: 'baseline' | 'intervention';
  revision_no: number; status: Run['status']; parameters: Parameters; requested_modules: string[];
};

/** Flatten nested frozen inputs into labelled rows for display. */
export function assumptionRows(value: unknown, prefix = ''): [string, string][] {
  if (value === null || value === undefined) return [[prefix, 'Not supplied']];
  if (Array.isArray(value)) return [[prefix, value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ')]];
  if (typeof value === 'object') return Object.entries(value).flatMap(([key, entry]) => assumptionRows(entry, prefix ? `${prefix} / ${key}` : key));
  return [[prefix.replace(/_/g, ' '), String(value)]];
}

/** Emissions value and unit, preserving a CO2-only factor's meaning. */
export function emissionsOf(carbon: Results['carbon']): { value: number | undefined; unit: string } {
  return {
    value: carbon?.emissions_kg_co2e ?? carbon?.emissions_kg_co2,
    unit: (carbon?.unit ?? (carbon?.gas_basis === 'CO2' ? 'kg CO2' : 'kg CO2e')).replace('CO2', 'CO₂'),
  };
}

export async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api.get<{ items: T[] }>(`${path}?limit=100&offset=${offset}`);
    items.push(...page.items);
    if (page.items.length < 100) return items;
  }
}
export const listRuns = () => listAll<Run>('/runs');
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function loadSavedScenario(id: string): Promise<{ scenario: Scenario; revision: Revision }> {
  if (!isUuid(id)) throw new Error('The scenario ID is invalid. Choose a saved scenario from the dashboard.');
  const scenarios = await listAll<Scenario>('/scenarios');
  const scenario = scenarios.find(item => item.id.toLowerCase() === id.toLowerCase());
  if (!scenario) throw new Error('This scenario is not available in your workspace.');
  const revisions = await listAll<Revision>(`/scenarios/${encodeURIComponent(scenario.id)}/revisions`);
  const revision = revisions.filter(item => item.scenario_id === scenario.id).sort((a, b) => b.revision_no - a.revision_no)[0];
  if (!revision) throw new Error('This scenario has no saved revision to resume.');
  return { scenario, revision };
}
export function manilaTimestamp(value: string): string {
  return `${/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ? `${value}:00` : value}+08:00`;
}
function manilaLocal(value: string): string {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) throw new Error('The saved reporting period is invalid.');
  return new Date(instant + 8 * 3600000).toISOString().slice(0, -1).replace(/\.000$/, '').replace(/:00$/, '');
}
function matchesCatalogFields(saved: object, catalog: object, fields: readonly string[]): boolean {
  const before = saved as Record<string, unknown>, current = catalog as Record<string, unknown>;
  return fields.every(key => {
    const a = before[key], b = current[key];
    if (b !== null && typeof b === 'object') {
      return a !== null && typeof a === 'object' && matchesCatalogFields(a, b, Object.keys(b));
    }
    return a === b;
  });
}
export function hydrateDraft(scenario: Scenario, revision: Revision, technologies: Technology[], factors: Factor[]): Draft {
  const p = revision.parameters;
  const technology = technologies.find(item => item.version_id === p.technology.version_id);
  const factor = factors.find(item => item.version_id === p.factor?.version_id);
  if (!technology || !factor) throw new Error('A saved technology or emission factor version is unavailable in the current catalogs. This draft cannot be edited until its catalog versions are restored.');
  const technologyFields = ['version_id', 'source_ref', 'evidence_status', 'capacity_m3_per_hour', 'pump_power_kw', 'mixer_power_kw',
    'flow_rate_range', 'pump_duty_hours_range', 'mixing_load_range', 'chemical_dose_range'];
  const factorFields = ['version_id', 'source_ref', 'grid_region', 'reporting_year', 'gas_basis', 'factor_method', 'kg_per_kwh', 'evidence_status'];
  if (!matchesCatalogFields(p.technology, technology, technologyFields)) throw new Error('The saved technology specification differs from the catalog under the same version ID. Editing is blocked to preserve frozen inputs. Restore the matching catalog content or create a new scenario.');
  if (!matchesCatalogFields(p.factor, factor, factorFields)) throw new Error('The saved emission factor differs from the catalog under the same version ID. Editing is blocked to preserve frozen inputs. Restore the matching catalog content or create a new scenario.');
  return {
    name: scenario.name, kind: scenario.kind, technologyId: technology.id, factorId: factor.id,
    periodStart: manilaLocal(p.source_time_basis?.period_start ?? p.period_start),
    periodEnd: manilaLocal(p.source_time_basis?.period_end ?? p.period_end),
    volume: String(p.volume_m3), flow: String(p.flow_rate_m3_per_hour), pumpDuty: String(p.pump_duty_hours),
    mixingHours: String(p.mixing_hours), multiplier: String(p.mixing_load_multiplier), dose: String(p.chemical_dose_mg_per_l),
    tariff: String(p.costs.tariff_php_per_kwh), chemicalPrice: String(p.costs.chemical_price_php_per_kg),
    labor: String(p.costs.labor_php), maintenance: String(p.costs.maintenance_php), other: String(p.costs.other_nonenergy_php),
    costSource: p.costs.source_ref, datasetId: p.dataset_version_id ?? '',
  };
}
export const number = (value: string) => value.trim() ? Number(value.replace(/,/g, '')) : NaN;
export const format = (value: number | null | undefined, decimals = 2) =>
  value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('en-PH', { maximumFractionDigits: decimals });
/** Whole-number display for headline metrics and public totals. */
export const formatInteger = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('en-PH', { maximumFractionDigits: 0 });
/** Fixed-precision display for intensities and rates; two decimals by default. */
export const formatRate = (value: number | null | undefined, decimals = 2) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
/** Signed percentage with at most one decimal place. */
export const formatDeltaPct = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatRate(Math.abs(value), 1)}%`;
export const label = (key: string) => ({ energy: 'Energy consumption', carbon: 'Electricity-associated emissions', economics: 'Operating cost', ecology: 'Downstream ecosystem stress' }[key] ?? key.replace(/_/g, ' '));
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.fieldErrors.length) return `${error.message} ${error.fieldErrors.map(e => `${e.field}: ${e.message}`).join(' ')}`;
  return error instanceof Error ? error.message : 'The request could not be completed.';
}
export function buildParameters(d: Draft, technology: Technology, factor: Factor): Parameters {
  // Catalog display fields are deliberately excluded from strict server schemas.
  return {
    volume_m3: number(d.volume), period_start: manilaTimestamp(d.periodStart), period_end: manilaTimestamp(d.periodEnd),
    currency: 'PHP', grid_region: factor.grid_region,
    flow_rate_m3_per_hour: number(d.flow), pump_duty_hours: number(d.pumpDuty), mixing_hours: number(d.mixingHours),
    mixing_load_multiplier: number(d.multiplier), chemical_dose_mg_per_l: number(d.dose),
    technology: { version_id: technology.version_id, source_ref: technology.source_ref, evidence_status: technology.evidence_status,
      capacity_m3_per_hour: technology.capacity_m3_per_hour, pump_power_kw: technology.pump_power_kw, mixer_power_kw: technology.mixer_power_kw,
      flow_rate_range: technology.flow_rate_range, pump_duty_hours_range: technology.pump_duty_hours_range,
      mixing_load_range: technology.mixing_load_range, chemical_dose_range: technology.chemical_dose_range },
    factor: { version_id: factor.version_id, source_ref: factor.source_ref, evidence_status: factor.evidence_status,
      grid_region: factor.grid_region, reporting_year: factor.reporting_year, gas_basis: factor.gas_basis,
      factor_method: factor.factor_method, kg_per_kwh: factor.kg_per_kwh },
    costs: { tariff_php_per_kwh: number(d.tariff), chemical_price_php_per_kg: number(d.chemicalPrice),
      labor_php: number(d.labor), maintenance_php: number(d.maintenance), other_nonenergy_php: number(d.other), source_ref: d.costSource.trim() },
    ...(d.datasetId.trim() ? { dataset_version_id: d.datasetId.trim() } : {}),
  };
}
export function validateDraft(d: Draft, technology?: Technology, factor?: Factor): string[] {
  const errors: string[] = [];
  if (!d.name.trim() || d.name.trim().length > 200) errors.push('Enter a scenario name of at most 200 characters.');
  if (!technology) errors.push('Select an available technology specification.');
  if (!factor) errors.push('Select an available emission factor.');
  const start = Date.parse(manilaTimestamp(d.periodStart)), end = Date.parse(manilaTimestamp(d.periodEnd));
  const hours = (end - start) / 3600000;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 365 * 24) errors.push('Choose a valid reporting period of at most 365 days.');
  if (factor && Number.isFinite(hours) && hours > 0) {
    const startYear = Number(d.periodStart.slice(0, 4));
    const lastYear = new Date(end - 1 + 8 * 3600000).getUTCFullYear();
    if (startYear !== factor.reporting_year || lastYear !== factor.reporting_year) errors.push(`The selected factor covers ${factor.reporting_year}; the entire reporting period must fit that year.`);
  }
  for (const [key, title, positive] of [['volume', 'Treated volume', true], ['flow', 'Flow rate', true], ['pumpDuty', 'Pump duty', false], ['mixingHours', 'Mixing hours', false], ['multiplier', 'Mixing load', false], ['dose', 'Chemical dose', false], ['tariff', 'Electricity tariff', false], ['chemicalPrice', 'Chemical price', false], ['labor', 'Labor cost', false], ['maintenance', 'Maintenance cost', false], ['other', 'Other cost', false]] as const) {
    const value = number(d[key]);
    if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) errors.push(`${title} must be a finite ${positive ? 'positive' : 'nonnegative'} number.`);
  }
  if (number(d.pumpDuty) > hours || number(d.mixingHours) > hours) errors.push('Equipment hours must fit within the reporting period.');
  if (number(d.flow) * number(d.pumpDuty) < number(d.volume)) errors.push('Flow × pump duty must cover the treated volume.');
  if (technology) {
    if (number(d.flow) > technology.capacity_m3_per_hour) errors.push('Flow exceeds the selected treatment capacity.');
    for (const [key, title, range] of [['flow', 'Flow rate', technology.flow_rate_range], ['pumpDuty', 'Pump duty', technology.pump_duty_hours_range], ['multiplier', 'Mixing load', technology.mixing_load_range], ['dose', 'Chemical dose', technology.chemical_dose_range]] as const) {
      if (number(d[key]) < range.minimum || number(d[key]) > range.maximum) errors.push(`${title} must be between ${range.minimum} and ${range.maximum} for this specification.`);
    }
  }
  if (!d.costSource.trim() || d.costSource.trim().length > 1000) errors.push('Enter a source for cost assumptions of at most 1,000 characters.');
  if (d.datasetId.trim() && !isUuid(d.datasetId.trim())) errors.push('Dataset version must be a UUID or left empty.');
  return errors;
}
