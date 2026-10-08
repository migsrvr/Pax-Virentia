import { CURRENT_USER, WORKSPACE } from '../../services/mockData';

export default function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-slate-ink-border bg-white/80 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
        <div>
          <h1 className="font-heading text-[20px] font-bold leading-6 text-slate-ink">{title}</h1>
          <p className="mt-0.5 text-[13px] text-slate-ink-light">
            {subtitle ?? `${WORKSPACE.plant} · ${WORKSPACE.timezone}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[13px] font-bold text-slate-ink">{CURRENT_USER.name}</div>
            <div className="text-[12px] text-slate-ink-muted">{CURRENT_USER.email}</div>
          </div>
          <span
            className="rounded-full bg-river-teal-light px-3 py-1 text-[12.5px] font-bold text-river-teal"
            title="Application role — Analyst can prepare data, create scenarios, launch runs and export authorized reports."
          >
            {CURRENT_USER.role} · can edit
          </span>
        </div>
      </div>
    </header>
  );
}
