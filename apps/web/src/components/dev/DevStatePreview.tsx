import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { FlaskConical } from 'lucide-react';

/* Development-only preview bar. Rendered only when `import.meta.env.DEV` is
   true (see the pages that mount it), so the production build never shows or
   ships these controls. It forces interaction states for visual review via the
   `?preview=` parameter — states themselves are derived from data elsewhere. */

export type DevPreviewOption = { value: string; label: string };

export default function DevStatePreview({ options }: { options: DevPreviewOption[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get('preview');

  const setPreview = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete('preview');
    else next.set('preview', value);
    setSearchParams(next, { replace: true });
  };

  const buttonClass = (active: boolean) =>
    clsx(
      'inline-flex h-11 items-center rounded-lg px-3 text-[14px] font-semibold leading-5 transition-colors',
      active
        ? 'bg-pv-mint text-pv-forest hover:bg-white'
        : 'border border-pv-side-muted text-white hover:bg-pv-pine',
    );

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-dashed border-pv-side-muted bg-pv-forest py-2 pl-4 pr-2">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold leading-4 text-pv-mint">
        <FlaskConical size={14} aria-hidden="true" />
        Dev preview
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={current === option.value}
          onClick={() => setPreview(option.value)}
          className={buttonClass(current === option.value)}
        >
          {option.label}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={current === null}
        onClick={() => setPreview(null)}
        className={buttonClass(current === null)}
      >
        Live data
      </button>
    </div>
  );
}
