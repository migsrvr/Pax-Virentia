import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { buildParameters, errorMessage, hydrateDraft, initialDraft, loadSavedScenario, validateDraft } from '../services/simulation';
import type { Draft, Factor, Revision, RunInputs, Scenario, Technology } from '../services/simulation';
import { dismissRun, foregroundRun, retryRun, submitRun, useRunState } from '../services/runLifecycle';
import { Chip, SectionCard, btnPrimary, btnSecondary } from './scenarios/shared';
import OperatingConditionsStep from './scenarios/OperatingConditionsStep';
import CostsEmissionStep from './scenarios/CostsEmissionStep';
import ReviewRunStep from './scenarios/ReviewRunStep';
import RunProgressDialog from './scenarios/RunProgressDialog';
import RunCompleteDialog from './scenarios/RunCompleteDialog';
import RunFailedDialog from './scenarios/RunFailedDialog';

const steps = ['Scenario and process', 'Operating conditions', 'Costs and emission factor', 'Review and run'];

export default function ScenariosPage() {
  const [params] = useSearchParams();
  const scenarioId = params.get('scenarioId');
  // ?fromRunId= starts a NEW scenario from a stored run's frozen inputs.
  const fromRunId = scenarioId === null ? params.get('fromRunId') : null;
  const fromKind = params.get('kind') === 'baseline' ? 'baseline' : 'intervention';
  return <ScenarioEditor key={scenarioId ?? (fromRunId ? `from-${fromRunId}` : 'new')} scenarioId={scenarioId}
    fromRunId={fromRunId} fromKind={fromKind} />;
}

