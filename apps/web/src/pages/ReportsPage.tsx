import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Download,
  FileCheck,
  Info,
  Printer,
} from 'lucide-react';
import { Chip, RunDialog, btnGhost, btnPrimary, btnSecondary } from './scenarios/shared';
import reportLogo from '../assets/report-logo.png';

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';

const REPORT_TYPES = [
  {
    id: 'technical',
    title: 'Technical report',
    desc: 'Inputs, results, comparison, recommendations and methodology.',
  },
  {
    id: 'public',
    title: 'Public summary',
    desc: 'Plain-language version for the public portal.',
  },
  {
    id: 'export',
    title: 'Data export',
    desc: 'CSV of inputs and results only.',
  },
];

const RUN_OPTIONS = [
  { id: 'baseline', label: 'Baseline operation · R-0139' },
  { id: 'pax', label: 'Pax Silica pilot · R-0142' },
  { id: 'reduced', label: 'Reduced mixing · R-0140' },
];

const SECTION_OPTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'inputs', label: 'Inputs and assumptions' },
  { id: 'results', label: 'Results' },
  { id: 'comparison', label: 'Scenario comparison' },
  { id: 'recommendations', label: 'Recommendations' },
];

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF report' },
  { id: 'csv', label: 'CSV data' },
];

const CONTENTS = [
  'Summary',
  'Inputs and assumptions',
  'Results by run',
  'Scenario comparison',
  'Recommendations',
  'Methodology and limitations',
];

const PREVIEW_TABS = [
  'Summary',
  'Inputs',
  'Results',
  'Comparison',
  'Recommendations',
  'Methodology',
];

const PREVIEW_SUMMARY = [
  { metric: 'Energy', value: '23,049 kWh', delta: '6.5% lower' },
  { metric: 'CO₂e', value: '16,415 kg', delta: '6.5% lower' },
  { metric: 'Operating cost', value: '₱329,163', delta: '3.8% lower' },
];

type GeneratedReport = {
  name: string;
  note?: string;
  runs: string;
  format: string;
  created: string;
  status: 'ok' | 'err';
};

const GENERATED_REPORTS: GeneratedReport[] = [
  {
    name: 'Baseline and reduced mixing — Jan 2026',
    runs: '2',
    format: 'PDF · 0.9 MB',
    created: '12 Oct 2026, 11:30',
    status: 'ok',
  },
  {
    name: 'Scenario data — Jan 2026',
    runs: '2',
    format: 'CSV · 12 KB',
    created: '12 Oct 2026, 11:30',
    status: 'ok',
  },
  {
    name: 'Baseline summary — Dec 2025 data',
    note: "Couldn't generate: its dataset version was withdrawn.",
    runs: '1',
    format: 'PDF',
    created: '9 Oct 2026, 15:02',
    status: 'err',
  },
];

const SNAPSHOT_STEPS = [
  { title: 'Redacted', desc: 'Drafts, internal notes and raw data removed', done: true },
  { title: 'Reviewer approval', desc: 'Waiting for a workspace reviewer', done: false },
  { title: 'Published', desc: 'Appears on the public portal with its limitations', done: false },
];

const EXPORT_FILES = [
  {
    badge: 'PDF',
    badgeClass: 'bg-pv-err-bg text-pv-err-ink',
    name: 'Scenario analysis — Jan 2026.pdf',
    meta: '6 pages · 1.2 MB',
  },
  {
    badge: 'CSV',
    badgeClass: 'bg-pv-ok-bg text-pv-ok-ink',
    name: 'Scenario data — Jan 2026.csv',
    meta: 'Inputs and results for 3 runs · 18 KB',
  },
];

function RadioOption({
  name,
  checked,
  onSelect,
  title,
  desc,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer gap-3 rounded-xl px-4 py-3 transition-colors',
        checked
          ? 'border-2 border-pv-teal bg-pv-run-bg'
          : 'border border-pv-border-soft bg-white hover:border-pv-input-border',
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} />
      <span
        className={clsx(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white',
          checked ? 'border-2 border-pv-teal' : 'border border-pv-radio-border',
        )}
        aria-hidden="true"
      >
        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-pv-teal" /> : null}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold leading-5 text-pv-ink">{title}</span>
        <span className="text-[12px] leading-4 text-pv-muted">{desc}</span>
      </span>
    </label>
  );
}

