import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import DownloadConfirmDialog from '../components/public/DownloadConfirmDialog';
import { PUBLIC_REPORTS } from '../services/mockData';
import iconDownloadWhite from '../assets/pv/icon-download-white.svg';

/**
 * P06 · Reports and methodology (Figma 48:2) — public portal.
 * Published report rows with file badges, a model methodology table with
 * formula boxes, an assumption table with provenance chips, and a glossary.
 * Copy verbatim from the frame.
 */

const FILE_TONES = {
  critical: 'bg-pv-critical-bg text-pv-critical',
  positive: 'bg-pv-positive-bg text-pv-positive',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
} as const;

const STATUS_TONES = {
  positive: 'bg-pv-positive-bg text-pv-positive',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
} as const;

const CHIP_TONES = {
  highlight: 'bg-pv-highlight text-pv-brand',
  muted: 'bg-pv-muted-bg text-pv-ink-light',
  warning: 'bg-pv-warning-bg text-pv-warning',
} as const;

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';
const GHOST_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent px-4 text-[14px] font-semibold leading-5 text-pv-action transition-opacity hover:opacity-90';

const CARD_CLASS =
  'rounded-xl border border-pv-line bg-white drop-shadow-[0px_1px_1px_rgba(21,63,53,0.05)]';

const TABLE_GRID = 'grid grid-cols-[223.84px_659.44px_314.72px]';

