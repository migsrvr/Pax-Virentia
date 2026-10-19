import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_DOWNLOAD_DIALOG } from '../../services/mockData';
import iconDownloadConfirm from '../../assets/pv/icon-download-confirm.svg';

/**
 * P08 · Download confirmation (Figma 45:2) — modal shown once a report download
 * has started, on the report detail page and the published report rows. Copy
 * verbatim from the frame.
 */

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';

type DownloadConfirmDialogProps = {
  /** File line under the title, e.g. "…Jan 2026.pdf · 6 pages · 1.2 MB". */
  file: string;
  onClose: () => void;
};

export default function DownloadConfirmDialog({ file, onClose }: DownloadConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialogRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const copy = PUBLIC_DOWNLOAD_DIALOG;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-pv-overlay-scrim" onClick={onClose}>
      <div className="mx-auto w-full max-w-[552px] px-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-dialog-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className="mb-8 mt-[140px] flex flex-col items-start gap-6 rounded-2xl bg-white p-8 drop-shadow-[0px_24px_24px_rgba(15,36,30,0.18)] focus:outline-none"
        >
          <div className="flex w-full items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pv-positive-bg">
              <img src={iconDownloadConfirm} alt="" className="size-6" />
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1">
              <h2
                id="download-dialog-title"
                className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink"
              >
                {copy.title}
              </h2>
              <p className="text-[14px] leading-5 text-pv-ink-light">{file}</p>
            </div>
          </div>

          <p className="w-full text-[14px] leading-5 text-pv-ink">{copy.body}</p>

          <p className="text-[12px] leading-4 text-pv-ink-light">
            {copy.retryLead}
            <button
              type="button"
              onClick={() => {
                // Prototype: the download is simulated, so there is nothing to re-run.
              }}
              className="text-[12px] font-semibold leading-4 text-pv-action hover:underline"
            >
              {copy.retryLink}
            </button>
            {copy.retryTail}
          </p>

          <div className="flex w-full flex-wrap items-start justify-end gap-4">
            <button type="button" onClick={onClose} className={OUTLINE_BTN}>
              {copy.back}
            </button>
            <Link to="/public/reports" className={PRIMARY_BTN}>
              {copy.browse}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
