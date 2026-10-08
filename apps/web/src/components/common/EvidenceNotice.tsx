import { AlertTriangle, FileText } from 'lucide-react';

export default function EvidenceNotice({
  variant = 'limitation',
  title,
  body,
  sources,
}: {
  variant?: 'limitation' | 'attribution';
  title: string;
  body: string;
  sources?: string[];
}) {
  const isAmber = variant === 'limitation';
  return (
    <div
      role="note"
      aria-label={title}
      className={
        isAmber
          ? 'rounded-xl border border-evidence-amber-border bg-evidence-amber-light p-4'
          : 'rounded-xl border border-slate-ink-border bg-white p-4'
      }
    >
      <div className="flex gap-3">
        <span
          className={
            isAmber
              ? 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-evidence-amber/10 text-evidence-amber'
              : 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-river-teal'
          }
        >
          {isAmber ? <AlertTriangle size={17} /> : <FileText size={17} />}
        </span>
        <div>
          <div
            className={
              isAmber
                ? 'text-[14px] font-bold text-evidence-amber'
                : 'text-[14px] font-bold text-slate-ink'
            }
          >
            {title}
          </div>
          <p
            className={
              isAmber
                ? 'mt-0.5 text-[13.5px] leading-5 text-[#5c3d00]'
                : 'mt-0.5 text-[13.5px] leading-5 text-slate-ink-light'
            }
          >
            {body}
          </p>
          {sources && sources.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[12.5px] text-slate-ink-light">
              {sources.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
