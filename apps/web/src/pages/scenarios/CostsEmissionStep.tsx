import { useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Info, TriangleAlert } from 'lucide-react';
import { Chip } from './shared';
import type { ChipTone } from './shared';
import { FieldLabel, SectionCard, UnitInput, btnPrimary, btnSecondary } from './shared';

/* U05 · Setup 3 — Costs and emission factor (frame 25:2). Sample values as shown in the design. */

type FactorOption = {
  id: string;
  title: string;
  value: string;
  desc?: string;
  chips: { label: string; tone: ChipTone }[];
  warn?: string;
  disabled?: boolean;
};

const GRID_FACTORS: FactorOption[] = [
  {
    id: 'lv-2026',
    title: 'Luzon–Visayas · 2026',
    value: '0.7122 kg CO₂e/kWh',
    desc: 'DOE 2023 operating-margin value, carried forward until a 2026 factor is published.',
    chips: [
      { label: 'Assumed', tone: 'neutral' },
      { label: 'Matches region and year', tone: 'ok' },
    ],
  },
  {
    id: 'lv-2023',
    title: 'Luzon–Visayas · 2023',
    value: '0.7122 kg CO₂e/kWh',
    chips: [{ label: 'Externally sourced · DOE', tone: 'info' }],
    warn: "The 2023 factor doesn't cover the 2026 reporting period, so this run can't use it.",
    disabled: true,
  },
  {
    id: 'ph-2023',
    title: 'Philippines national · 2023',
    value: '0.6850 kg CO₂e/kWh',
    chips: [{ label: 'Externally sourced · IEA', tone: 'info' }],
    warn: 'A different region and year from the plant.',
    disabled: true,
  },
];

const ASSUMPTION_REGISTER = [
  { label: 'Sample data', tone: 'mint' as const, count: '4 inputs' },
  { label: 'Assumed', tone: 'neutral' as const, count: '9 inputs' },
  { label: 'Unverified', tone: 'warn' as const, count: '3 inputs' },
  { label: 'Externally sourced', tone: 'info' as const, count: '0 inputs' },
  { label: 'Measured', tone: 'ok' as const, count: '0 inputs' },
];

