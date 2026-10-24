import { useQuery } from '@tanstack/react-query';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { LoadState, NoPublishedSnapshot, ReportLink } from '../components/public/PublicData';
import { CARD_CLASS, METRIC_LABELS, boundaryText, findMetric, metricValue, publishedOn } from '../components/public/publicPortal';
import { listPublicReports } from '../services/publications';
import type { PublicReport } from '../services/publications';

/**
 * P04 · Scenario comparison. Published reports are shown side by side only
 * when they share the same boundary (volume, period and currency), because
 * results over different boundaries are not comparable.
 */

const METRIC_KEYS = ['energy', 'carbon', 'economics', 'ecology'];

function boundaryKey(report: PublicReport) {
  const boundary = report.snapshot_data?.boundary ?? {};
  return JSON.stringify([boundary.volume_m3, boundary.period_start, boundary.period_end, boundary.currency]);
}

function ComparisonTable({ reports }: { reports: PublicReport[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        <caption className="sr-only">Published scenarios over the same boundary</caption>
        <thead>
          <tr className="bg-pv-page">
            <th scope="col" className="border-b border-pv-line px-4 py-3 text-[12px] font-medium text-pv-ink-light">Indicator</th>
            {reports.map((report) => (
              <th key={report.slug} scope="col" className="border-b border-pv-line px-4 py-3 align-bottom">
                <ReportLink report={report} />
                <span className="block text-[12px] font-normal text-pv-ink-light">Published {publishedOn(report.published_at)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_KEYS.map((key) => (
            <tr key={key}>
              <th scope="row" className="border-b border-pv-line-soft px-4 py-3 font-medium text-pv-ink">{METRIC_LABELS[key]}</th>
              {reports.map((report) => (
                <td key={report.slug} className="border-b border-pv-line-soft px-4 py-3 tabular-nums text-pv-ink">
                  {metricValue(findMetric(report.snapshot_data, key))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicScenariosPage() {
  const reports = useQuery({ queryKey: ['public-reports', 'with-snapshots'], queryFn: () => listPublicReports(100, true), retry: 1 });
  const groups = new Map<string, PublicReport[]>();
  for (const report of reports.data ?? []) {
    if (!report.snapshot_data) continue;
    const key = boundaryKey(report);
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }
  const comparable = [...groups.values()].filter((group) => group.length > 1);
  const single = [...groups.values()].filter((group) => group.length === 1).flat();

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Scenarios" />
      <main className="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-6 pb-12 pt-8 lg:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Scenario comparison</h1>
          <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
            Published scenarios side by side. Scenarios are compared only when they cover the same treated volume,
            period and currency; anything else would not be a fair comparison.
          </p>
        </div>
        <LoadState query={reports}>
          {!reports.data?.length ? <NoPublishedSnapshot title="No published scenarios to compare yet" /> : null}
          {comparable.map((group) => (
            <section key={boundaryKey(group[0])} className={`flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
              <div className="flex flex-col gap-1">
                <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">Same boundary</h2>
                <p className="text-[14px] leading-5 text-pv-ink-light">{boundaryText(group[0].snapshot_data)}</p>
              </div>
              <ComparisonTable reports={group} />
              <p className="text-[12px] leading-4 text-pv-ink-light">
                Each column is a separately reviewed snapshot. Differences are not adjusted or recalculated here.
              </p>
            </section>
          ))}
          {reports.data?.length && !comparable.length ? (
            <section className={`flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">No comparable scenarios yet</h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">
                Side-by-side comparisons need at least two published scenarios over the same boundary.
              </p>
            </section>
          ) : null}
          {single.length ? (
            <section className={`flex flex-col gap-3 p-6 ${CARD_CLASS}`}>
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Published on their own</h2>
              <ul className="flex flex-col gap-2">
                {single.map((report) => (
                  <li key={report.slug} className="flex flex-wrap items-center justify-between gap-2 border-b border-pv-line-soft pb-2 last:border-b-0">
                    <ReportLink report={report} />
                    <span className="text-[12px] text-pv-ink-light">{boundaryText(report.snapshot_data)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </LoadState>
      </main>
      <PublicFooter />
    </div>
  );
}
