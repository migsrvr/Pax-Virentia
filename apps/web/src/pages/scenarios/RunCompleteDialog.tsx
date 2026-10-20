import clsx from 'clsx';
import { ArrowRight, CircleCheck, TriangleAlert } from 'lucide-react';
import { Chip, RunDialog, btnPrimary, btnSecondary } from './shared';
import type { ChipTone } from './shared';

/* U08 · Run — complete (frame 32:2). Sample values as shown in the design. */

type ResultRow = {
  label: string;
  value: string;
  chip: { label: string; tone: ChipTone };
};

const RESULT_ROWS: ResultRow[] = [
  {
    label: 'Energy consumption',
    value: '23,049 kWh',
    chip: { label: '6.5% lower · −1,596 kWh', tone: 'ok' },
  },
  {
    label: 'CO₂e emissions',
    value: '16,415 kg',
    chip: { label: '6.5% lower · −1,137 kg', tone: 'ok' },
  },
  {
    label: 'Operating cost',
    value: '₱329,163',
    chip: { label: '3.8% lower · −₱13,096', tone: 'ok' },
  },
  {
    label: 'Downstream ecosystem stress',
    value: 'Not estimable',
    chip: { label: 'Evidence gate not met', tone: 'neutral' },
  },
];

export default function RunCompleteDialog({
  onClose,
  onBackToDashboard,
  onViewResults,
}: {
  onClose: () => void;
  onBackToDashboard: () => void;
  onViewResults: () => void;
}) {
  return (
    <RunDialog labelledBy="run-complete-title" widthClass="w-[600px]" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-ok-bg"
            aria-hidden="true"
          >
            <CircleCheck size={24} className="text-pv-ev-green" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="run-complete-title"
                className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink"
              >
                Simulation complete
              </h2>
              <Chip tone="info">Simulated estimate</Chip>
            </div>
            <p className="text-[14px] leading-5 text-pv-muted">
              Pax Silica pilot · revision 1 · run R-0142 · finished 13 Oct 2026, 10:13 · took 38 s
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          <p className="pb-1 text-[12px] font-medium leading-4 text-pv-muted">
            Compared with Baseline operation (run R-0139), same volume and period
          </p>
          {RESULT_ROWS.map((row, index) => (
            <div
              key={row.label}
              className={clsx(
                'grid grid-cols-1 items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]',
                index < RESULT_ROWS.length - 1 && 'border-b border-pv-hairline',
              )}
            >
              <span className="text-[14px] font-medium leading-5 text-pv-ink">{row.label}</span>
              <span className="text-[14px] font-semibold leading-5 text-pv-ink">{row.value}</span>
              <Chip tone={row.chip.tone}>{row.chip.label}</Chip>
            </div>
          ))}
        </div>

        <div className="flex gap-3 rounded-xl bg-pv-warn-bg px-4 py-3">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-pv-amber" aria-hidden="true" />
          <p className="text-[14px] leading-5 text-pv-ink">
            Uses the unverified Pax Silica specification v0.4. Read these as simulated estimates,
            not expected plant performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button type="button" onClick={onBackToDashboard} className={btnSecondary}>
            Back to dashboard
          </button>
          <button type="button" onClick={onViewResults} className={btnPrimary}>
            View results
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </RunDialog>
  );
}
