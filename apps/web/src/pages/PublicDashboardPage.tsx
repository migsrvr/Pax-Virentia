import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { LimitationsCard, LoadState, NoPublishedSnapshot, ReportLink } from '../components/public/PublicData';
import { CARD_CLASS, METRIC_LABELS, OUTLINE_BTN, PRIMARY_BTN, boundaryText, metricValue, publishedOn, useLatestPublicReport, usePublicReports } from '../components/public/publicPortal';

/**
 * P02 · Public dashboard. The headline indicators of the most recently approved
 * publication, with its boundary and limitations. Values come only from the
 * reviewed public snapshot; nothing is computed or filled in here.
 */

const MEANING = [
  'Treating water takes electricity, mostly for pumping. Less electricity usually means lower operating cost and fewer electricity-associated emissions.',
  'Emissions count only the electricity used, at the selected grid’s published emission factor. They are not a full facility footprint.',
  'Operating cost covers electricity, treatment chemicals, labor, maintenance and other stated non-energy costs for the same period.',
];

export default function PublicDashboardPage() {
  const latest = useLatestPublicReport();
  const reports = usePublicReports(10);
  const report = latest.data;
  const snapshot = report?.snapshot_data;

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Overview" />
      <main className="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-6 pb-12 pt-8 lg:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Sustainability dashboard</h1>
          <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
            The headline indicators from the latest reviewed snapshot for the representative plant. Every figure is a
            simulated estimate from an offline model, not a live measurement.
          </p>
        </div>

        <LoadState query={latest}>
          {!report || !snapshot ? (
            <NoPublishedSnapshot />
          ) : (
            <>
              <section className={`flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">{report.title}</h2>
                    <p className="text-[14px] leading-5 text-pv-ink-light">
                      {boundaryText(snapshot)} · published {publishedOn(report.published_at)}
                    </p>
                  </div>
                  <span className="inline-flex h-6 items-center rounded-full bg-pv-info-bg px-2 text-[12px] font-medium leading-4 text-pv-info">
                    Simulated estimate
                  </span>
                </div>
                {report.summary ? <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink">{report.summary}</p> : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {snapshot.metrics.map((metric) => (
                    <article key={metric.key} className="flex flex-col gap-2 rounded-xl bg-pv-page p-4">
                      <h3 className="text-[14px] font-medium leading-5 text-pv-ink-light">{METRIC_LABELS[metric.key] ?? metric.key}</h3>
                      <p className="text-[24px] font-semibold leading-8 tabular-nums text-pv-ink">{metricValue(metric)}</p>
                      {metric.status === 'not_estimable' ? (
                        <p className="text-[12px] leading-4 text-pv-ink-light">
                          {metric.reason ?? 'Available evidence does not support an estimate.'} Not estimable is not zero impact.
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link to={`/public/reports/${report.slug}`} className={PRIMARY_BTN}>Read the full report</Link>
                  <Link to="/public/impacts" className={OUTLINE_BTN}>How each indicator is estimated</Link>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className={`flex flex-col gap-3 p-6 ${CARD_CLASS}`}>
                  <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">What the numbers mean</h2>
                  <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-5 text-pv-ink">
                    {MEANING.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <LimitationsCard snapshot={snapshot} />
              </div>
            </>
          )}
        </LoadState>

        {reports.data && reports.data.length > 1 ? (
          <section className={`flex flex-col gap-3 p-6 ${CARD_CLASS}`}>
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Other published reports</h2>
            <ul className="flex flex-col gap-2">
              {reports.data.slice(1).map((item) => (
                <li key={item.slug} className="flex flex-wrap items-center justify-between gap-2 border-b border-pv-line-soft pb-2 last:border-b-0">
                  <ReportLink report={item} />
                  <span className="text-[12px] text-pv-ink-light">Published {publishedOn(item.published_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}
