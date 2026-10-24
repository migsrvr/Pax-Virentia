import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import DownloadConfirmDialog from '../components/public/DownloadConfirmDialog';
import { LoadState } from '../components/public/PublicData';
import { CARD_CLASS, OUTLINE_BTN, PRIMARY_BTN, boundaryText, publishedOn, usePublicReports } from '../components/public/publicPortal';
import { publicDownloadPath } from '../services/publications';
import type { PublicReport } from '../services/publications';
import iconDownloadWhite from '../assets/pv/icon-download-white.svg';

/**
 * P06 · Reports and methodology. Lists reviewed publications from the API with
 * real PDF/CSV downloads, and documents the active model's formulas. Withdrawn
 * reports are not listed; their links show a withdrawal notice instead.
 */

const SECTIONS = [
  { label: 'Published reports', anchor: 'published-reports' },
  { label: 'Methodology', anchor: 'methodology' },
  { label: 'Glossary', anchor: 'glossary' },
];

/** Matches backend/app/services/simulations.py (model versions in the footnote). */
const METHODOLOGY = [
  { indicator: 'Energy use', plain: 'Each pump and mixer: its power × how hard it runs × the hours it runs. Pumps run at full load.', formula: 'kWh = Σ (kW × load × hours)' },
  { indicator: 'Emissions from electricity', plain: 'Electricity used × the selected grid’s emission factor for that region and year.', formula: 'kg = kWh × grid factor (kg/kWh)' },
  { indicator: 'Chemical use', plain: 'Dose × the amount of water treated.', formula: 'kg = mg/L × m³ ÷ 1,000' },
  { indicator: 'Operating cost', plain: 'Electricity and chemicals at the stated prices, plus labor, maintenance and other stated costs.', formula: '₱ = kWh × tariff + kg × price + other costs' },
  { indicator: 'Ecosystem stress', plain: 'No approved local ecological model exists yet, so it is always shown as “not estimable”.', formula: 'evidence gate → not estimable' },
];

const GLOSSARY = [
  { term: 'Simulated estimate', definition: 'A number calculated by the model from inputs and assumptions — not a measurement.' },
  { term: 'Scenario', definition: 'One way the plant could operate, described by its settings and assumptions over a stated volume and period.' },
  { term: 'Baseline', definition: 'The reference scenario that others are compared with, over the same volume, period and accounting boundary.' },
  { term: 'Electricity-associated emissions', definition: 'Emissions from generating the electricity used, at the selected grid factor. Not a full facility footprint.' },
  { term: 'Grid emission factor', definition: 'Emissions per kWh of electricity for a stated region, year and accounting method.' },
  { term: 'Not estimable', definition: 'The evidence does not support a value. It means unknown — not zero, and not safe.' },
  { term: 'Snapshot', definition: 'A reviewed, published set of results. Later edits cannot change it; it can only be withdrawn.' },
  { term: 'Review', definition: 'A utility reviewer other than the analyst approves a snapshot before it appears here. It is not a regulatory approval.' },
];

type PendingDownload = { report: PublicReport; format: 'pdf' | 'csv' };

