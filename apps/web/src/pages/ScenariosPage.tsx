import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  Droplet,
  FlaskConical,
  TriangleAlert,
} from 'lucide-react';
import { Chip, FieldLabel, SectionCard, btnGhost, btnPrimary, btnSecondary } from './scenarios/shared';
import OperatingConditionsStep from './scenarios/OperatingConditionsStep';
import CostsEmissionStep from './scenarios/CostsEmissionStep';
import ReviewRunStep from './scenarios/ReviewRunStep';
import RunProgressDialog from './scenarios/RunProgressDialog';
import RunCompleteDialog from './scenarios/RunCompleteDialog';
import RunFailedDialog from './scenarios/RunFailedDialog';
import DevStatePreview from '../components/dev/DevStatePreview';
import {
  dismissRun,
  foregroundRun,
  retryRun,
  submitRun,
  useRunState,
} from '../services/runLifecycle';

/* U03 · Setup 1 — Scenario and treatment process (frame 29:2). Sample values as shown in the design. */

const WIZARD_STEPS = [
  { title: 'Scenario and process' },
  { title: 'Operating conditions' },
  { title: 'Costs and emission factor' },
  { title: 'Review and run' },
];

const COMPARE_OPTIONS = [
  { id: 'r-0139', label: 'Baseline operation · rev 3 · run R-0139' },
  { id: 'r-0132', label: 'Baseline operation · rev 2 · run R-0132' },
];

const DATASET_OPTIONS = [
  { id: 'obs-v1.2', label: 'Sample plant observations v1.2 · 1–5 Jan 2026' },
  { id: 'obs-v1.1', label: 'Sample plant observations v1.1 · 12–16 Dec 2025' },
];

const SCENARIO_TYPES = [
  {
    id: 'baseline',
    title: 'Baseline',
    body: 'The reference that other scenarios are compared with.',
  },
  {
    id: 'intervention',
    title: 'Intervention',
    body: 'A proposed change, compared with a baseline.',
  },
] as const;

const TREATMENTS = [
  {
    id: 'conventional',
    icon: FlaskConical,
    title: 'Conventional treatment',
    body: "Coagulation, flocculation, sedimentation, filtration and disinfection at today's settings.",
    spec: 'Specification v1.1',
    chip: { label: 'Assumed values', tone: 'neutral' as const },
  },
  {
    id: 'pax-silica',
    icon: Droplet,
    title: 'Pax Silica intervention',
    body: 'Prospective treatment step with lower mixer power and coagulant demand.',
    spec: 'Specification v0.4',
    chip: { label: 'Unverified', tone: 'warn' as const },
  },
] as const;

const PROCESS_UNITS = [
  {
    unit: 'Raw-water and transfer pumping',
    modeled: true,
    estimate: 'Electricity from pump power × duty hours',
  },
  {
    unit: 'Coagulant dosing and mixing',
    modeled: true,
    estimate: 'Mixer electricity, coagulant use and cost',
  },
  { unit: 'Sedimentation', modeled: false, estimate: 'No energy data in this version' },
  { unit: 'Filtration', modeled: false, estimate: 'No energy data in this version' },
  { unit: 'Disinfection', modeled: false, estimate: 'No energy data in this version' },
];

const EVIDENCE_LABELS = [
  {
    label: 'Sample data',
    tone: 'mint' as const,
    body: 'From the sample plant dataset used in this prototype.',
  },
  { label: 'Assumed', tone: 'neutral' as const, body: 'A value your team chose; not measured.' },
  {
    label: 'Externally sourced',
    tone: 'info' as const,
    body: 'From a cited publication, such as a DOE grid factor.',
  },
  { label: 'Unverified', tone: 'warn' as const, body: 'Not yet confirmed by a technical source.' },
];

const SETUP_CHECKS = [
  { ok: true, text: 'Name and type set' },
  { ok: true, text: 'Completed baseline selected' },
  { ok: false, text: 'Unverified specification · allowed, will be labeled' },
];

const AUTOSAVED_AT = ['10:04', '10:06', '10:08', '10:11'];

