import { STATUS_LABELS } from './publications';
import type { Publication } from './publications';
import type { StoredReport } from './reports';
import type { Run, Scenario } from './simulation';
import type { DatasetSummary } from './datasets';

export type Hit = { id: string; title: string; detail: string; to: string };

export function matches(query: string, ...fields: (string | null | undefined)[]) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return terms.length > 0 && terms.every((term) => haystack.includes(term));
}

export function searchWorkspace(query: string, data: {
  scenarios: Scenario[]; runs: Run[]; datasets: DatasetSummary[]; reports: StoredReport[]; publications: Publication[];
}): { title: string; hits: Hit[] }[] {
  return [
    { title: 'Scenarios', hits: data.scenarios.filter((item) => matches(query, item.name, item.kind, item.id)).map((item) => ({
      id: item.id, title: item.name, detail: `${item.kind} · revision ${item.revision_no ?? '—'}`,
      to: `/scenarios?scenarioId=${encodeURIComponent(item.id)}` })) },
    { title: 'Runs', hits: data.runs.filter((item) => matches(query, item.scenario_name, item.kind, item.status, item.id)).map((item) => ({
      id: item.id, title: `${item.scenario_name ?? 'Scenario'} · run ${item.id.slice(0, 8)}`,
      detail: `${item.status} · ${new Date(item.created_at).toLocaleString()}`,
      to: item.status === 'succeeded' ? `/results?runId=${encodeURIComponent(item.id)}` : '/' })) },
    { title: 'Datasets', hits: data.datasets.filter((item) => matches(query, item.source_ref, item.evidence_status, item.id, item.content_hash)).map((item) => ({
      id: item.id, title: item.source_ref, detail: `${item.row_count} rows · ${item.evidence_status.replace('_', ' ')}`, to: '/datasets' })) },
    { title: 'Reports', hits: data.reports.filter((item) => matches(query, item.title, item.report_type, item.id)).map((item) => ({
      id: item.id, title: item.title, detail: `${item.formats.map((f) => f.toUpperCase()).join(' · ')} · ${new Date(item.created_at).toLocaleString()}`,
      to: '/reports' })) },
    { title: 'Public snapshots', hits: data.publications.filter((item) => matches(query, item.title, item.slug, item.summary, item.status)).map((item) => ({
      id: item.id, title: item.title, detail: STATUS_LABELS[item.status],
      to: item.status === 'published' ? item.public_path : `/results?runId=${encodeURIComponent(item.run_id)}` })) },
  ];
}
