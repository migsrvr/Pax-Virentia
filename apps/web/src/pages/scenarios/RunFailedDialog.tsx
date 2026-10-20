import { CircleX, RefreshCw } from 'lucide-react';
import { RunDialog, btnPrimary, btnSecondary } from './shared';
import { useRunDialogFocus, useRunState } from '../../services/runLifecycle';

export default function RunFailedDialog({ onClose, onEditInputs, onRetry }: {
  onClose: () => void; onEditInputs: () => void; onRetry: () => void;
}) {
  const run = useRunState();
  const focusRef = useRunDialogFocus();
  return <RunDialog labelledBy="run-failed-title" widthClass="w-[560px]" onClose={onClose}>
    <div ref={focusRef} className="flex flex-col gap-6">
      <div className="flex items-center gap-3"><CircleX className="text-pv-err-ink" aria-hidden /><h2 id="run-failed-title" className="text-2xl font-semibold">{run?.phase === 'cancelled' ? 'Run cancelled' : 'The run did not finish'}</h2></div>
      <p className="break-words text-sm text-pv-muted">{run?.scenario} · revision {run?.revision} · attempt {run?.attempt}{run?.id ? ` · run ${run.id}` : ''}</p>
      <p role="alert" className="rounded-xl bg-pv-err-bg p-4 text-pv-err-ink">{run?.error ?? (run?.phase === 'cancelled' ? 'The server confirmed cancellation.' : 'Submission or calculation failed. Your frozen inputs remain available for retry.')}</p>
      <p className="text-sm text-pv-muted">Retry uses the same revision. Editing inputs creates a new revision when saved.</p>
      <div className="flex flex-wrap justify-end gap-4">
        <button type="button" onClick={onEditInputs} className={btnSecondary}>Edit inputs</button>
        <button type="button" onClick={onRetry} className={btnPrimary}><RefreshCw size={18} aria-hidden />Retry run</button>
      </div>
    </div>
  </RunDialog>;
}
