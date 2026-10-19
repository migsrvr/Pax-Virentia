import clsx from 'clsx';
import { CircleX, Copy, RefreshCw } from 'lucide-react';
import { Chip, RunDialog, btnGhost, btnPrimary, btnSecondary } from './shared';

/* U09 · Run — failed, retry (frame 26:2). Sample values as shown in the design. */

const ERROR_DETAILS = [
  { term: 'Last completed step', value: 'Energy model (3 of 7)' },
  { term: 'Error code', value: 'RUN_WORKER_TIMEOUT' },
  { term: 'Request ID', value: '7f3a-21c9-4b8e' },
];

const ERROR_SUMMARY = [
  'Run: Pax Silica pilot · revision 1 · run R-0142 · attempt 1',
  'Stopped: 13 Oct 2026, 10:12',
  'Last completed step: Energy model (3 of 7)',
  'Error code: RUN_WORKER_TIMEOUT',
  'Request ID: 7f3a-21c9-4b8e',
].join('\n');

export default function RunFailedDialog({
  onClose,
  onEditInputs,
  onRetry,
}: {
  onClose: () => void;
  onEditInputs: () => void;
  onRetry: () => void;
}) {
  const copyDetails = () => {
    void navigator.clipboard?.writeText(ERROR_SUMMARY);
  };

  return (
    <RunDialog labelledBy="run-failed-title" widthClass="w-[560px]" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-err-bg"
            aria-hidden="true"
          >
            <CircleX size={24} className="text-pv-err-field" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="run-failed-title"
                className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink"
              >
                The run didn&apos;t finish
              </h2>
              <Chip tone="err">Failed</Chip>
            </div>
            <p className="text-[14px] leading-5 text-pv-muted">
              Pax Silica pilot · revision 1 · run R-0142 · attempt 1 · stopped 13 Oct 2026, 10:12
            </p>
          </div>
        </div>

        <p className="text-[14px] leading-5 text-pv-ink">
          The calculation worker stopped before saving results. Nothing was saved, and your inputs
          are unchanged.
        </p>

        <dl className="flex flex-col gap-2 rounded-xl bg-pv-bg p-4">
          {ERROR_DETAILS.map((row) => (
            <div
              key={row.term}
              className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[180px_minmax(0,1fr)]"
            >
              <dt className="text-[14px] leading-5 text-pv-muted">{row.term}</dt>
              <dd className="text-[14px] font-medium leading-5 text-pv-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-[14px] leading-5 text-pv-muted">
          Retrying starts attempt 2 with the same frozen inputs. If it fails again, share the
          request ID with your workspace administrator.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={copyDetails} className={clsx(btnGhost, 'gap-2')}>
            <Copy size={18} aria-hidden="true" />
            Copy error details
          </button>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={onEditInputs} className={btnSecondary}>
              Edit inputs
            </button>
            <button type="button" onClick={onRetry} className={btnPrimary}>
              <RefreshCw size={18} aria-hidden="true" />
              Retry run
            </button>
          </div>
        </div>
      </div>
    </RunDialog>
  );
}
