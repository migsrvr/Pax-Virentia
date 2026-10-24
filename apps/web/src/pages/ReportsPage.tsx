import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, CircleCheck, Download, FileCheck, Info, Printer } from 'lucide-react';
import { Chip, RunDialog, btnGhost, btnPrimary, btnSecondary } from './scenarios/shared';
import PublicationPanel from '../components/common/PublicationPanel';
import { useAuth } from '../services/auth';
import { canAnalyze } from '../services/roles';
import { safePublicText } from '../services/text';
import { errorMessage, listRuns } from '../services/simulation';
import type { Run } from '../services/simulation';
import {
  createReport, displayCell, downloadReport, listReports, previewReport, printReport,
} from '../services/reports';
import type { ReportFormat, ReportModel, ReportRequest, ReportSection, ReportType, StoredReport } from '../services/reports';
import reportLogo from '../assets/report-logo.png';

const H2 = 'text-[18px] font-semibold leading-[26px] text-pv-ink';
const MAX_RUNS = 5;

const REPORT_TYPES: { id: ReportType; title: string; desc: string }[] = [
  { id: 'technical', title: 'Technical report', desc: 'Inputs, results, comparison and methodology from stored runs (PDF and/or CSV).' },
  { id: 'data_export', title: 'Data export', desc: 'CSV of the selected sections only.' },
];

const SECTION_OPTIONS: { id: ReportSection; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'inputs', label: 'Inputs and assumptions' },
  { id: 'results', label: 'Results by run' },
  { id: 'comparison', label: 'Scenario comparison' },
];

const FORMAT_OPTIONS: { id: ReportFormat; label: string }[] = [
  { id: 'pdf', label: 'PDF report' },
  { id: 'csv', label: 'CSV data' },
];

const FILE_BADGES: Record<ReportFormat, string> = {
  pdf: 'bg-pv-err-bg text-pv-err-ink',
  csv: 'bg-pv-ok-bg text-pv-ok-ink',
};

const runLabel = (run: Run) =>
  `${run.scenario_name ?? 'Scenario'} · rev ${run.revision_no ?? run.frozen_inputs?.revision_no ?? '—'} · ${run.kind ?? 'scenario'} · ${run.id.slice(0, 8)}`;
const when = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : '—');
const safeTitle = (value: string) => safePublicText(value);

function RadioOption({ name, checked, onSelect, title, desc }: {
  name: string; checked: boolean; onSelect: () => void; title: string; desc: string;
}) {
  return (
    <label className={clsx('flex cursor-pointer gap-3 rounded-xl px-4 py-3 transition-colors',
      checked ? 'border-2 border-pv-teal bg-pv-run-bg' : 'border border-pv-border-soft bg-white hover:border-pv-input-border')}>
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} />
      <span className={clsx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white',
        checked ? 'border-2 border-pv-teal' : 'border border-pv-radio-border')} aria-hidden="true">
        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-pv-teal" /> : null}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold leading-5 text-pv-ink">{title}</span>
        <span className="text-[12px] leading-4 text-pv-muted">{desc}</span>
      </span>
    </label>
  );
}

function CheckboxRow({ checked, onToggle, label, disabled = false }: {
  checked: boolean; onToggle: () => void; label: ReactNode; disabled?: boolean;
}) {
  return (
    <label className={clsx('flex items-center gap-3', disabled ? 'cursor-default opacity-60' : 'cursor-pointer')}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onToggle} />
      <span className={clsx('grid h-5 w-5 shrink-0 place-items-center rounded-[2px] peer-focus-visible:ring-2 peer-focus-visible:ring-pv-teal',
        checked ? (disabled ? 'border border-pv-disabled-border bg-pv-disabled-border text-white' : 'border border-pv-teal bg-pv-teal text-white')
          : 'border border-pv-radio-border bg-white')} aria-hidden="true">
        {checked ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      <span className="text-[14px] leading-5 text-pv-ink">{label}</span>
    </label>
  );
}

