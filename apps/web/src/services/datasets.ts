/** Mirrors backend/app/services/datasets.py `inspect_csv`. */
export type QualityReport = {
  row_count: number; column_count: number; columns: string[];
  missing_values: Record<string, number>; critical_missing_values: number; missing_columns: string[];
  duplicate_rows: number[]; invalid_values: { row: number; field: string; reason: string }[];
  outliers: Record<string, { row: number; value: number; lower_bound: number; upper_bound: number }[]>;
  outlier_rule: string; content_hash: string; schema_version: string;
};
export type DatasetSummary = {
  id: string; source_ref: string; evidence_status: string; content_hash: string; schema_version: string;
  created_by_name: string | null; created_at: string; row_count: number; column_count: number;
  quality: { missing_columns: number; critical_missing_values: number; invalid_values: number; duplicate_rows: number; outliers: number };
};

/** Blocking issues match the run-submission gate in services/simulations.py. */
export function blockingIssues(report: Pick<QualityReport, 'row_count' | 'critical_missing_values'> & {
  missing_columns: unknown[] | number; invalid_values: unknown[] | number; duplicate_rows: unknown[] | number;
}): string[] {
  const count = (value: unknown[] | number) => (Array.isArray(value) ? value.length : value);
  const issues: string[] = [];
  if (report.row_count === 0) issues.push('The file has no data rows.');
  if (count(report.missing_columns)) issues.push(`${count(report.missing_columns)} required column(s) are missing.`);
  if (report.critical_missing_values) issues.push(`${report.critical_missing_values} required value(s) are empty.`);
  if (count(report.invalid_values)) issues.push(`${count(report.invalid_values)} value(s) are invalid.`);
  if (count(report.duplicate_rows)) issues.push(`${count(report.duplicate_rows)} duplicate row(s).`);
  return issues;
}
