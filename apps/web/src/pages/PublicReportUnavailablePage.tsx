import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { PUBLIC_REPORT_UNAVAILABLE } from '../services/mockData';
import iconArchive from '../assets/pv/icon-archive.svg';

/**
 * P09 · Report unavailable (Figma 47:2) — public portal.
 * Standalone status page reached from the withdrawn PS-003 row on the reports
 * page. Copy verbatim from the frame.
 */

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';

export default function PublicReportUnavailablePage() {
  const page = PUBLIC_REPORT_UNAVAILABLE;

  return (
    <div className="flex min-h-screen flex-col bg-pv-page font-inter text-pv-ink">
      <PublicHeader active="Reports & methodology" />

      <main className="mx-auto flex w-full max-w-[1264px] flex-1 flex-col items-center px-6 py-12 lg:px-8">
        <article className="flex w-full max-w-[720px] flex-col items-start gap-6 rounded-xl border border-pv-line bg-white p-6 shadow-pv sm:p-12">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-pv-muted-bg">
            <img src={iconArchive} alt="" className="size-7" />
          </div>

          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
                {page.title}
              </h1>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
                {page.badge}
              </span>
            </div>
            <p className="w-full text-[14px] leading-5 text-pv-ink-light">{page.body}</p>
          </div>

          <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-pv-page p-4">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">{page.callout.heading}</p>
            <ul className="flex w-full flex-col gap-1 pl-5">
              {page.callout.items.map((item) => (
                <li key={item} className="relative text-[14px] leading-5 text-pv-ink-light">
                  <span aria-hidden="true" className="absolute -left-5 top-0 w-3.5 text-right">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-full flex-wrap items-start gap-4">
            <Link to={page.primary.to} className={PRIMARY_BTN}>
              {page.primary.label}
            </Link>
            <Link to={page.secondary.to} className={OUTLINE_BTN}>
              {page.secondary.label}
            </Link>
          </div>

          <p className="text-[12px] leading-4 text-pv-ink-light">{page.reference}</p>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
