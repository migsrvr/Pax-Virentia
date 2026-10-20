import { CircleCheck, ArrowRight } from 'lucide-react';
import { RunDialog, btnPrimary, btnSecondary } from './shared';
import { useRunDialogFocus, useRunState } from '../../services/runLifecycle';

export default function RunCompleteDialog({ onClose, onBackToDashboard, onViewResults }: {
  onClose: () => void; onBackToDashboard: () => void; onViewResults: () => void;
}) {
  const run = useRunState();
  const focusRef = useRunDialogFocus();
  return <RunDialog labelledBy="run-complete-title" widthClass="w-[600px]" onClose={onClose}>
    <div ref={focusRef} className="flex flex-col gap-6">
      <div className="flex items-center gap-3"><CircleCheck className="text-pv-teal" aria-hidden /><h2 id="run-complete-title" className="text-2xl font-semibold">Simulation complete</h2></div>
      <p className="break-words text-sm text-pv-muted">{run?.scenario} · revision {run?.revision} · run {run?.id}</p>
      <p role="status">The worker saved the numerical results. View results to inspect metrics, frozen assumptions, source versions, and limitations.</p>
      <p className="rounded-xl bg-pv-warn-bg p-4 text-sm">Simulated estimates do not establish plant performance. Ecological evidence limitations remain distinct from zero impact.</p>
      <div className="flex flex-wrap justify-end gap-4">
        <button type="button" onClick={onBackToDashboard} className={btnSecondary}>Back to dashboard</button>
        <button type="button" onClick={onViewResults} className={btnPrimary}>View results<ArrowRight size={18} aria-hidden /></button>
      </div>
    </div>
  </RunDialog>;
}
