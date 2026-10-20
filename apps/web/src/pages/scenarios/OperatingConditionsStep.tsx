import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import {
  Chip,
  FieldLabel,
  SectionCard,
  TextInput,
  UnitInput,
  btnPrimary,
  btnSecondary,
} from './shared';

/* U04 · Setup 2 — Operating conditions (frame 28:2). Sample values and validation as shown in the design. */

const num = (value: string) => Number.parseFloat(value.replace(/,/g, '')) || 0;

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });

function CheckItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CircleCheck size={18} className="mt-0.5 shrink-0 text-pv-ev-green" aria-hidden="true" />
      ) : (
        <CircleX size={18} className="mt-0.5 shrink-0 text-pv-err-ink" aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">{children}</span>
    </li>
  );
}

export default function OperatingConditionsStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const [periodStart, setPeriodStart] = useState('1 Jan 2026');
  const [periodEnd, setPeriodEnd] = useState('5 Jan 2026');
  const [volume, setVolume] = useState('61,600');
  const [flow, setFlow] = useState('520');
  const [pumpDuty, setPumpDuty] = useState('112');
  const [mixingHours, setMixingHours] = useState('95');
  const [multiplier, setMultiplier] = useState('0.90');
  const [dose, setDose] = useState('2.8');
  const dutyInputRef = useRef<HTMLInputElement>(null);

  const volumeValue = num(volume);
  const flowValue = num(flow);
  const dutyValue = num(pumpDuty);
  const covered = flowValue * dutyValue;
  const coverageIssue = covered < volumeValue;
  const minHours = flowValue > 0 ? Math.ceil((volumeValue / flowValue) * 10) / 10 : 0;
  const coagulantKg = (num(dose) * volumeValue) / 1000;
  const sliderValue = Math.min(1, Math.max(0.6, num(multiplier)));

  const focusPumpDuty = () => {
    dutyInputRef.current?.focus();
    dutyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleContinue = () => {
    if (coverageIssue) {
      focusPumpDuty();
      return;
    }
    onContinue();
  };

  return (
    <div className="flex flex-col gap-6">
      {coverageIssue && (
        <div className="flex gap-3 rounded-xl border border-pv-err-border bg-pv-err-bg p-4">
          <CircleAlert size={20} className="mt-0.5 shrink-0 text-pv-err-ink" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold leading-5 text-pv-err-ink">
              Fix 1 issue before you continue
            </p>
            <p className="text-[14px] leading-5 text-pv-ink">
              <button
                type="button"
                onClick={focusPumpDuty}
                className="font-medium text-pv-teal underline underline-offset-2 transition-colors hover:text-pv-teal-hover"
              >
                Pump duty
              </button>
              {` is too short to treat the full ${fmt(volumeValue)} m³ volume at ${fmt(flowValue)} m³/h.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="flex gap-3 rounded-xl bg-pv-info-bg px-4 py-3">
            <Info size={20} className="mt-0.5 shrink-0 text-pv-info" aria-hidden="true" />
            <p className="text-[14px] leading-5 text-pv-ink">
              Values from the sample dataset are pre-filled. Supported ranges come from Pax Silica
              specification v0.4 (unverified).
            </p>
          </div>

          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Reporting period and volume
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <FieldLabel>Period start</FieldLabel>
                <TextInput value={periodStart} onChange={setPeriodStart} ariaLabel="Period start" />
              </label>
              <div className="flex flex-col gap-2">
                <FieldLabel>Period end</FieldLabel>
                <TextInput value={periodEnd} onChange={setPeriodEnd} ariaLabel="Period end" />
                <p className="text-[12px] leading-4 text-pv-muted">
                  5 days · 120 hours available · Asia/Manila
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Treated volume</FieldLabel>
                  <Chip tone="mint">Sample data</Chip>
                </div>
                <UnitInput
                  value={volume}
                  onChange={setVolume}
                  unit="m³"
                  ariaLabel="Treated volume"
                />
                <p className="text-[12px] leading-4 text-pv-muted">
                  Total water treated over the period, from sample dataset v1.2.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Pumping</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Flow rate</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput value={flow} onChange={setFlow} unit="m³/h" ariaLabel="Flow rate" />
                <p className="text-[12px] leading-4 text-pv-muted">
                  Supported 300–600 m³/h · treatment capacity 600 m³/h.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Pump duty</FieldLabel>
                  <Chip tone="mint">Sample data</Chip>
                </div>
                <UnitInput
                  ref={dutyInputRef}
                  value={pumpDuty}
                  onChange={setPumpDuty}
                  unit="h"
                  ariaLabel="Pump duty"
                  invalid={coverageIssue}
                />
                {coverageIssue ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <CircleAlert
                        size={16}
                        className="mt-0.5 shrink-0 text-pv-err-ink"
                        aria-hidden="true"
                      />
                      <p className="text-[12px] leading-4 text-pv-err-ink">
                        {`${fmt(flowValue)} m³/h × ${fmt(dutyValue)} h = ${fmt(covered)} m³, which is below the ${fmt(volumeValue)} m³ volume. Use at least ${minHours.toFixed(1)} h or raise the flow rate.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPumpDuty('120')}
                      className={clsx(btnSecondary, 'self-start')}
                    >
                      Use 120 hours (full period)
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] leading-4 text-pv-muted">
                    {`Covers the full ${fmt(volumeValue)} m³ at ${fmt(flowValue)} m³/h.`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Pump power</FieldLabel>
                  <span className="text-[12px] font-medium leading-4 text-pv-muted">
                    Assumed · spec v1.1
                  </span>
                </div>
                <UnitInput value="165" unit="kW" ariaLabel="Pump power" readOnly />
                <p className="text-[12px] leading-4 text-pv-muted">
                  Set by the specification. Change it in the treatment spec, not here.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Mixing</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Mixing hours</FieldLabel>
                  <Chip tone="mint">Sample data</Chip>
                </div>
                <UnitInput
                  value={mixingHours}
                  onChange={setMixingHours}
                  unit="h"
                  ariaLabel="Mixing hours"
                />
                <p className="text-[12px] leading-4 text-pv-muted">At most 120 h in this period.</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Mixing load multiplier</FieldLabel>
                  <Chip tone="warn">Unverified · spec v0.4</Chip>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0.6}
                    max={1}
                    step={0.01}
                    value={sliderValue}
                    onChange={(event) => setMultiplier(Number(event.target.value).toFixed(2))}
                    aria-label="Mixing load multiplier slider"
                    className="h-11 min-w-0 flex-1 accent-pv-teal"
                  />
                  <TextInput
                    value={multiplier}
                    onChange={setMultiplier}
                    ariaLabel="Mixing load multiplier"
                    className="w-24 shrink-0"
                  />
                </div>
                <p className="text-[12px] leading-4 text-pv-muted">
                  Supported 0.60–1.00. 1.00 = rated mixer power (38 kW in spec v0.4).
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Chemical dosing</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Coagulant dose</FieldLabel>
                  <Chip tone="warn">Unverified · spec v0.4</Chip>
                </div>
                <UnitInput value={dose} onChange={setDose} unit="mg/L" ariaLabel="Coagulant dose" />
                <p className="text-[12px] leading-4 text-pv-muted">
                  Supported 1.5–4.5 mg/L. Changes chemical use and cost; water-quality effects
                  aren&apos;t modeled.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Coagulant needed</FieldLabel>
                <p>
                  <span className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                    {coagulantKg.toFixed(1)} kg
                  </span>{' '}
                  <span className="text-[12px] leading-4 text-pv-muted">for the period</span>
                </p>
                <p className="text-[12px] leading-4 text-pv-muted">
                  {dose} mg/L × {fmt(volumeValue)} m³ ÷ 1,000. Derived from your inputs — not a
                  result.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Setup checks</h2>
            {coverageIssue ? (
              <Chip tone="err">1 issue to fix</Chip>
            ) : (
              <Chip tone="ok">All checks pass</Chip>
            )}
            <ul className="flex flex-col gap-3">
              <CheckItem ok>
                <span className="text-[14px] leading-5 text-pv-ink">
                  Period is 365 days or less{' '}
                  <span className="text-[12px] leading-4 text-pv-muted">(5 days)</span>
                </span>
              </CheckItem>
              <CheckItem ok>
                <span className="text-[14px] leading-5 text-pv-ink">
                  Equipment hours fit the period{' '}
                  <span className="text-[12px] leading-4 text-pv-muted">(≤ 120 h)</span>
                </span>
              </CheckItem>
              <CheckItem ok={!coverageIssue}>
                <span
                  className={clsx(
                    'text-[14px] leading-5',
                    coverageIssue ? 'font-semibold text-pv-err-ink' : 'text-pv-ink',
                  )}
                >
                  Flow × pump hours covers the volume
                </span>
                <span className="text-[12px] leading-4 text-pv-muted">
                  {fmt(covered)} of {fmt(volumeValue)} m³
                </span>
              </CheckItem>
              <CheckItem ok>
                <span className="text-[14px] leading-5 text-pv-ink">
                  Flow is within capacity{' '}
                  <span className="text-[12px] leading-4 text-pv-muted">
                    ({fmt(flowValue)} of 600 m³/h)
                  </span>
                </span>
              </CheckItem>
              <CheckItem ok>
                <span className="text-[14px] leading-5 text-pv-ink">
                  Inputs are within supported ranges
                </span>
              </CheckItem>
            </ul>
            <p className="text-[12px] leading-4 text-pv-muted">
              These are the same checks the server runs before a simulation starts.
            </p>
          </SectionCard>

          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Where values come from
            </h2>
            <p className="text-[14px] leading-5 text-pv-muted">
              Sample data fills period, volume and hours. Ranges and mixer values come from the
              unverified Pax Silica specification. Change a value and its label becomes{' '}
              <span className="inline-flex align-middle">
                <Chip tone="neutral">Assumed</Chip>
              </span>
              .
            </p>
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-pv-divider bg-white px-6 py-4 shadow-pv-card">
        <button type="button" onClick={onBack} className={btnSecondary}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          {coverageIssue && (
            <span className="text-[12px] leading-4 text-pv-err-ink">
              Fix the highlighted field to continue.
            </span>
          )}
          <button type="button" className={btnSecondary}>
            Save draft
          </button>
          <button type="button" onClick={handleContinue} className={btnPrimary}>
            Continue to costs
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