function SelectControl({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-pv-input-border bg-white pl-3 pr-10 text-[14px] leading-5 text-pv-ink outline-none focus:border-pv-teal"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-pv-ink"
        aria-hidden="true"
      />
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={clsx(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
        selected ? 'border-pv-teal bg-white' : 'border-[#767676] bg-white',
      )}
      aria-hidden="true"
    >
      {selected && <span className="h-3 w-3 rounded-full bg-pv-teal" />}
    </span>
  );
}

export default function ScenariosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = import.meta.env.DEV ? searchParams.get('preview') : null;
  const run = useRunState();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Pax Silica pilot');
  const [compareId, setCompareId] = useState('r-0139');
  const [scenarioType, setScenarioType] = useState<'baseline' | 'intervention'>('intervention');
  const [datasetId, setDatasetId] = useState('obs-v1.2');
  const [description, setDescription] = useState(
    'Pilot of the Pax Silica treatment step at current flow and pumping. Check mixer power and coagulant demand against the unverified specification.',
  );
  const [treatmentId, setTreatmentId] = useState<'conventional' | 'pax-silica'>('pax-silica');

  const clearPreview = () => {
    if (preview === null) return;
    const next = new URLSearchParams(searchParams);
    next.delete('preview');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page head */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] leading-4">
          <Link to="/scenarios" className="text-pv-teal hover:underline">
            Simulations
          </Link>
          <span className="text-pv-muted">/</span>
          <span className="text-pv-muted">Pax Silica pilot</span>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">
              {step === 4 ? 'Review and run' : 'Set up simulation'}
            </h1>
            <span className="inline-flex h-6 items-center rounded-full bg-pv-chip px-2 text-[12px] font-medium leading-4 text-pv-muted">
              Draft · revision 1
            </span>
            <span className="text-[12px] leading-4 text-pv-muted">
              Autosaved {AUTOSAVED_AT[step - 1]}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button type="button" onClick={() => navigate('/')} className={btnGhost}>
              Cancel
            </button>
            <button type="button" className={btnSecondary}>
              Save draft
            </button>
          </div>
        </div>
      </div>

      {/* Setup steps */}
      <nav
        aria-label="Setup steps"
        className="rounded-xl border border-pv-divider bg-white px-6 pb-4 pt-6 shadow-pv-card"
      >
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {WIZARD_STEPS.map((item, index) => {
            const number = index + 1;
            const current = step === number;
            const done = number < step;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setStep(number)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={clsx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold leading-5',
                      current && 'bg-pv-teal text-white',
                      done && 'bg-pv-mint',
                      !current && !done && 'border-2 border-pv-border-soft bg-white text-pv-muted',
                    )}
                  >
                    {done ? (
                      <Check size={18} className="text-pv-forest" aria-hidden="true" />
                    ) : (
                      number
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[12px] leading-4 text-pv-muted">
                      {current
                        ? `Step ${number} · current`
                        : done
                          ? `Step ${number} · done`
                          : `Step ${number}`}
                    </span>
                    <span
                      className={clsx(
                        'text-[14px] leading-5 text-pv-ink',
                        current ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 1 ? (
        <>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main column */}
          <div className="flex flex-col gap-6">
            <SectionCard>
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  Scenario details
                </h2>
                <p className="text-[14px] leading-5 text-pv-muted">
                  Name the scenario and choose what it&apos;s compared with.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <FieldLabel>Scenario name</FieldLabel>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 w-full rounded-lg border border-pv-input-border bg-white px-3 text-[14px] leading-5 text-pv-ink outline-none focus:border-pv-teal"
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Compare against</FieldLabel>
                  <SelectControl
                    label="Compare against"
                    value={compareId}
                    onChange={setCompareId}
                    options={COMPARE_OPTIONS}
                  />
                  <p className="text-[12px] leading-4 text-pv-muted">
                    Comparisons need the same volume, period and grid factor.
                  </p>
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="pb-2 text-[12px] font-medium leading-4 text-pv-ink">
                  Scenario type
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SCENARIO_TYPES.map((option) => {
                    const selected = scenarioType === option.id;
                    return (
                      <label
                        key={option.id}
                        className={clsx(
                          'flex cursor-pointer gap-3 rounded-xl p-4 transition-colors',
                          selected
                            ? 'border-2 border-pv-teal bg-pv-run-bg'
                            : 'border border-pv-border-soft bg-white hover:border-pv-input-border',
                        )}
                      >
                        <input
                          type="radio"
                          name="scenario-type"
                          value={option.id}
                          checked={selected}
                          onChange={() => setScenarioType(option.id)}
                          className="sr-only"
                        />
                        <RadioDot selected={selected} />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                            {option.title}
                          </span>
                          <span className="text-[14px] leading-5 text-pv-muted">{option.body}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Input dataset</FieldLabel>
                  <SelectControl
                    label="Input dataset"
                    value={datasetId}
                    onChange={setDatasetId}
                    options={DATASET_OPTIONS}
                  />
                  <p className="flex flex-wrap items-center gap-2 text-[12px] leading-4 text-pv-muted">
                    <Chip tone="mint">Sample data</Chip>
                    5 daily records · volume, pump and mixing hours
                  </p>
                </div>
                <label className="flex flex-col gap-2">
                  <FieldLabel>Description (optional)</FieldLabel>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="h-[88px] w-full resize-none rounded-lg border border-pv-input-border bg-white p-3 text-[14px] leading-5 text-pv-ink outline-none focus:border-pv-teal"
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                  Treatment process
                </h2>
                <p className="text-[14px] leading-5 text-pv-muted">
                  Choose the configuration the model uses. In this version, only pumping energy,
                  mixing energy and coagulant use are modeled.
                </p>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="pb-2 text-[12px] font-medium leading-4 text-pv-ink">
                  Treatment configuration
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {TREATMENTS.map((option) => {
                    const selected = treatmentId === option.id;
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.id}
                        className={clsx(
                          'flex cursor-pointer flex-col gap-3 rounded-xl p-5 transition-colors',
                          selected
                            ? 'border-2 border-pv-teal bg-pv-run-bg'
                            : 'border border-pv-border-soft bg-white hover:border-pv-input-border',
                        )}
                      >
                        <input
                          type="radio"
                          name="treatment-configuration"
                          value={option.id}
                          checked={selected}
                          onChange={() => setTreatmentId(option.id)}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-3">
                          <span
                            className={clsx(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              selected ? 'bg-pv-mint' : 'bg-pv-chip',
                            )}
                          >
                            <Icon
                              size={20}
                              className={selected ? 'text-pv-forest' : 'text-pv-ink'}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="ml-auto">
                            <RadioDot selected={selected} />
                          </span>
                        </span>
                        <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                          {option.title}
                        </span>
                        <span className="text-[14px] leading-5 text-pv-muted">{option.body}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] leading-4 text-pv-muted">{option.spec}</span>
                          <Chip tone={option.chip.tone} icon={option.chip.tone === 'warn'}>
                            {option.chip.label}
                          </Chip>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex gap-3 rounded-xl border border-pv-warn-border bg-pv-warn-bg p-4">
                <TriangleAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-pv-amber"
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-1">
                  <p className="text-[14px] font-semibold leading-5 text-pv-warn-ink">
                    Specification v0.4 is unverified
                  </p>
                  <p className="text-[14px] leading-5 text-pv-ink">
                    Its technical definition is waiting for a source review. You can run it, but
                    results will be labeled &ldquo;unverified specification&rdquo; and shouldn&apos;t
                    be read as expected plant performance.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-pv-divider">
                <div className="border-b border-pv-divider px-4 py-3 text-[14px] font-semibold leading-5 text-pv-ink">
                  Process units in this configuration
                </div>
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[37%]" />
                    <col className="w-[18%]" />
                    <col className="w-[45%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-pv-divider bg-pv-bg">
                      <th className="px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted">
                        In model v1
                      </th>
                      <th className="px-4 py-3 text-[12px] font-medium leading-4 text-pv-muted">
                        What&apos;s estimated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESS_UNITS.map((row) => (
                      <tr key={row.unit} className="border-b border-pv-hairline last:border-b-0">
                        <td className="px-4 py-3 text-[14px] font-medium leading-5 text-pv-ink">
                          {row.unit}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={row.modeled ? 'ok' : 'neutral'}>
                            {row.modeled ? 'Modeled' : 'Not modeled'}
                          </Chip>
                        </td>
                        <td
                          className={clsx(
                            'px-4 py-3 text-[14px] leading-5',
                            row.modeled ? 'text-pv-ink' : 'text-pv-muted',
                          )}
                        >
                          {row.estimate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Right rail */}
          <div className="flex flex-col gap-6">
            <SectionCard>
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                About this step
              </h2>
              <div className="flex flex-col gap-3">
                <p className="text-[14px] leading-5 text-pv-ink">
                  A scenario holds your assumptions. A run evaluates a frozen copy of them.
                </p>
                <p className="text-[14px] leading-5 text-pv-muted">
                  Editing a scenario after a run creates a new revision, so earlier results never
                  change.
                </p>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Evidence labels
              </h2>
              <p className="text-[14px] leading-5 text-pv-muted">
                Every input carries one, and it travels into results and reports.
              </p>
              <dl className="flex flex-col gap-3">
                {EVIDENCE_LABELS.map((item) => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <dt>
                      <Chip tone={item.tone}>{item.label}</Chip>
                    </dt>
                    <dd className="text-[12px] leading-4 text-pv-muted">{item.body}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            <SectionCard>
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Setup checks
              </h2>
              <ul className="flex flex-col gap-3">
                {SETUP_CHECKS.map((check) => (
                  <li key={check.text} className="flex items-start gap-2">
                    {check.ok ? (
                      <CircleCheck
                        size={18}
                        className="mt-0.5 shrink-0 text-pv-ev-green"
                        aria-hidden="true"
                      />
                    ) : (
                      <TriangleAlert
                        size={18}
                        className="mt-0.5 shrink-0 text-pv-amber"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-[14px] leading-5 text-pv-ink">{check.text}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>

        {/* Action bar (step 1) */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card">
          <button type="button" onClick={() => navigate('/')} className={btnGhost}>
            Cancel
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <button type="button" className={btnSecondary}>
              Save draft
            </button>
            <button type="button" onClick={() => setStep(2)} className={btnPrimary}>
              Continue to operating conditions
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        </>
      ) : step === 2 ? (
        <OperatingConditionsStep onBack={() => setStep(1)} onContinue={() => setStep(3)} />
      ) : step === 3 ? (
        <CostsEmissionStep onBack={() => setStep(2)} onContinue={() => setStep(4)} />
      ) : (
        <ReviewRunStep
          onBack={() => setStep(3)}
          onEdit={setStep}
          onRun={run ? foregroundRun : submitRun}
        />
      )}

      {!preview && run?.foreground && run.phase === 'running' && <RunProgressDialog />}
      {!preview && run?.foreground && run.phase === 'succeeded' && (
        <RunCompleteDialog
          onClose={dismissRun}
          onBackToDashboard={() => {
            dismissRun();
            navigate('/');
          }}
          onViewResults={() => {
            dismissRun();
            navigate('/results');
          }}
        />
      )}
      {!preview && run?.foreground && run.phase === 'failed' && (
        <RunFailedDialog onClose={dismissRun} onEditInputs={dismissRun} onRetry={retryRun} />
      )}

      {preview === 'complete' && (
        <RunCompleteDialog
          onClose={clearPreview}
          onBackToDashboard={() => {
            clearPreview();
            navigate('/');
          }}
          onViewResults={() => {
            clearPreview();
            navigate('/results');
          }}
        />
      )}
      {preview === 'failed' && (
        <RunFailedDialog
          onClose={clearPreview}
          onEditInputs={clearPreview}
          onRetry={() => {
            clearPreview();
            submitRun();
          }}
        />
      )}

      {import.meta.env.DEV && (
        <DevStatePreview
          options={[
            { value: 'complete', label: 'Completed run' },
            { value: 'failed', label: 'Failed run' },
          ]}
        />
      )}
    </div>
  );
}
