import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import EvidenceNotice from '../components/common/EvidenceNotice';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { canAnalyze } from '../services/roles';
import { errorMessage, format, listAll } from '../services/simulation';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';
import { blockingIssues } from '../services/datasets';
import type { DatasetSummary, QualityReport } from '../services/datasets';

const MAX_BYTES = 10 * 1024 * 1024;
const EVIDENCE = [
  { value: 'measured', label: 'Measured plant records' },
  { value: 'externally_sourced', label: 'Externally sourced' },
  { value: 'assumed', label: 'Assumed values' },
  { value: 'synthetic', label: 'Synthetic / test data' },
] as const;

function QualityReportView({ report }: { report: QualityReport }) {
  const issues = blockingIssues(report);
  const outlierCount = Object.values(report.outliers).reduce((sum, rows) => sum + rows.length, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={issues.length ? 'err' : 'ok'}>{issues.length ? 'Blocks simulation runs' : 'Usable for runs'}</Chip>
        <span className="text-[12px] text-pv-muted">
          {format(report.row_count, 0)} rows · {report.column_count} columns · schema {report.schema_version}
        </span>
      </div>
      {issues.length ? (
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-pv-err-ink">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
      ) : null}
      {report.missing_columns.length ? (
        <p className="text-[14px]">Missing required columns: <span className="font-mono text-[12px]">{report.missing_columns.join(', ')}</span></p>
      ) : null}
      {report.invalid_values.length ? (
        <div>
          <h4 className="text-[14px] font-semibold">Invalid values</h4>
          <ul className="mt-1 space-y-1 text-[12px]">
            {report.invalid_values.slice(0, 20).map((item) => (
              <li key={`${item.row}-${item.field}`}>Row {item.row} · {item.field}: {item.reason}</li>
            ))}
          </ul>
          {report.invalid_values.length > 20 ? <p className="text-[12px] text-pv-muted">…and {report.invalid_values.length - 20} more.</p> : null}
        </div>
      ) : null}
      {report.duplicate_rows.length ? (
        <p className="text-[14px]">Duplicate rows: {report.duplicate_rows.slice(0, 20).join(', ')}{report.duplicate_rows.length > 20 ? '…' : ''}</p>
      ) : null}
      <div>
        <h4 className="text-[14px] font-semibold">Outliers (flagged, rows kept)</h4>
        {outlierCount ? (
          <ul className="mt-1 space-y-1 text-[12px]">
            {Object.entries(report.outliers).map(([field, rows]) => (
              <li key={field}>{field}: {rows.length} value(s) outside {format(rows[0].lower_bound)} – {format(rows[0].upper_bound)}</li>
            ))}
          </ul>
        ) : <p className="text-[12px] text-pv-muted">None flagged.</p>}
        <p className="mt-1 text-[12px] text-pv-muted">Rule: {report.outlier_rule}</p>
      </div>
      <p className="break-all text-[12px] text-pv-muted">SHA-256 {report.content_hash}</p>
    </div>
  );
}

function ImportPanel({ onRegistered }: { onRegistered: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sourceRef, setSourceRef] = useState('');
  const [evidence, setEvidence] = useState<(typeof EVIDENCE)[number]['value']>('measured');
  const inspect = useMutation({ mutationFn: (selected: File) => api.postRaw<QualityReport>('/datasets/inspect', selected, 'text/csv') });
  const register = useMutation({
    mutationFn: () => api.postRaw<{ id: string }>(
      `/datasets?${new URLSearchParams({ source_ref: sourceRef.trim(), evidence_status: evidence })}`, file!, 'text/csv'),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setFile(null); setSourceRef(''); inspect.reset();
      onRegistered(created.id);
    },
  });

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = '';
    register.reset(); inspect.reset(); setFileError(null);
    if (!selected) return;
    if (selected.size > MAX_BYTES) { setFile(null); setFileError('CSV files are limited to 10 MB.'); return; }
    setFile(selected);
    if (!sourceRef.trim()) setSourceRef(selected.name);
    inspect.mutate(selected);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (file && sourceRef.trim()) register.mutate();
  };

  return (
    <SectionCard className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold">Import a CSV</h2>
        <button type="button" className={btnPrimary} onClick={() => input.current?.click()}>
          <Upload size={18} aria-hidden="true" /> Choose CSV file
        </button>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV file" onChange={choose} />
      </div>
      <p className="text-[14px] text-pv-muted">
        Required columns: period_start, period_end, volume_m3, electricity_kwh, pump_hours (UTF-8, at most 10 MB and
        50,000 rows). The file is checked first; nothing is stored until you register it.
      </p>
      {fileError ? <p role="alert" className="text-pv-err-ink">{fileError}</p> : null}
      {file ? <p className="text-[14px]">Selected: <span className="font-semibold">{file.name}</span> · {format(file.size / 1024, 1)} KB</p> : null}
      {inspect.isPending ? <p role="status">Checking the file…</p> : null}
      {inspect.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(inspect.error)}</p> : null}
      {inspect.data ? (
        <form onSubmit={submit} className="flex flex-col gap-4 border-t border-pv-hairline pt-4">
          <QualityReportView report={inspect.data} />
          <label className="flex flex-col gap-2 text-[14px]">
            Source reference (where this data came from)
            <input value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} maxLength={1000} required
              className="h-11 rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal" />
          </label>
          <label className="flex flex-col gap-2 text-[14px]">
            Evidence status
            <select value={evidence} onChange={(event) => setEvidence(event.target.value as typeof evidence)}
              className="h-11 rounded-lg border border-pv-input-border bg-white px-3 focus:outline-pv-teal">
              {EVIDENCE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={btnPrimary + ' disabled:opacity-50'} disabled={!sourceRef.trim() || register.isPending}>
              {register.isPending ? 'Registering…' : 'Register dataset version'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => { setFile(null); inspect.reset(); }}>Discard</button>
          </div>
          {register.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(register.error)}</p> : null}
        </form>
      ) : null}
    </SectionCard>
  );
}

