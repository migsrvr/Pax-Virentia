import clsx from 'clsx';
import { Circle, CircleCheck, LoaderCircle } from 'lucide-react';
import { Chip, RunDialog, btnDanger, btnSecondary } from './shared';
import { backgroundRun, cancelRun, useRunState } from '../../services/runLifecycle';

/* U07 · Run — in progress (frame 27:2). Progress and step states follow the
   run lifecycle store; the dialog closes itself when the run finishes. */

const RUN_STEPS = [
  'Queued and inputs frozen',
  'Validating inputs and ranges',
  'Energy model · pumps and mixers',
  'Carbon accounting · grid factor',
  'Operating cost',
  'Ecological evidence check',
  'Saving results',
];

type StepStatus = 'done' | 'active' | 'waiting';

export default function RunProgressDialog() {
  const run = useRunState();
  if (!run) return null;

  const progress = run.progress;
  const span = 100 / RUN_STEPS.length;
  const currentStep = Math.min(RUN_STEPS.length, Math.floor(progress / span) + 1);

  const statusFor = (index: number): StepStatus => {
    if (progress >= (index + 1) * span) return 'done';
    if (progress > index * span) return 'active';
    return 'waiting';
  };

  return (
    <RunDialog labelledBy="run-dialog-title" widthClass="w-[560px]" onClose={backgroundRun}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-mint"
            aria-hidden="true"
          >
            <LoaderCircle size={24} className="animate-spin text-pv-teal" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="run-dialog-title"
                className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink"
              >
                Running simulation
              </h2>
              <Chip tone="info">Simulated estimate</Chip>
            </div>
            <p className="text-[14px] leading-5 text-pv-muted">
              Pax Silica pilot · revision 1 · run R-0142 · started 13 Oct 2026, 10:12
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">
              {`Step ${currentStep} of ${RUN_STEPS.length} · ${RUN_STEPS[currentStep - 1]}`}
            </p>
            <p className="text-[14px] leading-5 text-pv-muted">{`${Math.round(progress)}%`}</p>
          </div>
          <div
            role="progressbar"
            aria-label="Simulation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-2 rounded-full bg-pv-chip"
          >
            <div
              className="h-full rounded-full bg-pv-teal transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {RUN_STEPS.map((label, index) => {
            const status = statusFor(index);
            return (
              <li
                key={label}
                className={clsx(
                  'flex items-center gap-3',
                  status === 'active' && '-mx-2 rounded-lg bg-pv-run-bg px-2 py-1.5',
                )}
              >
                {status === 'done' ? (
                  <CircleCheck size={20} className="shrink-0 text-pv-ev-green" aria-hidden="true" />
                ) : status === 'active' ? (
                  <LoaderCircle size={20} className="shrink-0 animate-spin text-pv-teal" aria-hidden="true" />
                ) : (
                  <Circle size={20} className="shrink-0 text-pv-input-border" aria-hidden="true" />
                )}
                <span
                  className={clsx(
                    'min-w-0 flex-1 text-[14px] leading-5',
                    status === 'done' && 'text-pv-ink',
                    status === 'active' && 'font-semibold text-pv-run-ink',
                    status === 'waiting' && 'text-pv-muted',
                  )}
                >
                  {label}
                </span>
                <span
                  className={clsx(
                    'text-[12px] leading-4',
                    status === 'active' ? 'font-medium text-pv-run-ink' : 'text-pv-muted',
                  )}
                >
                  {status === 'done' ? 'Done' : status === 'active' ? 'In progress' : 'Waiting'}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-[14px] leading-5 text-pv-muted">
          You can leave this page. The run keeps going and shows up in Recent simulations when
          it&apos;s done.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={cancelRun} className={btnDanger}>
            Cancel run
          </button>
          <button type="button" onClick={backgroundRun} className={btnSecondary}>
            Run in background
          </button>
        </div>
      </div>
    </RunDialog>
  );
}
