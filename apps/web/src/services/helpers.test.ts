import { describe, expect, it } from 'vitest';
import { changedInputs, sameBoundary } from './insights';
import { blockingIssues } from './datasets';
import { matches, searchWorkspace } from './search';
import { safePublicText } from './text';
import type { Parameters } from './simulation';

const parameters = (changes: Partial<Parameters> = {}): Parameters => ({
  volume_m3: 100, period_start: '2024-01-01T00:00:00+08:00', period_end: '2024-01-02T00:00:00+08:00', currency: 'PHP',
  grid_region: 'Luzon-Visayas', flow_rate_m3_per_hour: 10, pump_duty_hours: 10, mixing_hours: 5, mixing_load_multiplier: 1,
  chemical_dose_mg_per_l: 20,
  technology: { version_id: 't', source_ref: 's', evidence_status: 'unverified', capacity_m3_per_hour: 150, pump_power_kw: 22,
    mixer_power_kw: 7.5, flow_rate_range: { minimum: 1, maximum: 150 }, pump_duty_hours_range: { minimum: 1, maximum: 24 },
    mixing_load_range: { minimum: 0.2, maximum: 1 }, chemical_dose_range: { minimum: 5, maximum: 80 } },
  factor: { version_id: 'f', source_ref: 's', evidence_status: 'externally_sourced', grid_region: 'Luzon-Visayas',
    reporting_year: 2024, gas_basis: 'CO2e', factor_method: 'm', kg_per_kwh: 0.7 },
  costs: { tariff_php_per_kwh: 11, chemical_price_php_per_kg: 50, labor_php: 0, maintenance_php: 0, other_nonenergy_php: 0, source_ref: 'c' },
  source_time_basis: { period_start: 'a', period_end: 'b' },
  ...changes,
});

describe('comparison insights', () => {
  it('lists only the inputs that differ, ignoring the source time basis', () => {
    const changes = changedInputs(parameters(), parameters({ mixing_load_multiplier: 0.8, source_time_basis: { period_start: 'x', period_end: 'y' } }));
    expect(changes).toEqual([{ field: 'mixing load multiplier', before: '1', after: '0.8' }]);
  });

  it('requires the same volume, period, currency and region', () => {
    expect(sameBoundary(parameters(), parameters({ mixing_hours: 1 }))).toBe(true);
    expect(sameBoundary(parameters(), parameters({ volume_m3: 90 }))).toBe(false);
    expect(sameBoundary(parameters(), undefined)).toBe(false);
  });
});

describe('dataset quality', () => {
  it('reports the same blocking issues as the run gate', () => {
    expect(blockingIssues({ row_count: 5, critical_missing_values: 0, missing_columns: [], invalid_values: [], duplicate_rows: [] })).toEqual([]);
    expect(blockingIssues({ row_count: 0, critical_missing_values: 2, missing_columns: 1, invalid_values: 3, duplicate_rows: [4] })).toHaveLength(5);
  });
});

describe('search', () => {
  it('matches every term case-insensitively across fields', () => {
    expect(matches('pax pilot', 'Pax Silica pilot', 'intervention')).toBe(true);
    expect(matches('pax baseline', 'Pax Silica pilot', 'intervention')).toBe(false);
    expect(matches('   ', 'anything')).toBe(false);
  });

  it('groups hits by record type with links', () => {
    const groups = searchWorkspace('mixing', {
      scenarios: [{ id: 's1', name: 'Reduced mixing', kind: 'intervention', revision_no: 2 }],
      runs: [], datasets: [], reports: [], publications: [],
    });
    expect(groups.find((group) => group.title === 'Scenarios')?.hits).toEqual([
      expect.objectContaining({ title: 'Reduced mixing', to: '/scenarios?scenarioId=s1' }),
    ]);
  });
});

describe('public text', () => {
  it('removes markup and control characters and bounds length', () => {
    expect(safePublicText(' <b>Title</b>\u0007 ')).toBe('bTitle/b');
    expect(safePublicText('x'.repeat(200))).toHaveLength(160);
  });
});