export default function PublicReportsPage() {
  const [downloadFile, setDownloadFile] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Reports & methodology" />

      <main>
        {/* Intro band: full-width with 32px padding per the frame */}
        <section className="border-b border-pv-line bg-white">
          <div className="flex w-full flex-col items-start gap-4 p-8">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              {PUBLIC_REPORTS.heading}
            </h1>
            <p className="max-w-[760px] text-[14px] leading-5 text-pv-ink-light">{PUBLIC_REPORTS.intro}</p>
            <nav aria-label="On this page" className="flex flex-wrap gap-2">
              {PUBLIC_REPORTS.sections.map((section) => (
                <a
                  key={section.anchor}
                  href={`#${section.anchor}`}
                  className="inline-flex h-11 items-center rounded-full border border-pv-line-strong bg-white px-4 text-[14px] font-medium leading-5 text-pv-ink transition-colors hover:bg-pv-page"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-6 pb-12 pt-8 lg:px-8">
          {/* Published reports */}
          <section id="published-reports" className={`scroll-mt-6 flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
            <div className="flex flex-col">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                {PUBLIC_REPORTS.reports.heading}
              </h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_REPORTS.reports.sub}</p>
            </div>
            {PUBLIC_REPORTS.reports.rows.map((row) => (
              <div key={row.title} className="flex flex-wrap items-center gap-4 border-b border-pv-line-soft py-4 last:border-b-0">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold leading-5 ${FILE_TONES[row.fileTone]}`}
                >
                  {row.fileType}
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <p
                    className={`text-[14px] font-semibold leading-5 ${'muted' in row && row.muted ? 'text-pv-ink-light' : 'text-pv-ink'}`}
                  >
                    {row.title}
                  </p>
                  <p className="text-[12px] leading-4 text-pv-ink-light">{row.meta}</p>
                </div>
                <span
                  className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[12px] font-medium leading-4 ${STATUS_TONES[row.statusTone]}`}
                >
                  {row.status}
                </span>
                {row.actions.map((action) => {
                  const buttonClass =
                    action.kind === 'primary' ? PRIMARY_BTN : action.kind === 'ghost' ? GHOST_BTN : OUTLINE_BTN;
                  const content = (
                    <>
                      {action.label}
                      {'icon' in action && action.icon ? (
                        <img src={iconDownloadWhite} alt="" className="h-[18px] w-[18px]" />
                      ) : null}
                    </>
                  );
                  return 'to' in action ? (
                    <Link key={action.label} to={action.to} className={buttonClass}>
                      {content}
                    </Link>
                  ) : 'file' in action ? (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => setDownloadFile(action.file)}
                      className={buttonClass}
                    >
                      {content}
                    </button>
                  ) : (
                    <a key={action.label} href="#" className={buttonClass}>
                      {content}
                    </a>
                  );
                })}
              </div>
            ))}
          </section>

          {/* Methodology */}
          <section id="methodology" className={`scroll-mt-6 flex flex-col gap-2 p-6 ${CARD_CLASS}`}>
            <div className="flex flex-col">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                {PUBLIC_REPORTS.methodology.heading}
              </h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_REPORTS.methodology.sub}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b border-pv-line-soft pb-4 pt-2 lg:grid-cols-[200px_451px_451px] lg:gap-6">
              {PUBLIC_REPORTS.methodology.columns.map((column) => (
                <p key={column} className="text-[12px] font-semibold leading-4 text-pv-ink-light">
                  {column}
                </p>
              ))}
            </div>
            {PUBLIC_REPORTS.methodology.rows.map((row, index) => (
              <div
                key={row.indicator}
                className={`grid grid-cols-1 gap-4 py-4 lg:grid-cols-[200px_451px_451px] lg:gap-6 ${
                  index < PUBLIC_REPORTS.methodology.rows.length - 1 ? 'border-b border-pv-line-soft' : ''
                }`}
              >
                <p className="text-[14px] font-semibold leading-5 text-pv-ink">{row.indicator}</p>
                <p className="text-[14px] leading-5 text-pv-ink">{row.plain}</p>
                <div className="flex h-10 items-center rounded-lg bg-pv-page px-3 font-['Consolas'] text-[12px] leading-4 text-pv-ink">
                  {row.formula}
                </div>
              </div>
            ))}
            <p className="text-[12px] leading-4 text-pv-ink-light">{PUBLIC_REPORTS.methodology.footnote}</p>
          </section>

          {/* Assumptions */}
          <section
            id="assumptions"
            className="scroll-mt-6 overflow-hidden rounded-xl border border-pv-line bg-white shadow-[0px_1px_2px_0px_rgba(21,63,53,0.05)]"
          >
            <div className="flex flex-col px-6 pb-4 pt-6">
              <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                {PUBLIC_REPORTS.assumptions.heading}
              </h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">{PUBLIC_REPORTS.assumptions.sub}</p>
            </div>
            <div className="overflow-x-auto">
              <div className={`${TABLE_GRID} w-full min-w-[1198px]`}>
                {PUBLIC_REPORTS.assumptions.columns.map((column) => (
                  <div
                    key={column}
                    className="flex h-[40.5px] items-center border-b border-pv-line bg-pv-page px-4 text-[12px] font-medium leading-4 text-pv-ink-light"
                  >
                    {column}
                  </div>
                ))}
                {PUBLIC_REPORTS.assumptions.rows.map((row, index) => {
                  const divider =
                    index < PUBLIC_REPORTS.assumptions.rows.length - 1 ? 'border-b border-pv-line-soft' : '';
                  return [
                    <div
                      key={`${row.input}-input`}
                      className={`flex h-[49px] items-start px-4 pt-3 text-[14px] font-medium leading-5 text-pv-ink ${divider}`}
                    >
                      {row.input}
                    </div>,
                    <div
                      key={`${row.input}-value`}
                      className={`flex h-[49px] items-start px-4 pt-3 text-[14px] leading-5 text-pv-ink ${divider}`}
                    >
                      {row.value}
                    </div>,
                    <div key={`${row.input}-type`} className={`flex h-[49px] items-start gap-1 px-4 pt-3 ${divider}`}>
                      {row.chips.map((chip) => (
                        <span
                          key={chip.label}
                          className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[12px] font-medium leading-4 ${CHIP_TONES[chip.tone]}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>,
                  ];
                })}
              </div>
            </div>
          </section>

          {/* Glossary */}
          <section id="glossary" className={`scroll-mt-6 flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
            <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
              {PUBLIC_REPORTS.glossary.heading}
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
              {PUBLIC_REPORTS.glossary.items.map((item) => (
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

      {downloadFile ? <DownloadConfirmDialog file={downloadFile} onClose={() => setDownloadFile(null)} /> : null}
    </div>
  );
}
