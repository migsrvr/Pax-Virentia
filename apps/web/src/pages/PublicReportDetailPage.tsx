import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import DownloadConfirmDialog from '../components/public/DownloadConfirmDialog';
import { PUBLIC_REPORT_DETAIL } from '../services/mockData';
import logoPaxVirentiaTitlecase from '../assets/pv/logo-pax-virentia-titlecase.png';
import iconDownloadWhite from '../assets/pv/icon-download-white.svg';

/**
 * P07 · Report detail (Figma 49:2) — public portal.
 * Breadcrumb + title band, a two-page document preview on a grey canvas, and
 * an in-report contents / limitations / citation sidebar. Copy verbatim from
 * the frame.
 */

const CHIP_TONES = {
  info: 'bg-pv-info-bg text-pv-info',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
  highlight: 'bg-pv-highlight text-pv-brand',
} as const;

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';

/** White "paper" card inside the grey preview canvas (radius-sm, layered shadow). */
const PAPER_CLASS =
  'flex w-full max-w-[640px] flex-col items-start gap-5 rounded bg-white p-12 shadow-[0px_1px_1px_rgba(21,63,53,0.08),0px_12px_16px_rgba(21,63,53,0.1)]';

const SIDEBAR_CARD =
  'flex flex-col rounded-xl border border-pv-line bg-white p-6 drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]';

/** Exact column widths from the frame (both tables span the 544px card content). */
const TABLE_GRID_ONE = 'grid grid-cols-[125.06px_148.56px_135.80px_134.58px]';
const TABLE_GRID_TWO = 'grid grid-cols-[155.06px_190.28px_198.66px]';
const HEAD_CELL =
  'flex h-[32.5px] items-center border-b border-pv-ink px-2 text-[12px] font-semibold leading-4 text-pv-ink';
const DATA_CELL = 'flex h-[33px] items-center border-b border-pv-line px-2 text-[12px] leading-4 text-pv-ink';
const PAGE_FOOTER =
  'flex w-full items-center justify-between border-t border-pv-line pt-3 text-[12px] leading-4 text-pv-ink-light';