export default function CostsEmissionStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const [tariff, setTariff] = useState('11.00');
  const [coagulantPrice, setCoagulantPrice] = useState('50.00');
  const [labor, setLabor] = useState('40,000');
  const [maintenance, setMaintenance] = useState('15,000');
  const [otherNonEnergy, setOtherNonEnergy] = useState('12,000');
  const [capital, setCapital] = useState('1,800,000');
  const [factorId, setFactorId] = useState('lv-2026');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Electricity and chemicals
              </h2>
              <p className="text-[14px] leading-5 text-pv-muted">
                Prices for the reporting period. Costs are in Philippine peso (PHP) only.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Electricity tariff</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput
                  prefix="₱"
                  value={tariff}
                  onChange={setTariff}
                  unit="per kWh"
                  ariaLabel="Electricity tariff"
                />
                <p className="text-[12px] leading-4 text-pv-muted">
                  One flat rate for the period. Time-of-use pricing isn&apos;t modeled.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Coagulant price</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput
                  prefix="₱"
                  value={coagulantPrice}
                  onChange={setCoagulantPrice}
                  unit="per kg"
                  ariaLabel="Coagulant price"
                />
                <p className="text-[12px] leading-4 text-pv-muted">
                  Delivered price of the coagulant.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Other costs for the period
              </h2>
              <p className="text-[14px] leading-5 text-pv-muted">
                Fixed amounts for 1–5 Jan 2026. Leave electricity out — it&apos;s calculated from
                energy × tariff.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Labor</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput
                  prefix="₱"
                  value={labor}
                  onChange={setLabor}
                  ariaLabel="Labor"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Maintenance</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput
                  prefix="₱"
                  value={maintenance}
                  onChange={setMaintenance}
                  ariaLabel="Maintenance"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Other non-energy</FieldLabel>
                  <Chip tone="neutral">Assumed</Chip>
                </div>
                <UnitInput
                  prefix="₱"
                  value={otherNonEnergy}
                  onChange={setOtherNonEnergy}
                  ariaLabel="Other non-energy"
                />
              </div>
            </div>
            <p className="text-[12px] leading-4 text-pv-muted">
              &ldquo;Other non-energy&rdquo; includes ₱6,000 of assumed Pax Silica material cost for
              the period.
            </p>
          </SectionCard>

          <SectionCard className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Grid emission factor
              </h2>
              <p className="text-[14px] leading-5 text-pv-muted">
                Converts electricity into CO₂e. It must match the plant&apos;s grid region and the
                reporting year.
              </p>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Grid emission factor</legend>
              {GRID_FACTORS.map((option) => {
                const selected = factorId === option.id;
                const disabled = option.disabled === true;
                return (
                  <label
                    key={option.id}
                    className={clsx(
                      'flex gap-3 rounded-xl p-4 transition-colors',
                      disabled
                        ? 'cursor-not-allowed border border-pv-divider bg-pv-bg'
                        : selected
                          ? 'cursor-pointer border-2 border-pv-teal bg-pv-run-bg'
                          : 'cursor-pointer border border-pv-border-soft bg-white hover:border-pv-input-border',
                    )}
                  >
                    <input
                      type="radio"
                      name="grid-factor"
                      value={option.id}
                      checked={selected}
                      disabled={disabled}
                      onChange={() => setFactorId(option.id)}
                      className="sr-only"
                    />
                    <span
                      className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        disabled
                          ? 'border-pv-disabled-border bg-pv-disabled-bg'
                          : selected
                            ? 'border-pv-teal bg-white'
                            : 'border-[#767676] bg-white',
                      )}
                      aria-hidden="true"
                    >
                      {selected && !disabled && (
                        <span className="h-3 w-3 rounded-full bg-pv-teal" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                          {option.title}
                        </span>
                        <span className="text-[14px] font-semibold leading-5 text-pv-ink">
                          {option.value}
                        </span>
                      </span>
                      {option.desc && (
                        <span className="text-[14px] leading-5 text-pv-muted">{option.desc}</span>
                      )}
                      {option.chips.length > 0 && (
                        <span className="flex flex-wrap items-center gap-2">
                          {option.chips.map((chip) => (
                            <Chip key={chip.label} tone={chip.tone}>
                              {chip.label}
                            </Chip>
                          ))}
                        </span>
                      )}
                      {option.warn && (
                        <span className="flex gap-1">
                          <TriangleAlert
                            size={16}
                            className="mt-0.5 shrink-0 text-pv-warn-ink"
                            aria-hidden="true"
                          />
                          <span className="text-[12px] leading-4 text-pv-warn-ink">
                            {option.warn}
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div className="flex gap-3 rounded-xl bg-pv-info-bg px-4 py-3">
              <Info size={20} className="mt-0.5 shrink-0 text-pv-info" aria-hidden="true" />
              <p className="text-[14px] leading-5 text-pv-ink">
                Boundary: electricity-associated emissions only. Chemical manufacturing, transport
                and process emissions aren&apos;t included.
              </p>
            </div>
          </SectionCard>

          <SectionCard className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
                Investment{' '}
                <span className="text-[14px] font-normal leading-5 text-pv-muted">(optional)</span>
              </h2>
              <p className="text-[14px] leading-5 text-pv-muted">
                Used only for an illustrative simple payback. It isn&apos;t part of the period&apos;s
                operating cost.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Incremental capital cost</FieldLabel>
                <Chip tone="neutral">Assumed</Chip>
              </div>
              <UnitInput
                prefix="₱"
                value={capital}
                onChange={setCapital}
                ariaLabel="Incremental capital cost"
                className="w-[351px] max-w-full"
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard className="gap-4">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              Assumption register
            </h2>
            <p className="text-[14px] leading-5 text-pv-muted">
              How the inputs in this scenario are supported. Each label appears next to its value in
              results and reports.
            </p>
            <dl className="flex flex-col gap-3">
              {ASSUMPTION_REGISTER.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <dt>
                    <Chip tone={item.tone}>{item.label}</Chip>
                  </dt>
                  <dd className="text-[14px] font-semibold leading-5 text-pv-ink">{item.count}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] leading-4 text-pv-muted">
              No input in this scenario is a plant measurement. Results will say so.
            </p>
          </SectionCard>

          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">
              How cost is calculated
            </h2>
            <p className="text-[14px] leading-5 text-pv-ink">
              Operating cost = electricity (kWh × tariff) + coagulant (kg × price) + labor +
              maintenance + other.
            </p>
            <p className="text-[12px] leading-4 text-pv-muted">
              Capital cost stays separate and is used only for simple payback.
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
          <button type="button" className={btnSecondary}>
            Save draft
          </button>
          <button type="button" onClick={onContinue} className={btnPrimary}>
            Continue to review
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
