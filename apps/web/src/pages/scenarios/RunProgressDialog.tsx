import { LoaderCircle } from 'lucide-react';
import { RunDialog, btnDanger, btnSecondary } from './shared';
import { backgroundRun, cancelRun, useRunDialogFocus, useRunState } from '../../services/runLifecycle';

export default function RunProgressDialog() {
  const run = useRunState();
  const focusRef = useRunDialogFocus();
  if (!run) return null;
  return <RunDialog labelledBy="run-dialog-title" widthClass="w-[560px]" onClose={backgroundRun}>
    <div ref={focusRef} className="flex flex-col gap-6">
      <div className="flex items-center gap-3"><LoaderCircle className="animate-spin text-pv-teal" aria-hidden /><h2 id="run-dialog-title" className="text-2xl font-semibold">Simulation {run.phase}</h2></div>
      <p className="break-words text-sm text-pv-muted">{run.scenario} · revision {run.revision}{run.id ? ` · run ${run.id}` : ''}</p>
      <p role="status" aria-live="polite">{run.phase === 'submitting' ? 'Submitting the frozen revision…' : run.phase === 'queued' ? 'Inputs are frozen. Waiting for a calculation worker.' : 'The worker is calculating the requested modules.'}</p>
      <div role="progressbar" aria-label="Simulation awaiting worker completion" className="h-2 rounded-full bg-pv-chip"><div className="h-full w-1/3 rounded-full bg-pv-teal" /></div>
      {run.cancelRequested && <p role="status">Cancellation requested. Waiting for the worker to confirm.</p>}
      {run.connectionError && <p role="alert" className="rounded-xl bg-pv-err-bg p-3 text-pv-err-ink">{run.connectionError} The last reported run state is shown; connection will be retried.</p>}
      <p className="text-sm text-pv-muted">You can leave this page. The server continues processing the run.</p>
      <div className="flex flex-wrap justify-between gap-4">
        <button type="button" disabled={!run.id || run.cancelRequested} onClick={() => { void cancelRun(); }} className={btnDanger + ' disabled:opacity-50'}>Cancel run</button>
        <button type="button" onClick={backgroundRun} className={btnSecondary}>Run in background</button>
      </div>
    </div>
  </RunDialog>;
}