export default function DatasetsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: () => listAll<DatasetSummary>('/datasets') });
  const activeId = selectedId ?? datasets.data?.[0]?.id ?? null;
  const active = datasets.data?.find((item) => item.id === activeId);
  const quality = useQuery({
    queryKey: ['datasets', activeId, 'quality'],
    queryFn: () => api.get<QualityReport>(`/datasets/${encodeURIComponent(activeId!)}/quality`),
    enabled: !!activeId,
  });

  return (
    <div className="flex flex-col gap-6 text-pv-ink">
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight">Datasets</h1>
        <p className="text-[14px] text-pv-muted">
          Import and inspect versioned plant data. Each registered version keeps its original bytes, checksum and
          quality report; a scenario can reference it by ID.
        </p>
      </div>

      {canAnalyze(user) ? <ImportPanel onRegistered={(id) => { setSelectedId(id); setRegistered(id); }} /> : null}
      {registered ? <p role="status" className="text-[14px] text-pv-ok-ink">Registered dataset version {registered}.</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard className="gap-3">
          <h2 className="text-[18px] font-semibold">Dataset versions</h2>
          {datasets.isPending ? <p role="status">Loading datasets…</p>
            : datasets.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(datasets.error)}</p>
            : !datasets.data.length ? <p className="text-[14px] text-pv-muted">No dataset versions are registered yet.</p>
            : (
              <ul className="flex flex-col gap-3">
                {datasets.data.map((item) => {
                  const issues = blockingIssues({ ...item.quality, row_count: item.row_count });
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={item.id === activeId}
                        className={`w-full rounded-lg border p-3 text-left ${item.id === activeId ? 'border-pv-teal bg-pv-run-bg' : 'border-pv-divider hover:border-pv-input-border'}`}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[14px] font-semibold">{item.source_ref}</span>
                          <Chip tone={issues.length ? 'err' : 'ok'}>{issues.length ? 'Has blocking issues' : 'Usable'}</Chip>
                        </span>
                        <span className="mt-1 block text-[12px] text-pv-muted">
                          {format(item.row_count, 0)} rows · {item.evidence_status.replace('_', ' ')} · {new Date(item.created_at).toLocaleString()}
                        </span>
                        <span className="block break-all text-[12px] text-pv-muted">ID {item.id}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
        </SectionCard>

        <SectionCard className="gap-3">
          <h2 className="text-[18px] font-semibold">Quality report{active ? ` — ${active.source_ref}` : ''}</h2>
          {!activeId ? <p className="text-[14px] text-pv-muted">Register a dataset to see its quality report.</p>
            : quality.isPending ? <p role="status">Loading quality report…</p>
            : quality.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(quality.error)}</p>
            : <QualityReportView report={quality.data} />}
        </SectionCard>
      </div>

      <EvidenceNotice
        variant="attribution"
        title="Provenance and checks"
        body="Imports are stored exactly as uploaded with a SHA-256 checksum. The inspection reports missing required columns and values, non-numeric or negative measurements, invalid or overlapping periods, duplicate rows and statistical outliers. It does not convert units or drop rows. A scenario that references a dataset with blocking issues cannot be run."
        sources={['Schema plant-csv-v1', 'Outliers: Tukey 1.5 × IQR, rows retained']}
      />
    </div>
  );
}
