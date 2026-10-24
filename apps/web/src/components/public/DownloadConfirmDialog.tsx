import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadFile } from '../../services/api';
import { errorMessage } from '../../services/simulation';
import iconDownloadConfirm from '../../assets/pv/icon-download-confirm.svg';

/**
 * P08 · Download confirmation (Figma 45:2). Starts the real download of a
 * published report file and reports whether it succeeded; "download it again"
 * repeats the request.
 */

const OUTLINE_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-pv-line-strong bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-opacity hover:opacity-90';
const PRIMARY_BTN =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-pv-action px-4 text-[14px] font-semibold leading-5 text-white transition-opacity hover:opacity-90';

type DownloadConfirmDialogProps = {
  /** API path of the file, e.g. /public/reports/{slug}/download?format=pdf */
  path: string;
  fileName: string;
  onClose: () => void;
};

type State = { phase: 'downloading' } | { phase: 'started' } | { phase: 'failed'; message: string };

export default function DownloadConfirmDialog({ path, fileName, onClose }: DownloadConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ phase: 'downloading' });

  const start = useCallback(() => {
    setState({ phase: 'downloading' });
    downloadFile(path, fileName)
      .then(() => setState({ phase: 'started' }))
      .catch((error: unknown) => setState({ phase: 'failed', message: errorMessage(error) }));
  }, [path, fileName]);

  // Start exactly once per dialog (StrictMode runs mount effects twice in development).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

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

  const title = state.phase === 'downloading' ? 'Preparing your download…'
    : state.phase === 'started' ? 'Your download has started' : 'The download didn’t start';

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
              <h2 id="download-dialog-title" className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
                {title}
              </h2>
              <p className="break-all text-[14px] leading-5 text-pv-ink-light">{fileName}</p>
            </div>
          </div>

          <p role="status" className="w-full text-[14px] leading-5 text-pv-ink">
            {state.phase === 'failed'
              ? state.message
              : 'Every page is labeled as simulated estimates, and the report ends with the methodology and limitations.'}
          </p>

          {state.phase !== 'downloading' ? (
            <p className="text-[12px] leading-4 text-pv-ink-light">
              {state.phase === 'failed' ? 'You can ' : 'If nothing happens, '}
              <button type="button" onClick={start} className="text-[12px] font-semibold leading-4 text-pv-action hover:underline">
                download it again
              </button>
              .
            </p>
          ) : null}

          <div className="flex w-full flex-wrap items-start justify-end gap-4">
            <button type="button" onClick={onClose} className={OUTLINE_BTN}>Back to report</button>
            <Link to="/public/reports" className={PRIMARY_BTN}>Browse all reports</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
