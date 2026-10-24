import { assumptionRows } from './simulation';
import type { Parameters } from './simulation';

/** Same boundary test the server applies, so obviously incompatible pairs aren't requested. */
export function sameBoundary(a: Parameters | undefined, b: Parameters | undefined) {
  if (!a || !b) return false;
  return a.volume_m3 === b.volume_m3 && a.period_start === b.period_start && a.period_end === b.period_end
    && a.currency === b.currency && a.grid_region === b.grid_region;
}

/** Inputs whose frozen values differ between the two runs. */
export function changedInputs(baseline: Parameters, intervention: Parameters): { field: string; before: string; after: string }[] {
  const strip = ({ source_time_basis: _ignored, ...rest }: Parameters) => rest;
  const before = new Map(assumptionRows(strip(baseline)));
  const after = new Map(assumptionRows(strip(intervention)));
  const fields = Array.from(new Set([...before.keys(), ...after.keys()]));
  return fields
    .filter((field) => before.get(field) !== after.get(field))
    .map((field) => ({ field, before: before.get(field) ?? 'Not supplied', after: after.get(field) ?? 'Not supplied' }));
}
