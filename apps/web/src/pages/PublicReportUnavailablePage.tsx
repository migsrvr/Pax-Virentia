import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import { publishedOn } from '../components/public/publicPortal';
import type { WithdrawnTombstone } from '../services/publications';
import iconArchive from '../assets/pv/icon-archive.svg';

/**
 * P09 · Report unavailable (Figma 47:2). Shown for a withdrawn publication
 * (from the API's 410 tombstone) or for a report that was never published.
 * A withdrawn report's figures are never shown.
 */

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';

export default function PublicReportUnavailablePage({ tombstone }: { tombstone?: WithdrawnTombstone }) {
  const withdrawn = !!tombstone;
  const items = withdrawn
    ? [
        'A utility reviewer removed the snapshot from public view.',
        'Its figures shouldn’t be quoted or compared with current results.',
        'Current reports are listed on the reports page.',
      ]
    : [
        'The link may be mistyped, or the report may still be awaiting review.',
        'Only reports approved by a utility reviewer appear on this portal.',
      ];

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
                {withdrawn ? 'This report is no longer available' : 'This report isn’t available'}
              </h1>
              <span className="inline-flex h-6 items-center rounded-full bg-pv-muted-bg px-2 text-[12px] font-medium leading-4 text-pv-ink-light">
                {withdrawn ? 'Withdrawn' : 'Not published'}
              </span>
            </div>
            <p className="w-full text-[14px] leading-5 text-pv-ink-light">
              {withdrawn
                ? `“${tombstone.title}” was withdrawn on ${publishedOn(tombstone.withdrawn_at)}. Withdrawn reports aren’t published, so nothing from it is shown here.`
                : 'There is no published report at this address.'}
            </p>
            {withdrawn && tombstone.withdrawal_reason ? (
              <p className="w-full text-[14px] leading-5 text-pv-ink">Reason: {tombstone.withdrawal_reason}</p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-pv-page p-4">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">
              {withdrawn ? 'What withdrawal means' : 'Why this happens'}
            </p>
            <ul className="flex w-full list-disc flex-col gap-1 pl-5 text-[14px] leading-5 text-pv-ink-light">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="flex w-full flex-wrap items-start gap-4">
            <Link to="/public/reports" className={PRIMARY_BTN}>See current reports</Link>
            <Link to="/public/overview" className={OUTLINE_BTN}>Go to the dashboard</Link>
          </div>

          {withdrawn ? (
            <p className="text-[12px] leading-4 text-pv-ink-light">
              Reference: {tombstone.slug} · withdrawn {publishedOn(tombstone.withdrawn_at)}
            </p>
          ) : null}
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