function CheckboxRow({
  checked,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={clsx('flex items-center gap-3', disabled ? 'cursor-default' : 'cursor-pointer')}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span
        className={clsx(
          'grid h-5 w-5 shrink-0 place-items-center rounded-[2px]',
          checked
            ? disabled
              ? 'border border-pv-disabled-border bg-pv-disabled-border text-white'
              : 'border border-pv-teal bg-pv-teal text-white'
            : 'border border-pv-radio-border bg-white',
        )}
        aria-hidden="true"
      >
        {checked ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      <span className="text-[14px] leading-5 text-pv-ink">{label}</span>
    </label>
  );
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('technical');
  const [runs, setRuns] = useState<Record<string, boolean>>({
    baseline: true,
    pax: true,
    reduced: true,
  });
  const [sections, setSections] = useState<Record<string, boolean>>({
    summary: true,
    inputs: true,
    results: true,
    comparison: true,
    recommendations: true,
  });
  const [formats, setFormats] = useState<Record<string, boolean>>({ pdf: true, csv: true });
  const [exportOpen, setExportOpen] = useState(false);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    id: string,
  ) => setter((current) => ({ ...current, [id]: !current[id] }));

  const closeExport = () => setExportOpen(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page head */}
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Reports</h1>
        <p className="text-[14px] leading-5 text-pv-muted">
          Build a report from frozen runs. Every figure comes straight from stored simulation results,
          with its assumptions and limitations attached.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400fr_712fr]">
        {/* Report builder */}
        <section
          aria-label="Report builder"
          className="flex flex-col gap-6 self-start rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
        >
          <h2 className={H2}>Report builder</h2>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium leading-4 text-pv-ink">Report type</span>
            <div className="flex flex-col gap-2">
              {REPORT_TYPES.map((type) => (
                <RadioOption
                  key={type.id}
                  name="report-type"
                  checked={reportType === type.id}
                  onSelect={() => setReportType(type.id)}
                  title={type.title}
                  desc={type.desc}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium leading-4 text-pv-ink">Runs included</span>
            <div className="flex flex-col gap-2">
              {RUN_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.id}
                  checked={runs[option.id]}
                  onToggle={() => toggle(setRuns, option.id)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium leading-4 text-pv-ink">Sections</span>
            <div className="flex flex-col gap-2">
              {SECTION_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.id}
                  checked={sections[option.id]}
                  onToggle={() => toggle(setSections, option.id)}
                  label={option.label}
                />
              ))}
              <CheckboxRow
                checked
                disabled
                onToggle={() => undefined}
                label={
                  <>
                    Methodology and limitations{' '}
                    <span className="text-pv-muted">· always included</span>
                  </>
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium leading-4 text-pv-ink">Format</span>
            <div className="flex flex-wrap items-center gap-6">
              {FORMAT_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.id}
                  checked={formats[option.id]}
                  onToggle={() => toggle(setFormats, option.id)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-pv-ev-blue" aria-hidden="true" />
            <span className="max-w-[326px] text-[12px] leading-4 text-pv-muted">
              Every page is marked “Simulated estimates · Sample data”.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={btnPrimary} onClick={() => setExportOpen(true)}>
              <Download size={18} aria-hidden="true" />
              Export report
            </button>
            <button type="button" className={btnSecondary}>
              <Printer size={18} aria-hidden="true" />
              Print preview
            </button>
          </div>
        </section>

        {/* Preview */}
        <section aria-label="Preview" className="flex flex-col gap-4 self-start">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className={H2}>Preview</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                className="grid h-11 w-11 place-items-center rounded-lg border border-pv-border-soft bg-white text-pv-ink transition-colors hover:bg-pv-bg"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="text-[14px] leading-5 text-pv-muted">Page 1 of 6</span>
              <button
                type="button"
                aria-label="Next page"
                className="grid h-11 w-11 place-items-center rounded-lg border border-pv-border-soft bg-white text-pv-ink transition-colors hover:bg-pv-bg"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex justify-center rounded-xl bg-pv-divider p-8">
            <article className="flex w-[560px] max-w-full flex-col gap-5 rounded bg-white p-10 shadow-[0_12px_32px_rgba(21,63,53,0.1),0_1px_2px_rgba(21,63,53,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <img src={reportLogo} alt="Pax Virentia" className="h-14 w-auto" />
                <div className="text-right text-[12px] leading-4 text-pv-muted">
                  <div>Report PV-R-0057</div>
                  <div>13 Oct 2026</div>
                </div>
              </div>

              <div className="rounded-md bg-pv-info-bg px-3 py-2 text-[12px] font-medium leading-4 text-pv-info">
                Simulated estimates · Sample data — not measured or validated results
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-pv-ink">
                  Scenario analysis report
                </h3>
                <p className="text-[14px] leading-5 text-pv-muted">
                  Sample Water District · representative plant · 1–5 Jan 2026 · 61,600 m³ treated
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold leading-5 text-pv-ink">1 · Summary</span>
                <div className="grid grid-cols-3 gap-2">
                  {PREVIEW_SUMMARY.map((box) => (
                    <div key={box.metric} className="flex flex-col gap-1 rounded-lg bg-pv-bg px-4 py-3">
                      <span className="text-[12px] leading-4 text-pv-muted">{box.metric}</span>
                      <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                        {box.value}
                      </span>
                      <span className="text-[12px] leading-4 text-pv-ok-ink">{box.delta}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[12px] leading-4 text-pv-muted">
                Pax Silica pilot (R-0142) against baseline (R-0139). Downstream ecosystem stress: not
                estimable. Pax Silica specification v0.4 is unverified.
              </p>

              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold leading-5 text-pv-ink">Contents</span>
                <ol className="flex flex-col gap-1 pl-5 text-[12px] leading-4 text-pv-ink">
                  {CONTENTS.map((item, index) => (
                    <li key={item} className="relative">
                      <span aria-hidden="true" className="absolute -left-5">
                        {index + 1}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-pv-hairline pt-3 text-[12px] leading-4 text-pv-muted">
                <span>Prepared by Ana Santos (sample account) from frozen runs R-0139, R-0140, R-0142</span>
                <span>1 / 6</span>
              </div>
            </article>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {PREVIEW_TABS.map((label, index) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span
                  className={clsx(
                    'h-[88px] w-16 rounded-[2px] bg-white',
                    index === 0 ? 'border-2 border-pv-teal' : 'border border-pv-divider',
                  )}
                  aria-hidden="true"
                />
                <span
                  className={clsx(
                    'text-[12px] leading-4',
                    index === 0 ? 'font-medium text-pv-forest' : 'text-pv-muted',
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Generated reports */}
      <section
        aria-label="Generated reports"
        className="flex flex-col overflow-hidden rounded-xl border border-pv-divider bg-white shadow-pv-card"
      >
        <div className="px-6 pb-4 pt-6">
          <h2 className={H2}>Generated reports</h2>
        </div>
        <div className="overflow-x-auto pv-scroll">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[35.4%]" />
              <col className="w-[6.4%]" />
              <col className="w-[12.5%]" />
              <col className="w-[17.4%]" />
              <col className="w-[8.9%]" />
              <col className="w-[19.4%]" />
            </colgroup>
            <thead>
              <tr className="bg-pv-bg">
                {['Report', 'Runs', 'Format', 'Created', 'Status', ''].map((heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className="border-b border-pv-divider px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GENERATED_REPORTS.map((report) => (
                <tr key={report.name} className="h-[69px]">
                  <td className="border-b border-pv-hairline px-4 py-3 align-middle">
                    <span className="block text-[14px] font-medium leading-5 text-pv-ink">
                      {report.name}
                    </span>
                    {report.note ? (
                      <span className="mt-0.5 block text-[12px] leading-4 text-pv-err-ink">
                        {report.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3 align-middle text-[14px] leading-5 text-pv-ink">
                    {report.runs}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3 align-middle text-[14px] leading-5 text-pv-ink">
                    {report.format}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3 align-middle text-[14px] leading-5 text-pv-ink">
                    {report.created}
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3 align-middle">
                    <Chip tone={report.status === 'ok' ? 'ok' : 'err'}>
                      {report.status === 'ok' ? 'Ready' : 'Failed'}
                    </Chip>
                  </td>
                  <td className="border-b border-pv-hairline px-4 py-3 text-right align-middle">
                    {report.status === 'ok' ? (
                      <button type="button" className={btnGhost}>
                        Download
                      </button>
                    ) : (
                      <Link to="/scenarios" className={btnGhost}>
                        Choose new data
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Public snapshot */}
      <section
        aria-label="Public snapshot"
        className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={H2}>Public snapshot</h2>
            <p className="text-[14px] leading-5 text-pv-muted">
              A reviewed, redacted copy of selected results for the public portal.
            </p>
          </div>
          <Chip tone="neutral">PS-004 · not yet reviewed</Chip>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SNAPSHOT_STEPS.map((step) => (
            <div key={step.title} className="flex gap-3 rounded-xl bg-pv-bg p-4">
              {step.done ? (
                <CircleCheck size={20} className="mt-0.5 shrink-0 text-pv-ev-green" aria-hidden="true" />
              ) : (
                <Circle size={20} className="mt-0.5 shrink-0 text-pv-input-border" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <span className="block text-[14px] font-semibold leading-5 text-pv-ink">
                  {step.title}
                </span>
                <span className="block text-[12px] leading-4 text-pv-muted">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] leading-4 text-pv-muted">
            Publishing isn't a regulatory approval. Previous snapshot PS-003 was{' '}
            <Link to="/public/PS-003" className="text-pv-teal underline">
              withdrawn on 12 Oct 2026
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/public/PS-004" className={btnSecondary}>
              Preview public page
            </Link>
            <button type="button" className={btnSecondary}>
              Submit for review
            </button>
          </div>
        </div>
      </section>

      {/* Export confirmation dialog */}
      {exportOpen ? (
        <>
          <div
            role="status"
            className="fixed right-8 top-[88px] z-[60] flex items-center gap-3 rounded-xl bg-pv-forest px-4 py-3 shadow-pv-dialog"
          >
            <CircleCheck size={20} className="shrink-0 text-pv-mint" aria-hidden="true" />
            <span className="text-[14px] font-medium leading-5 text-white">Report exported</span>
          </div>
          <RunDialog labelledBy="export-dialog-title" widthClass="w-[560px]" onClose={closeExport}>
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-ok-bg text-pv-ev-green"
                  aria-hidden="true"
                >
                  <FileCheck size={24} />
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      id="export-dialog-title"
                      className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-pv-ink"
                    >
                      Report ready
                    </h2>
                    <Chip tone="ok">Exported</Chip>
                  </div>
                  <p className="text-[14px] leading-5 text-pv-muted">
                    Scenario analysis — Jan 2026 sample period · 3 runs · created 13 Oct 2026, 10:20
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {EXPORT_FILES.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-4 rounded-xl border border-pv-divider p-4"
                  >
                    <span
                      className={clsx(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[12px] font-semibold leading-5',
                        file.badgeClass,
                      )}
                      aria-hidden="true"
                    >
                      {file.badge}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold leading-5 text-pv-ink">
                        {file.name}
                      </span>
                      <span className="block text-[12px] leading-4 text-pv-muted">{file.meta}</span>
                    </div>
                    <button type="button" className={btnSecondary}>
                      Download
                    </button>
                  </div>
                ))}
              </div>

              <p className="max-w-[496px] text-[14px] leading-5 text-pv-muted">
                Every page is labeled “Simulated estimates · Sample data” and includes the assumptions,
                methodology and limitations used for each run.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link to="/" className={btnGhost}>
                  Back to dashboard
                </Link>
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className={btnSecondary} onClick={closeExport}>
                    Done
                  </button>
                  <Link to="/public/PS-004" className={btnPrimary}>
                    Preview public snapshot
                  </Link>
                </div>
              </div>
            </div>
          </RunDialog>
        </>
      ) : null}
    </div>
  );
}
