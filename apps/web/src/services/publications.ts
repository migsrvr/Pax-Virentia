import { api, ApiError, apiBaseUrl } from './api';
import type { ChipTone } from '../pages/scenarios/shared';

export type PublicationStatus = 'pending_review' | 'published' | 'rejected' | 'withdrawn';

export type PublicMetric = {
  key: string; value: number | null; unit: string | null; status: string;
  reason?: string; required_evidence?: string[]; interval_key?: string;
};

/** The redacted public schema, as returned by sanitize_snapshot on the backend. */
export type PublicSnapshot = {
  schema_version: number;
  boundary: { volume_m3?: number; period_start?: string; period_end?: string; currency?: string };
  metrics: PublicMetric[];
  provenance: { technology_evidence_status?: string; factor_evidence_status?: string; emissions_boundary?: string };
  limitations: string[];
  energy?: { total_kwh?: number; energy_intensity_kwh_per_m3?: number | null; status?: string };
  carbon?: { emissions_kg_co2e?: number; emissions_kg_co2?: number; factor_kg_per_kwh?: number; gas_basis?: string; unit?: string };
  economics?: Record<string, number | null>;
  ecology?: { indicator_key?: string; status?: string; value?: number | null; unit?: string | null; reason?: string; required_evidence?: string[] };
};

/** Private workflow view (signed-in workspace). */
export type Publication = {
  id: string; run_id: string; slug: string; title: string; summary: string | null; status: PublicationStatus;
  submitted_by: string; submitted_by_name: string | null; submitted_at: string;
  reviewed_by: string | null; reviewed_by_name: string | null; reviewed_at: string | null; decision_reason: string | null;
  published_at: string | null; withdrawn_by: string | null; withdrawn_by_name: string | null;
  withdrawn_at: string | null; withdrawal_reason: string | null; view_count: number; public_path: string;
  snapshot_data?: PublicSnapshot;
  audit?: { id: string; actor_name: string | null; action: string; created_at: string;
    change_summary: { status?: { from: string | null; to: string }; reason?: string | null } }[];
};

/** Public view (no identifiers, people or workflow fields). */
export type PublicReport = {
  slug: string; title: string; summary: string | null; published_at: string; view_count: number;
  public_path: string; snapshot_data?: PublicSnapshot;
};

export type WithdrawnTombstone = {
  slug: string; title: string; published_at: string | null; withdrawn_at: string | null; withdrawal_reason: string | null;
};

export const STATUS_LABELS: Record<PublicationStatus, string> = {
  pending_review: 'Awaiting review',
  published: 'Published',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_TONES: Record<PublicationStatus, ChipTone> = {
  pending_review: 'warn',
  published: 'ok',
  rejected: 'err',
  withdrawn: 'neutral',
};

export const listPublications = (params: { status?: PublicationStatus; runId?: string; limit?: number } = {}) => {
  const query = new URLSearchParams({ limit: String(params.limit ?? 100) });
  if (params.status) query.set('status', params.status);
  if (params.runId) query.set('run_id', params.runId);
  return api.get<{ items: Publication[] }>(`/publications?${query}`).then(page => page.items);
};
export const getPublication = (id: string) => api.get<Publication>(`/publications/${encodeURIComponent(id)}`);
export const submitPublication = (body: { run_id: string; title: string; summary?: string }) =>
  api.post<Publication>('/publications', body);
export const decidePublication = (id: string, action: 'approve' | 'reject' | 'withdraw', reason?: string) =>
  api.post<Publication>(`/publications/${encodeURIComponent(id)}/${action}`, reason ? { reason } : undefined);

export const listPublicReports = (limit = 20, includeSnapshot = false) =>
  api.get<{ items: PublicReport[] }>(`/public/reports?limit=${limit}${includeSnapshot ? '&include_snapshot=true' : ''}`)
    .then(page => page.items);

export type PublicReportResult =
  | { state: 'published'; report: PublicReport }
  | { state: 'withdrawn'; tombstone: WithdrawnTombstone }
  | { state: 'missing' };

/** Resolve a public slug to its published report, a withdrawal notice, or nothing. */
export async function getPublicReport(slug: string): Promise<PublicReportResult> {
  try {
    return { state: 'published', report: await api.get<PublicReport>(`/public/reports/${encodeURIComponent(slug)}`) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 410 && error.details) {
      return { state: 'withdrawn', tombstone: error.details as unknown as WithdrawnTombstone };
    }
    if (error instanceof ApiError && error.status === 404) return { state: 'missing' };
    throw error;
  }
}

/** The most recently published report with its snapshot, or null if none is published. */
export async function latestPublicReport(): Promise<PublicReport | null> {
  const [latest] = await listPublicReports(1);
  if (!latest) return null;
  const result = await getPublicReport(latest.slug);
  return result.state === 'published' ? result.report : null;
}

export const publicDownloadPath = (slug: string, format: 'pdf' | 'csv') =>
  `/public/reports/${encodeURIComponent(slug)}/download?format=${format}`;
export const publicDownloadUrl = (slug: string, format: 'pdf' | 'csv') => `${apiBaseUrl}${publicDownloadPath(slug, format)}`;