function PreviewPage({ model, page }: { model: ReportModel; page: number }) {
  const section = model.sections[page];
  return (
    <article className="flex w-[560px] max-w-full flex-col gap-5 rounded bg-white p-10 shadow-[0_12px_32px_rgba(21,63,53,0.1),0_1px_2px_rgba(21,63,53,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <img src={reportLogo} alt="Pax Virentia" className="h-14 w-auto" />
        <div className="text-right text-[12px] leading-4 text-pv-muted">
          <div>{model.id === 'preview' ? 'Preview · not yet exported' : `Report ${model.id.slice(0, 8)}`}</div>
          <div>{model.created_at ? new Date(model.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <div className="rounded-md bg-pv-info-bg px-3 py-2 text-[12px] font-medium leading-4 text-pv-info">{model.label}</div>
      {page === 0 ? <h3 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-pv-ink">{model.title}</h3> : null}
      <div className="flex flex-col gap-3">
        <span className="text-[14px] font-semibold leading-5 text-pv-ink">{page + 1} · {section.title}</span>
        {section.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-[12px] leading-4 text-pv-ink">{paragraph}</p>
        ))}
        {section.tables.map((table) => (
          <div key={table.caption} className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] leading-4">
              <caption className="pb-1 text-left text-[12px] font-semibold text-pv-ink">{table.caption}</caption>
              <thead>
                <tr className="bg-pv-bg">
                  {table.columns.map((column) => <th key={column} scope="col" className="border border-pv-hairline px-2 py-1 font-medium">{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className={clsx('border border-pv-hairline px-2 py-1 align-top', cell === 'Not estimable' && 'font-semibold text-pv-warn-ink')}>
                        {displayCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-pv-hairline pt-3 text-[12px] leading-4 text-pv-muted">
        <span className="break-all">Frozen runs {model.run_ids.map((id) => id.slice(0, 8)).join(', ')}</span>
        <span>{page + 1} / {model.sections.length}</span>
      </div>
    </article>
  );
}

function ExportDialog({ report, onClose }: { report: StoredReport; onClose: () => void }) {
  const [done, setDone] = useState<ReportFormat | null>(null);
  const download = useMutation({
    mutationFn: (format: ReportFormat) => downloadReport(report, format),
    onSuccess: (_, format) => setDone(format),
  });
  return (
    <>
      {done ? (
        <div role="status" className="fixed right-8 top-[88px] z-[60] flex items-center gap-3 rounded-xl bg-pv-forest px-4 py-3 shadow-pv-dialog">
          <CircleCheck size={20} className="shrink-0 text-pv-mint" aria-hidden="true" />
          <span className="text-[14px] font-medium leading-5 text-white">{done.toUpperCase()} downloaded</span>
        </div>
      ) : null}
      <RunDialog labelledBy="export-dialog-title" widthClass="w-[560px]" onClose={onClose}>
        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pv-ok-bg text-pv-ev-green" aria-hidden="true">
              <FileCheck size={24} />
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="export-dialog-title" className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-pv-ink">Report ready</h2>
                <Chip tone="ok">Saved</Chip>
              </div>
              <p className="text-[14px] leading-5 text-pv-muted">
                {report.title} · {report.run_ids.length} run{report.run_ids.length === 1 ? '' : 's'} · created {when(report.created_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {report.formats.map((format) => (
              <div key={format} className="flex items-center gap-4 rounded-xl border border-pv-divider p-4">
                <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[12px] font-semibold leading-5', FILE_BADGES[format])} aria-hidden="true">
                  {format.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold leading-5 text-pv-ink">{report.title}.{format}</span>
                  <span className="block text-[12px] leading-4 text-pv-muted">Generated from stored results when you download</span>
                </div>
                <button type="button" className={btnSecondary + ' disabled:opacity-50'} disabled={download.isPending}
                  onClick={() => { setDone(null); download.mutate(format); }}>
                  {download.isPending && download.variables === format ? 'Downloading…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
          {download.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(download.error)}</p> : null}
          <p className="max-w-[496px] text-[14px] leading-5 text-pv-muted">
            Every page is labeled as a simulated estimate and includes the assumptions, methodology and limitations used for each run.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <button type="button" className={btnSecondary} onClick={onClose}>Done</button>
          </div>
        </div>
      </RunDialog>
    </>
  );
}

function GeneratedReports({ onOpen }: { onOpen: (report: StoredReport) => void }) {
  const reports = useQuery({ queryKey: ['reports'], queryFn: listReports });
  return (
    <section aria-label="Generated reports" className="flex flex-col overflow-hidden rounded-xl border border-pv-divider bg-white shadow-pv-card">
      <div className="px-6 pb-4 pt-6"><h2 className={H2}>Generated reports</h2></div>
      {reports.isPending ? <p role="status" className="px-6 pb-6">Loading reports…</p>
        : reports.isError ? <p role="alert" className="px-6 pb-6 text-pv-err-ink">{errorMessage(reports.error)}</p>
        : !reports.data.length ? <p className="px-6 pb-6 text-[14px] text-pv-muted">No reports have been exported yet.</p>
        : (
          <div className="overflow-x-auto pv-scroll">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-pv-bg">
                  {['Report', 'Runs', 'Formats', 'Created', ''].map((heading, index) => (
                    <th key={`${heading}-${index}`} scope="col" className="border-b border-pv-divider px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.data.map((report) => (
                  <tr key={report.id}>
                    <td className="border-b border-pv-hairline px-4 py-3">
                      <span className="block text-[14px] font-medium leading-5 text-pv-ink">{report.title}</span>
                      <span className="block text-[12px] leading-4 text-pv-muted">
                        {report.report_type === 'data_export' ? 'Data export' : 'Technical report'} · {report.sections.join(', ')}
                      </span>
                    </td>
                    <td className="border-b border-pv-hairline px-4 py-3 text-[14px]">{report.run_ids.length}</td>
                    <td className="border-b border-pv-hairline px-4 py-3 text-[14px]">{report.formats.map((f) => f.toUpperCase()).join(' · ')}</td>
                    <td className="border-b border-pv-hairline px-4 py-3 text-[14px]">{when(report.created_at)}{report.created_by_name ? ` · ${report.created_by_name}` : ''}</td>
                    <td className="border-b border-pv-hairline px-4 py-3 text-right">
                      <button type="button" className={btnGhost} onClick={() => onOpen(report)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const runs = useQuery({ queryKey: ['runs'], queryFn: listRuns });
  const succeeded = useMemo(() => runs.data?.filter((run) => run.status === 'succeeded') ?? [], [runs.data]);

  const [reportType, setReportType] = useState<ReportType>('technical');
  const [title, setTitle] = useState('Scenario analysis report');
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [sections, setSections] = useState<ReportSection[]>(['summary', 'inputs', 'results']);
  const [formats, setFormats] = useState<ReportFormat[]>(['pdf', 'csv']);
  const [baselineId, setBaselineId] = useState('');
  const [interventionId, setInterventionId] = useState('');
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<StoredReport | null>(null);
  const [lastExport, setLastExport] = useState<{ key: string; report: StoredReport } | null>(null);
  const [publishRunId, setPublishRunId] = useState('');

  // Default to the two most recent completed runs once, when runs first load; the user may then clear them.
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current || !succeeded.length) return;
    defaulted.current = true;
    setSelectedRuns(succeeded.slice(0, 2).map((run) => run.id));
  }, [succeeded]);

  const effectiveFormats: ReportFormat[] = reportType === 'data_export' ? ['csv'] : formats;
  const comparisonPossible = selectedRuns.length >= 2;
  const comparison = sections.includes('comparison') && comparisonPossible && baselineId && interventionId && baselineId !== interventionId
    && selectedRuns.includes(baselineId) && selectedRuns.includes(interventionId)
    ? { baseline_run_id: baselineId, intervention_run_id: interventionId } : undefined;
  const effectiveSections = sections.filter((section) => section !== 'comparison' || comparison);
  const problems = [
    !selectedRuns.length && 'Select at least one completed run.',
    !effectiveSections.length && 'Select at least one section.',
    !effectiveFormats.length && 'Select at least one format.',
    !safeTitle(title) && 'Enter a report title.',
    sections.includes('comparison') && !comparison && 'Choose a baseline and a different intervention run for the comparison.',
  ].filter(Boolean) as string[];
  const request: ReportRequest | null = problems.length ? null : {
    report_type: reportType, title: safeTitle(title), run_ids: selectedRuns, sections: effectiveSections,
    formats: effectiveFormats, ...(comparison ? { comparison } : {}),
  };
  const requestKey = JSON.stringify(request);

  const preview = useQuery({
    queryKey: ['report-preview', requestKey],
    queryFn: () => previewReport(request!).then((response) => response.preview),
    enabled: !!request && canAnalyze(user),
    retry: false,
  });
  useEffect(() => setPage(0), [requestKey]);

  const exportReport = useMutation({
    mutationFn: () => createReport(request!),
    onSuccess: (report) => {
      setDialog(report);
      setLastExport({ key: requestKey, report });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
  // Print the exported PDF for these exact settings, exporting (with PDF) first if needed.
  const print = useMutation({
    mutationFn: async (target: Window | null) => {
      let report = lastExport?.key === requestKey && lastExport.report.formats.includes('pdf') ? lastExport.report : null;
      if (!report) {
        const withPdf: ReportFormat[] = request!.formats.includes('pdf') ? request!.formats : [...request!.formats, 'pdf'];
        report = await createReport({ ...request!, formats: withPdf });
        setLastExport({ key: requestKey, report });
        void queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
      await printReport(report, target);
    },
  });

  const toggleRun = (id: string) => setSelectedRuns((current) => current.includes(id)
    ? current.filter((item) => item !== id) : current.length >= MAX_RUNS ? current : [...current, id]);
  const toggleSection = (id: ReportSection) => setSections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleFormat = (id: ReportFormat) => setFormats((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const model = preview.data;
  const pageCount = model?.sections.length ?? 0;
  const publicationRun = selectedRuns.includes(publishRunId) ? publishRunId : selectedRuns[0];
  const publicationRunData = succeeded.find((run) => run.id === publicationRun);

  if (!canAnalyze(user)) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[28px] font-semibold leading-9 text-pv-ink">Reports</h1>
        <p className="text-[14px] text-pv-muted">Report exports are available to analysts and administrators.</p>
        <GeneratedReports onOpen={setDialog} />
        {dialog ? <ExportDialog report={dialog} onClose={() => setDialog(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Reports</h1>
        <p className="text-[14px] leading-5 text-pv-muted">
          Build a report from frozen runs. Every figure comes straight from stored simulation results, with its
          assumptions and limitations attached.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400fr_712fr]">
        <section aria-label="Report builder" className="flex flex-col gap-6 self-start rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
          <h2 className={H2}>Report builder</h2>

          <label className="flex flex-col gap-2 text-[12px] font-medium leading-4 text-pv-ink">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160}
              className="h-11 rounded-lg border border-pv-input-border px-3 text-[14px] font-normal focus:outline-pv-teal" />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[12px] font-medium leading-4 text-pv-ink">Report type</legend>
            {REPORT_TYPES.map((type) => (
              <RadioOption key={type.id} name="report-type" checked={reportType === type.id}
                onSelect={() => setReportType(type.id)} title={type.title} desc={type.desc} />
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[12px] font-medium leading-4 text-pv-ink">Runs included (up to {MAX_RUNS})</legend>
            {runs.isPending ? <p role="status" className="text-[14px]">Loading completed runs…</p>
              : runs.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(runs.error)}</p>
              : !succeeded.length ? (
                <p className="text-[14px] text-pv-muted">No completed runs yet. <Link to="/scenarios" className="text-pv-teal underline">Run a scenario</Link> first.</p>
              ) : succeeded.map((run) => (
                <CheckboxRow key={run.id} checked={selectedRuns.includes(run.id)} onToggle={() => toggleRun(run.id)}
                  disabled={!selectedRuns.includes(run.id) && selectedRuns.length >= MAX_RUNS} label={runLabel(run)} />
              ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[12px] font-medium leading-4 text-pv-ink">Sections</legend>
            {SECTION_OPTIONS.map((option) => (
              <CheckboxRow key={option.id} checked={sections.includes(option.id)} onToggle={() => toggleSection(option.id)}
                disabled={option.id === 'comparison' && !comparisonPossible}
                label={option.id === 'comparison' && !comparisonPossible ? <>{option.label} <span className="text-pv-muted">· select two runs</span></> : option.label} />
            ))}
            {sections.includes('comparison') && comparisonPossible ? (
              <div className="ml-8 grid grid-cols-1 gap-2">
                {([['Baseline', baselineId, setBaselineId], ['Intervention', interventionId, setInterventionId]] as const).map(([name, value, setter]) => (
                  <label key={name} className="flex flex-col gap-1 text-[12px] text-pv-ink">
                    {name} run
                    <select value={value} onChange={(event) => setter(event.target.value)}
                      className="h-11 rounded-lg border border-pv-input-border bg-white px-3 text-[14px] focus:outline-pv-teal">
                      <option value="">Choose…</option>
                      {succeeded.filter((run) => selectedRuns.includes(run.id)).map((run) => (
                        <option key={run.id} value={run.id}>{runLabel(run)}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            <CheckboxRow checked disabled onToggle={() => undefined}
              label={<>Methodology and limitations <span className="text-pv-muted">· always included</span></>} />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[12px] font-medium leading-4 text-pv-ink">Format</legend>
            <div className="flex flex-wrap items-center gap-6">
              {FORMAT_OPTIONS.map((option) => (
                <CheckboxRow key={option.id} checked={effectiveFormats.includes(option.id)} onToggle={() => toggleFormat(option.id)}
                  disabled={reportType === 'data_export'} label={option.label} />
              ))}
            </div>
          </fieldset>

          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-pv-ev-blue" aria-hidden="true" />
            <span className="max-w-[326px] text-[12px] leading-4 text-pv-muted">
              Every page is marked “Simulated estimates · offline plant model”. Files are regenerated from stored results on each download.
            </span>
          </div>

          {problems.length ? (
            <ul className="list-disc space-y-1 pl-5 text-[12px] text-pv-warn-ink">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={btnPrimary + ' disabled:opacity-50'} disabled={!request || exportReport.isPending}
              onClick={() => exportReport.mutate()}>
              <Download size={18} aria-hidden="true" />
              {exportReport.isPending ? 'Exporting…' : 'Export report'}
            </button>
            <button type="button" className={btnSecondary + ' disabled:opacity-50'} disabled={!request || reportType === 'data_export' || print.isPending}
              onClick={() => print.mutate(window.open('', '_blank'))}>
              <Printer size={18} aria-hidden="true" />
              {print.isPending ? 'Opening…' : 'Print preview'}
            </button>
          </div>
          {exportReport.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(exportReport.error)}</p> : null}
          {print.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(print.error)}</p> : null}
        </section>

        <section aria-label="Preview" className="flex flex-col gap-4 self-start">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className={H2}>Preview</h2>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="grid h-11 w-11 place-items-center rounded-lg border border-pv-border-soft bg-white text-pv-ink transition-colors hover:bg-pv-bg disabled:opacity-40">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="text-[14px] leading-5 text-pv-muted" aria-live="polite">
                {pageCount ? `Page ${page + 1} of ${pageCount}` : 'No pages'}
              </span>
              <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                className="grid h-11 w-11 place-items-center rounded-lg border border-pv-border-soft bg-white text-pv-ink transition-colors hover:bg-pv-bg disabled:opacity-40">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex min-h-[320px] justify-center rounded-xl bg-pv-divider p-8">
            {!request ? <p className="self-center text-[14px] text-pv-muted">Complete the builder to preview the report.</p>
              : preview.isPending ? <p role="status" className="self-center text-[14px]">Building preview from stored results…</p>
              : preview.isError ? <p role="alert" className="self-center text-pv-err-ink">{errorMessage(preview.error)}</p>
              : model && model.sections[page] ? <PreviewPage model={model} page={page} /> : null}
          </div>

          {model ? (
            <div className="flex flex-wrap items-center gap-4" role="tablist" aria-label="Report pages">
              {model.sections.map((section, index) => (
                <button key={section.key} type="button" role="tab" aria-selected={index === page} onClick={() => setPage(index)}
                  className="flex flex-col items-center gap-2">
                  <span className={clsx('h-[88px] w-16 rounded-[2px] bg-white', index === page ? 'border-2 border-pv-teal' : 'border border-pv-divider')} aria-hidden="true" />
                  <span className={clsx('text-[12px] leading-4', index === page ? 'font-medium text-pv-forest' : 'text-pv-muted')}>{section.title}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <GeneratedReports onOpen={setDialog} />

      {selectedRuns.length > 1 ? (
        <label className="flex max-w-[480px] flex-col gap-2 text-[12px] font-medium text-pv-ink">
          Run for the public snapshot
          <select value={publicationRun ?? ''} onChange={(event) => setPublishRunId(event.target.value)}
            className="h-11 rounded-lg border border-pv-input-border bg-white px-3 text-[14px] font-normal focus:outline-pv-teal">
            {succeeded.filter((run) => selectedRuns.includes(run.id)).map((run) => <option key={run.id} value={run.id}>{runLabel(run)}</option>)}
          </select>
        </label>
      ) : null}
      <PublicationPanel runId={publicationRun}
        defaultTitle={`${publicationRunData?.scenario_name ?? 'Scenario'} — simulation results`} />

      {dialog ? <ExportDialog report={dialog} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
