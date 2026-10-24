import { useQuery } from '@tanstack/react-query';
import { latestPublicReport, listPublicReports } from '../../services/publications';
import type { PublicMetric, PublicSnapshot } from '../../services/publications';
import { format } from '../../services/simulation';

export const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
export const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90 disabled:opacity-50';
export const CARD_CLASS = 'rounded-xl border border-pv-line bg-white shadow-pv';

export const METRIC_LABELS: Record<string, string> = {
  energy: 'Electricity used',
  carbon: 'Emissions from electricity',
  economics: 'Operating cost',
  ecology: 'Downstream ecosystem stress',
};

export function usePublicReports(limit = 50) {
  return useQuery({ queryKey: ['public-reports', limit], queryFn: () => listPublicReports(limit), retry: 1 });
}

export function useLatestPublicReport() {
  return useQuery({ queryKey: ['public-report', 'latest'], queryFn: latestPublicReport, retry: 1 });
}

export const publishedOn = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date unavailable';

const displayUnit = (unit: string | null | undefined) => (unit ?? '').replace('CO2', 'CO₂');

/** A metric's public value; not_estimable is never shown as a number or zero. */
export function metricValue(metric: Pick<PublicMetric, 'value' | 'unit' | 'status'> | undefined): string {
  if (!metric) return 'Not published';
  if (metric.status === 'not_estimable') return 'Not estimable';
  if (metric.value === null || metric.value === undefined) return 'Not available';
  return `${format(metric.value)} ${displayUnit(metric.unit)}`.trim();
}

export const findMetric = (snapshot: PublicSnapshot | undefined, key: string) =>
  snapshot?.metrics.find((metric) => metric.key === key);

export function boundaryText(snapshot: PublicSnapshot | undefined): string {
  const boundary = snapshot?.boundary;
  if (!boundary) return 'Boundary not published';
  const day = (value?: string) => (value ? new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  return `${format(boundary.volume_m3)} m³ treated · ${day(boundary.period_start)} to ${day(boundary.period_end)}`;
}