export default function PublicReportDetailPage() {
  const report = PUBLIC_REPORT_DETAIL;
  const { one, two } = report.preview;
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Reports & methodology" />

      <main>
        {/* Breadcrumb + title band: full-width with 32px padding per the frame */}
        <section className="border-b border-pv-line bg-white">
          <div className="flex w-full flex-col items-start gap-3 px-8 pb-8 pt-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] leading-4">
              <Link to="/public/reports" className="text-pv-action hover:underline">
                {report.breadcrumb.parent}
              </Link>
              <span aria-hidden="true" className="text-pv-ink-light">
                /
              </span>
              <span className="text-pv-ink-light">{report.breadcrumb.current}</span>
            </nav>
            <div className="flex w-full flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col items-start gap-2">
                <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
                  {report.title}
                </h1>
                <p className="text-[14px] leading-5 text-pv-ink-light">{report.meta}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {report.chips.map((chip) => (
                    <span
                      key={chip.label}
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-medium leading-4 ${CHIP_TONES[chip.tone]}`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-4">
                <a href="#" className={OUTLINE_BTN}>
                  Download data (CSV)
                </a>
                <button type="button" onClick={() => setDownloadOpen(true)} className={PRIMARY_BTN}>
                  <img src={iconDownloadWhite} alt="" className="h-[18px] w-[18px]" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1264px] px-6 pb-12 pt-8 lg:px-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[784px_392px]">
            {/* Report preview canvas */}
            <div className="flex flex-col items-center gap-8 self-start rounded-xl bg-pv-line p-8">
              {/* Article — page 1 */}
              <article id="report-page-1" className={`scroll-mt-6 ${PAPER_CLASS}`}>
                <div className="flex w-full items-start justify-between">
                  <img src={logoPaxVirentiaTitlecase} alt="" className="h-14 w-[118.81px] object-contain" />
                  <p className="text-right text-[12px] leading-4 text-pv-ink-light">
                    {one.stamp[0]}
                    <br />
                    {one.stamp[1]}
                  </p>
                </div>
                <p className="w-full rounded-[6px] bg-pv-info-bg px-3 py-2 text-[12px] font-medium leading-4 text-pv-info">
                  {one.banner}
                </p>
                <div className="flex w-full flex-col items-start gap-1">
                  <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                    {one.heading}
                  </h2>
                  <p className="text-[14px] leading-5 text-pv-ink-light">{one.sub}</p>
                </div>
                <div className="flex w-full flex-col items-start gap-2">
                  <p className="text-[14px] font-semibold leading-5 text-pv-ink">{one.sectionHeading}</p>
                  <div className="w-full overflow-x-auto">
                    <div className={TABLE_GRID_ONE}>
                      {one.columns.map((column) => (
                        <div key={column} className={HEAD_CELL}>
                          {column}
                        </div>
                      ))}
                      {one.rows.map((row, rowIndex) =>
                        row.map((cell, cellIndex) => (
                          <div key={`${rowIndex}-${cellIndex}`} className={DATA_CELL}>
                            {cell.text}
                            {'delta' in cell ? (
                              <>
                                {' '}
                                <span className="text-pv-positive">{cell.delta}</span>
                              </>
                            ) : null}
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] leading-4 text-pv-ink-light">{one.note}</p>
                </div>
                <div className={PAGE_FOOTER}>
                  <p>{report.preview.footer}</p>
                  <p>{one.page}</p>
                </div>
              </article>

              {/* Article — page 2 */}
              <article id="report-page-2" className={`scroll-mt-6 ${PAPER_CLASS}`}>
                <p className="text-[14px] font-semibold leading-5 text-pv-ink">{two.heading}</p>
                <div className="w-full overflow-x-auto">
                  <div className={TABLE_GRID_TWO}>
                    {two.columns.map((column) => (
                      <div key={column} className={HEAD_CELL}>
                        {column}
                      </div>
                    ))}
                    {two.rows.map((row) =>
                      row.map((cell, cellIndex) => (
                        <div key={`${row[0]}-${cellIndex}`} className={DATA_CELL}>
                          {cell}
                        </div>
                      )),
                    )}
                  </div>
                </div>
                <p className="text-[12px] leading-4 text-pv-ink-light">{two.note}</p>
                <div className={PAGE_FOOTER}>
                  <p>{report.preview.footer}</p>
                  <p>{two.page}</p>
                </div>
              </article>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6 self-start">
              {/* In this report */}
              <section className={`${SIDEBAR_CARD} gap-1`}>
                <h2 className="pb-2 text-[18px] font-semibold leading-[26px] text-pv-ink">{report.toc.heading}</h2>
                {report.toc.rows.map((row) => (
                  <a
                    key={row.label}
                    href={row.anchor ? `#${row.anchor}` : '#'}
                    className="flex items-center justify-between gap-4 border-b border-pv-line-soft py-3 text-[14px] leading-5 text-pv-ink transition-colors last:border-b-0 hover:text-pv-action"
                  >
                    <span>{row.label}</span>
                    <span className="text-pv-ink-light">{row.page}</span>
                  </a>
                ))}
              </section>

              {/* Limitations */}
              <section className={`${SIDEBAR_CARD} gap-3`}>
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  {report.limitations.heading}
                </h2>
                <ul className="flex w-full flex-col gap-2 pl-5">
                  {report.limitations.items.map((item) => (
                    <li key={item} className="relative w-full text-[14px] leading-5 text-pv-ink-light">
                      <span
                        aria-hidden="true"
                        className="absolute -left-5 top-0 flex h-5 w-3.5 items-center justify-end"
                      >
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/public/reports#methodology"
                  className="inline-flex min-h-[44px] items-center text-[14px] font-semibold leading-5 text-pv-action hover:underline"
                >
                  {report.limitations.link}
                </Link>
              </section>

              {/* Cite this report */}
              <section className={`${SIDEBAR_CARD} gap-3`}>
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">{report.cite.heading}</h2>
                <p className="w-full rounded-lg bg-pv-page p-3 text-[12px] leading-4 text-pv-ink">{report.cite.text}</p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />

      {downloadOpen ? (
        <DownloadConfirmDialog file={report.download.file} onClose={() => setDownloadOpen(false)} />
      ) : null}
    </div>
  );
}
