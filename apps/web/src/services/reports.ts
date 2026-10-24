import { api, downloadFile, openFile } from './api';

export type ReportType = 'technical' | 'data_export';
export type ReportSection = 'summary' | 'inputs' | 'results' | 'comparison';
export type ReportFormat = 'pdf' | 'csv';
export type Cell = string | number | boolean | null;

/** Mirrors backend/app/services/reports.py `build_report_model`. */
export type ReportModel = {
  id: string; title: string; report_type: ReportType | 'public_snapshot'; created_at: string | null;
  created_by_name: string | null; label: string; run_ids: string[]; formats: ReportFormat[]; page_count?: number;
  sections: { key: ReportSection | 'methodology'; title: string; paragraphs: string[];
    tables: { caption: string; columns: string[]; rows: Cell[][] }[] }[];
};

export type ReportRequest = {
  report_type: ReportType; title: string; run_ids: string[]; sections: ReportSection[]; formats: ReportFormat[];
  comparison?: { baseline_run_id: string; intervention_run_id: string };
};

export type StoredReport = {
  id: string; report_type: ReportType; title: string; run_ids: string[]; created_by_name: string | null;
  created_at: string; formats: ReportFormat[]; sections: ReportSection[];
};

export const previewReport = (body: ReportRequest) => api.post<{ preview: ReportModel }>('/reports/preview', body);
export const createReport = (body: ReportRequest) => api.post<StoredReport & { preview: ReportModel }>('/reports', body);
export const listReports = () => api.get<{ items: StoredReport[] }>('/reports?limit=50').then((page) => page.items);

const downloadPath = (id: string, format: ReportFormat, disposition: 'attachment' | 'inline') =>
  `/reports/${encodeURIComponent(id)}/download?format=${format}&disposition=${disposition}`;
const fileStem = (title: string) => title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'report';

export const downloadReport = (report: Pick<StoredReport, 'id' | 'title'>, format: ReportFormat) =>
  downloadFile(downloadPath(report.id, format, 'attachment'), `${fileStem(report.title)}.${format}`);
export const printReport = (report: Pick<StoredReport, 'id'>, target?: Window | null) =>
  openFile(downloadPath(report.id, 'pdf', 'inline'), target);

/** Display formatting matching the PDF renderer; strings (e.g. "Not estimable") pass through. */
export function displayCell(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isInteger(value) && Math.abs(value) < 10000 ? String(value) : value.toLocaleString('en-PH', { maximumFractionDigits: 4 });
  }
  return value;
}
