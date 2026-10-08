export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type MetricStatus = 'valid' | 'not_estimable' | 'running' | 'failed' | 'pending';

export interface GridFactor {
  factor_id: string;
  grid_region: string;
  reporting_year: number;
  gas_basis: string;
  accounting_method: string;
  kg_co2e_per_kwh: number;
  reference: string;
}

export interface PlantObservation {
  period_start: string;
  period_end: string;
  volume_m3: number;
  electricity_kwh: number;
  pump_hours: number;
  mixing_hours: number;
  chemical_dose_mg_per_l: number;
  water_turbidity_ntu: number;
  ph_level: number;
  notes: string;
}

export interface DatasetVersion {
  id: string;
  name: string;
  version: string;
  rows: number;
  content_hash: string;
  quality_score: number;
  issues: { level: 'error' | 'warning' | 'info'; field: string; message: string; rows_affected: number }[];
  source: string;
  period: string;
  status: 'validated' | 'needs_review' | 'rejected';
}

export interface ScenarioRevision {
  id: string;
  name: string;
  revision_no: number;
  kind: 'baseline' | 'intervention';
  updated_at: string;
  volume_m3: number;
  period: string;
  tariff_php_per_kwh: number;
  technology: string;
  factor_id: string;
}

export interface SimulationRun {
  id: string;
  scenario_name: string;
  revision_no: number;
  kind: 'baseline' | 'intervention';
  status: RunStatus;
  started_at: string;
  ended_at?: string;
  energy_kwh: number | null;
  emissions_kgco2e: number | null;
  opex_php: number | null;
  ecology_status: MetricStatus;
}

export interface MetricDelta {
  key: string;
  label: string;
  unit: string;
  baseline: number | null;
  intervention: number | null;
  delta: number | null;
  delta_pct: number | null;
  baseline_status: MetricStatus;
  intervention_status: MetricStatus;
}
