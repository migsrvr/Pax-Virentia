import { forwardRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { TriangleAlert } from 'lucide-react';

export type ChipTone = 'mint' | 'neutral' | 'ok' | 'warn' | 'info' | 'err' | 'violet' | 'run';

const CHIP_STYLES: Record<ChipTone, string> = {
  mint: 'bg-pv-mint text-pv-forest',
  neutral: 'bg-pv-chip text-pv-muted',
  ok: 'bg-pv-ok-bg text-pv-ok-ink',
  warn: 'bg-pv-warn-bg text-pv-warn-ink',
  info: 'bg-pv-info-bg text-pv-info',
  err: 'bg-pv-err-bg text-pv-err-ink',
  violet: 'bg-pv-violet-bg text-pv-violet-ink',
  run: 'bg-pv-run-bg text-pv-run-ink',
};

export function Chip({
  tone,
  icon = false,
  leadingIcon,
  children,
}: {
  tone: ChipTone;
  icon?: boolean;
  leadingIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[12px] font-medium leading-4',
        CHIP_STYLES[tone],
      )}
    >
      {leadingIcon ?? (icon && tone === 'warn' && <TriangleAlert size={14} aria-hidden="true" />)}
      {children}
    </span>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        'flex flex-col rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card',
        className ?? 'gap-6',
      )}
    >
      {children}
    </section>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[12px] font-medium leading-4 text-pv-ink">{children}</span>;
}

export function RunDialog({
  labelledBy,
  widthClass,
  onClose,
  children,
}: {
  labelledBy: string;
  widthClass: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-pv-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={clsx(
          'mx-auto mb-8 mt-28 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-8 shadow-pv-dialog',
          widthClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type UnitInputProps = {
  value: string;
  onChange?: (value: string) => void;
  unit?: string;
  prefix?: string;
  ariaLabel: string;
  invalid?: boolean;
  readOnly?: boolean;
  inputMode?: 'decimal' | 'numeric' | 'text';
  className?: string;
};

export const UnitInput = forwardRef<HTMLInputElement, UnitInputProps>(function UnitInput(
  {
    value,
    onChange,
    unit,
    prefix,
    ariaLabel,
    invalid = false,
    readOnly = false,
    inputMode = 'decimal',
    className,
  },
  ref,
) {
  return (
    <div
      className={clsx(
        'flex h-11 overflow-hidden rounded-lg border',
        invalid
          ? 'border-2 border-pv-err-field bg-white'
          : readOnly
            ? 'border-pv-divider bg-pv-bg'
            : 'border-pv-input-border bg-white focus-within:border-pv-teal',
        className,
      )}
    >
      {prefix && (
        <span className="flex items-center border-r border-pv-divider bg-pv-bg px-3 text-[14px] leading-5 text-pv-muted">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        inputMode={inputMode}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 text-[14px] leading-5 text-pv-ink outline-none"
      />
      {unit && (
        <span className="flex items-center border-l border-pv-divider bg-pv-bg px-3 text-[14px] leading-5 text-pv-muted">
          {unit}
        </span>
      )}
    </div>
  );
});

export function TextInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        'h-11 rounded-lg border border-pv-input-border bg-white px-3 text-[14px] leading-5 text-pv-ink outline-none focus:border-pv-teal',
        className,
      )}
    />
  );
}

export const btnGhost =
  'inline-flex h-11 items-center rounded-lg px-4 text-[14px] font-semibold leading-5 text-pv-teal transition-colors hover:bg-pv-bg';

export const btnSecondary =
  'inline-flex h-11 items-center gap-2 rounded-lg border border-pv-border-soft bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-input-border';

export const btnPrimary =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-pv-teal px-4 text-[14px] font-semibold leading-5 text-white transition-colors hover:bg-pv-teal-hover';

export const btnDanger =
  'inline-flex h-11 items-center gap-2 rounded-lg border border-pv-err-field bg-white px-4 text-[14px] font-semibold leading-5 text-pv-err-ink transition-colors hover:bg-pv-err-bg';