export default function PublicReportsPage() {
  const reports = usePublicReports(100);
  const [download, setDownload] = useState<PendingDownload | null>(null);

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Reports & methodology" />

      <main>
        <section className="border-b border-pv-line bg-white">
          <div className="flex w-full flex-col items-start gap-4 p-8">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Reports and methodology</h1>
            <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">
              Download reviewed reports, and see exactly how every number was estimated.
            </p>
            <nav aria-label="On this page" className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <a key={section.anchor} href={`#${section.anchor}`}
                  className="inline-flex h-11 items-center rounded-full border border-pv-line-strong bg-white px-4 text-[14px] font-medium leading-5 text-pv-ink transition-colors hover:bg-pv-page">
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-6 pb-12 pt-8 lg:px-8">
          <section id="published-reports" className={`scroll-mt-6 flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
            <div className="flex flex-col">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">Published reports</h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">Reviewed internally · not a regulatory approval</p>
            </div>
            <LoadState query={reports}>
              {!reports.data?.length ? (
                <p className="py-4 text-[14px] leading-5 text-pv-ink-light">
                  No reports have been published yet. Reports appear here only after a reviewer approves them.
                </p>
              ) : (
                reports.data.map((report) => (
                  <div key={report.slug} className="flex flex-wrap items-center gap-4 border-b border-pv-line-soft py-4 last:border-b-0">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-pv-critical-bg text-[12px] font-semibold leading-5 text-pv-critical">
                      PDF
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <p className="text-[14px] font-semibold leading-5 text-pv-ink">{report.title}</p>
                      <p className="text-[12px] leading-4 text-pv-ink-light">
                        Published {publishedOn(report.published_at)}
                        {report.snapshot_data ? ` · ${boundaryText(report.snapshot_data)}` : ''}
                      </p>
                    </div>
                    <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-pv-positive-bg px-2 text-[12px] font-medium leading-4 text-pv-positive">
                      Current
                    </span>
                    <Link to={`/public/reports/${report.slug}`} className={OUTLINE_BTN}>View report</Link>
                    <button type="button" className={PRIMARY_BTN} onClick={() => setDownload({ report, format: 'pdf' })}>
                      Download PDF
                      <img src={iconDownloadWhite} alt="" className="h-[18px] w-[18px]" />
                    </button>
                    <button type="button" className={OUTLINE_BTN} onClick={() => setDownload({ report, format: 'csv' })}>
                      Download CSV
                    </button>
                  </div>
                ))
              )}
            </LoadState>
          </section>

          <section id="methodology" className={`scroll-mt-6 flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
            <div className="flex flex-col">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">Methodology</h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">
                An offline model with no live connection to the plant. Each result is calculated from frozen inputs, so it
                can be reproduced. Each report lists the exact values it used.
              </p>
            </div>
            <div className="hidden grid-cols-[200px_1fr_1fr] gap-6 border-b border-pv-line-soft pb-4 pt-2 lg:grid">
              {['Indicator', 'In plain words', 'Formula'].map((column) => (
                <p key={column} className="text-[12px] font-semibold leading-4 text-pv-ink-light">{column}</p>
              ))}
            </div>
            {METHODOLOGY.map((row) => (
              <div key={row.indicator} className="grid grid-cols-1 gap-2 border-b border-pv-line-soft py-4 last:border-b-0 lg:grid-cols-[200px_1fr_1fr] lg:gap-6">
                <p className="text-[14px] font-semibold leading-5 text-pv-ink">{row.indicator}</p>
                <p className="text-[14px] leading-5 text-pv-ink">{row.plain}</p>
                <div className="flex min-h-10 items-center rounded-lg bg-pv-page px-3 font-mono text-[12px] leading-4 text-pv-ink">{row.formula}</div>
              </div>
            ))}
            <p className="text-[12px] leading-4 text-pv-ink-light">
              Model versions: equipment-duty-v1 · electricity-factor-v1 · period-opex-v1 · evidence-gate-v1
            </p>
          </section>

          <section id="glossary" className={`scroll-mt-6 flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
            <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">Glossary</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
              {GLOSSARY.map((item) => (
                <div key={item.term} className="flex flex-col gap-1 rounded-xl bg-pv-page p-4">
                  <dt className="text-[14px] font-semibold leading-5 text-pv-ink">{item.term}</dt>
                  <dd className="text-[14px] leading-5 text-pv-ink-light">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>

      <PublicFooter />

      {download ? (
        <DownloadConfirmDialog
          path={publicDownloadPath(download.report.slug, download.format)}
          fileName={`${download.report.slug}.${download.format}`}
          onClose={() => setDownload(null)}
        />
      ) : null}
    </div>
  );
}