function ScenarioEditor({ scenarioId, fromRunId = null, fromKind = 'intervention' }: {
  scenarioId: string | null; fromRunId?: string | null; fromKind?: Draft['kind'];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const run = useRunState();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>({ ...initialDraft });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [hydrationError, setHydrationError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const operation = useRef(false);
  const saved = useRef<{ scenarioId: string; name: string; kind: Draft['kind']; signature: string; revision: Revision }>();
  const catalogs = useQuery({ queryKey: ['scenario-catalogs'], refetchOnMount: 'always', queryFn: async () => {
    const [technologies, factors] = await Promise.all([
      api.get<{ items: Technology[] }>('/catalogs/technologies'),
      api.get<{ items: Factor[] }>('/catalogs/factors'),
    ]);
    return { technologies: technologies.items, factors: factors.items };
  } });
  const technologies = catalogs.data?.technologies ?? [];
  const factors = catalogs.data?.factors ?? [];
  const source = useQuery({
    queryKey: ['run-inputs', fromRunId],
    queryFn: () => api.get<RunInputs>(`/runs/${encodeURIComponent(fromRunId!)}/inputs`),
    enabled: fromRunId !== null, retry: false,
  });
  useEffect(() => {
    if (!fromRunId || hydrated || hydrationError || !source.data || !catalogs.isSuccess || !catalogs.data) return;
    try {
      const inputs = source.data;
      const restored = hydrateDraft({ id: inputs.scenario_id, name: inputs.scenario_name, kind: inputs.kind },
        { id: '', scenario_id: inputs.scenario_id, revision_no: inputs.revision_no, parameters: inputs.parameters },
        catalogs.data.technologies, catalogs.data.factors);
      // A prefilled draft is unsaved: saving creates a new scenario rather than a revision.
      setDraft({ ...restored, name: '', kind: fromKind });
      setHydrated(true);
      setNotice(`Started from the frozen inputs of “${inputs.scenario_name}” (revision ${inputs.revision_no}). Name the new ${fromKind}, change what you want to test, then save.`);
    } catch (error) { setHydrationError(errorMessage(error)); }
  }, [fromRunId, fromKind, hydrated, hydrationError, source.data, catalogs.isSuccess, catalogs.data]);
  const resume = useQuery({ queryKey: ['scenario-resume', scenarioId], queryFn: () => loadSavedScenario(scenarioId!), enabled: scenarioId !== null, retry: false, refetchOnMount: 'always' });
  useEffect(() => {
    if (!scenarioId || hydrated || !resume.isFetchedAfterMount || !resume.isSuccess || resume.isFetching || !resume.data || !catalogs.isFetchedAfterMount || !catalogs.isSuccess || catalogs.isFetching || !catalogs.data || hydrationError) return;
    try {
      const { scenario, revision } = resume.data;
      const restored = hydrateDraft(scenario, revision, catalogs.data.technologies, catalogs.data.factors);
      const technology = catalogs.data.technologies.find(item => item.id === restored.technologyId)!;
      const factor = catalogs.data.factors.find(item => item.id === restored.factorId)!;
      saved.current = { scenarioId: scenario.id, name: scenario.name, kind: scenario.kind,
        signature: JSON.stringify(buildParameters(restored, technology, factor)), revision };
      setDraft(restored);
      setHydrated(true);
      setNotice(`Resumed saved revision ${revision.revision_no}.`);
    } catch (error) { setHydrationError(errorMessage(error)); }
  }, [scenarioId, hydrated, hydrationError, resume.isFetchedAfterMount, resume.isSuccess, resume.isFetching, resume.data, catalogs.isFetchedAfterMount, catalogs.isSuccess, catalogs.isFetching, catalogs.data]);
  const technology = technologies.find(item => item.id === draft.technologyId);
  const factor = factors.find(item => item.id === draft.factorId);
  const onChange = (patch: Partial<Draft>) => { setDraft(current => ({ ...current, ...patch })); setNotice(''); };
  const showErrors = (messages: string[]) => {
    setErrors(messages);
    requestAnimationFrame(() => { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  };
  const cacheSavedRevision = async (scenario: Scenario, revision: Revision) => {
    const matchingQueries = { queryKey: ['scenario-resume'], predicate: (query: { queryKey: readonly unknown[] }) =>
      typeof query.queryKey[1] === 'string' && query.queryKey[1].toLowerCase() === scenario.id.toLowerCase() };
    // Discard older in-flight reads before publishing the revision just committed.
    await queryClient.cancelQueries(matchingQueries);
    const data = { scenario: { ...scenario, revision_no: revision.revision_no, revision_id: revision.id, latest_revision: revision }, revision };
    queryClient.setQueriesData(matchingQueries, data);
    queryClient.setQueryData(['scenario-resume', scenario.id], data);
  };
  const save = async (): Promise<Revision | undefined> => {
    if (scenarioId !== null && (!hydrated || !saved.current)) throw new Error('Wait for the saved scenario to load before saving.');
    if (scenarioId !== null) {
      if (!catalogs.isFetchedAfterMount || !catalogs.isSuccess || catalogs.isFetching) throw new Error('Wait for the current technology and emission factor catalogs to finish loading before saving.');
      // Revalidate the frozen versions even if a later catalog refresh occurred
      // after hydration. Explicit selection of another valid version remains allowed.
      const current = saved.current!;
      hydrateDraft({ id: current.scenarioId, name: current.name, kind: current.kind }, current.revision, technologies, factors);
    }
    const issues = validateDraft(draft, technology, factor);
    if (issues.length || !technology || !factor) { showErrors(issues); return; }
    const parameters = buildParameters(draft, technology, factor);
    const signature = JSON.stringify(parameters);
    const name = draft.name.trim();
    if (saved.current?.name === name && saved.current.kind === draft.kind) {
      if (saved.current.signature === signature) return saved.current.revision;
      const revision = await api.post<Revision>(`/scenarios/${saved.current.scenarioId}/revisions`, { parameters });
      saved.current = { ...saved.current, signature, revision };
      await cacheSavedRevision({ id: saved.current.scenarioId, name, kind: draft.kind }, revision);
      return revision;
    }
    const scenario = await api.post<Scenario & { latest_revision: Revision }>('/scenarios', { name, kind: draft.kind, parameters });
    saved.current = { scenarioId: scenario.id, name, kind: draft.kind, signature, revision: scenario.latest_revision };
    await cacheSavedRevision(scenario, scenario.latest_revision);
    return scenario.latest_revision;
  };
  const saveOrRun = async (launch: boolean) => {
    if (operation.current) return;
    if (launch && run && ['submitting', 'queued', 'running'].includes(run.phase)) { foregroundRun(); return; }
    operation.current = true; setBusy(true); setErrors([]); setNotice('');
    try {
      const revision = await save();
      if (!revision) return;
      void queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setNotice(`Saved revision ${revision.revision_no}.`);
      if (launch) {
        dismissRun();
        await submitRun(revision.id, draft.name.trim(), revision.revision_no);
        void queryClient.invalidateQueries({ queryKey: ['workspace'] });
        void queryClient.invalidateQueries({ queryKey: ['runs'] });
      }
    } catch (error) { showErrors([errorMessage(error)]); }
    finally { operation.current = false; setBusy(false); }
  };
  if (scenarioId !== null && (resume.isError || catalogs.isError || hydrationError)) return <SectionCard>
    <h1 className="text-2xl font-semibold">Saved scenario unavailable</h1>
    <p role="alert" className="text-pv-err-ink">{hydrationError || errorMessage(resume.error ?? catalogs.error)}</p>
    <div className="flex flex-wrap gap-3"><Link to="/" className={btnSecondary}>Choose a saved scenario</Link><Link to="/scenarios" className={btnPrimary}>Create scenario</Link>
      <button type="button" className={btnSecondary} onClick={() => { setHydrationError(''); void resume.refetch(); void catalogs.refetch(); }}>Retry loading</button></div>
  </SectionCard>;
  if (scenarioId !== null && !hydrated) return <SectionCard><h1 className="text-2xl font-semibold">Resume saved scenario</h1><p role="status">Loading the scenario, latest revision, and versioned catalogs…</p></SectionCard>;
  if (fromRunId !== null && (source.isError || catalogs.isError || hydrationError)) return <SectionCard>
    <h1 className="text-2xl font-semibold">Can’t start from this run</h1>
    <p role="alert" className="text-pv-err-ink">{hydrationError || errorMessage(source.error ?? catalogs.error)}</p>
    <div className="flex flex-wrap gap-3"><Link to="/scenarios" className={btnPrimary}>Start a blank scenario</Link>
      <button type="button" className={btnSecondary} onClick={() => { setHydrationError(''); void source.refetch(); void catalogs.refetch(); }}>Retry loading</button></div>
  </SectionCard>;
  if (fromRunId !== null && !hydrated) return <SectionCard><h1 className="text-2xl font-semibold">Start from a stored run</h1><p role="status">Loading the run’s frozen inputs and versioned catalogs…</p></SectionCard>;
  return <div className="flex flex-col gap-6 text-pv-ink">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><nav aria-label="Breadcrumb" className="mb-2 text-xs text-pv-muted"><Link to="/">Workspace</Link> / Scenarios</nav>
        <h1 className="text-[28px] font-semibold tracking-tight">{step === 4 ? 'Review and run' : 'Set up simulation'}</h1>
        <p className="mt-1 text-sm text-pv-muted">Draft{saved.current ? ` · saved revision ${saved.current.revision.revision_no}` : ' · not yet saved'}</p>
      </div>
      <button type="button" disabled={busy || catalogs.isPending} onClick={() => { void saveOrRun(false); }} className={btnSecondary + ' disabled:opacity-50'}>{busy ? 'Saving…' : 'Save draft'}</button>
    </div>
    <nav aria-label="Setup steps" className="rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{steps.map((title, index) => <li key={title}>
        <button type="button" onClick={() => setStep(index + 1)} aria-current={step === index + 1 ? 'step' : undefined} className="flex items-center gap-3 text-left">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${step === index + 1 ? 'bg-pv-teal text-white' : 'bg-pv-chip'}`}>{step > index + 1 ? <Check size={18} aria-hidden /> : index + 1}</span>
          <span className="text-sm font-medium">{title}</span>
        </button>
      </li>)}</ol>
    </nav>
    {catalogs.isPending && <p role="status">Loading versioned technology and emission factor catalogs…</p>}
    {catalogs.isError && <div role="alert" className="rounded-xl bg-pv-err-bg p-4 text-pv-err-ink">{errorMessage(catalogs.error)} <button className={btnSecondary} onClick={() => { void catalogs.refetch(); }}>Retry catalogs</button></div>}
    {errors.length > 0 && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-pv-err-border bg-pv-err-bg p-4 text-pv-err-ink">
      <p className="font-semibold">Review these inputs</p><ul className="mt-2 list-disc pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul>
    </div>}
    {notice && <p role="status" className="rounded-xl bg-pv-ok-bg p-4">{notice}</p>}
    {step === 1 ? <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Scenario and treatment process</h2>
          <label className="flex flex-col gap-2 text-sm">Scenario name
            <input required readOnly={scenarioId !== null} maxLength={200} value={draft.name} onChange={e => onChange({ name: e.target.value })} className="h-11 rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal" />
          </label>
          <fieldset><legend className="mb-3 text-sm font-medium">Scenario type</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{(['baseline', 'intervention'] as const).map(kind => <label key={kind} className="flex items-start gap-3 rounded-xl border border-pv-divider p-4">
              <input type="radio" name="scenario-kind" disabled={scenarioId !== null} checked={draft.kind === kind} onChange={() => onChange({ kind })} className="mt-1 accent-pv-teal" />
              <span><span className="block font-medium capitalize">{kind}</span><span className="text-sm text-pv-muted">{kind === 'baseline' ? 'Reference operating assumptions.' : 'A proposed change to compare with a baseline.'}</span></span>
            </label>)}</div>
          </fieldset>
          {scenarioId !== null && <p className="text-sm text-pv-muted">Name and type identify the saved scenario. Editing operating assumptions appends a revision to this scenario.</p>}
          <label className="flex flex-col gap-2 text-sm">Treatment specification
            <select value={draft.technologyId} onChange={e => onChange({ technologyId: e.target.value })} className="h-11 w-full rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal">
              <option value="">Select a versioned specification</option>
              {technologies.map(item => <option value={item.id} key={item.id}>{item.name} · {item.version_id} · {item.evidence_status}</option>)}
            </select>
          </label>
          {catalogs.isSuccess && !technologies.length && <p role="status">No technology specifications are available.</p>}
          {technology && <div className="flex flex-col gap-3 rounded-xl bg-pv-bg p-4">
            <Chip tone={technology.evidence_status === 'unverified' ? 'warn' : 'neutral'}>{technology.evidence_status}</Chip>
            <p className="break-words text-sm">Version: {technology.version_id}<br />Source: {technology.source_ref}</p>
          </div>}
          <label className="flex flex-col gap-2 text-sm">Dataset version UUID (optional)
            <input value={draft.datasetId} onChange={e => onChange({ datasetId: e.target.value })} placeholder="Leave empty for analyst-entered assumptions" className="h-11 min-w-0 rounded-lg border border-pv-input-border px-3 focus:outline-pv-teal" />
          </label>
        </SectionCard>
        <SectionCard>
          <h2 className="text-[18px] font-semibold">Evidence and model boundaries</h2>
          <p className="text-sm">This is an offline plant model. It evaluates versioned assumptions over a defined service volume and period.</p>
          <p className="rounded-xl bg-pv-warn-bg p-4 text-sm">Pax Silica is an unverified treatment specification. Its assumed performance must be reviewed against suitable technical evidence.</p>
          <p className="text-sm text-pv-muted">Enter operating values within the selected specification’s ranges. Prefilled costs are editable assumptions, not measured observations. Linking a dataset does not automatically replace your entered values.</p>
          <p className="text-sm text-pv-muted">Save draft stores a validated scenario revision on the server. A run separately freezes that revision for calculation.</p>
        </SectionCard>
      </div>
      <div className="flex justify-end rounded-xl border border-pv-divider bg-white p-4"><button type="button" onClick={() => setStep(2)} className={btnPrimary}>Continue to operating conditions<ArrowRight size={18} aria-hidden /></button></div>
    </> : step === 2 ? <OperatingConditionsStep draft={draft} onChange={onChange} technology={technology} onBack={() => setStep(1)} onContinue={() => setStep(3)} />
      : step === 3 ? <CostsEmissionStep draft={draft} onChange={onChange} factors={factors} onBack={() => setStep(2)} onContinue={() => setStep(4)} />
      : <ReviewRunStep draft={draft} technology={technology} factor={factor} busy={busy} onBack={() => setStep(3)} onEdit={setStep} onRun={() => { void saveOrRun(true); }} />}
    {run?.foreground && ['submitting', 'queued', 'running'].includes(run.phase) && <RunProgressDialog />}
    {run?.foreground && run.phase === 'succeeded' && <RunCompleteDialog onClose={dismissRun} onBackToDashboard={() => { dismissRun(); navigate('/'); }} onViewResults={() => { const id = run.id; dismissRun(); navigate(`/results?runId=${id}`); }} />}
    {run?.foreground && ['failed', 'cancelled'].includes(run.phase) && <RunFailedDialog onClose={dismissRun} onEditInputs={() => { dismissRun(); setStep(2); }} onRetry={retryRun} />}
  </div>;
}
