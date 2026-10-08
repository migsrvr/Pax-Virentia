export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" aria-label="Pax Virentia">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        role="img"
        aria-label="Pax Virentia brandmark"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="9" fill="#135D66" />
        {/* Water-flow P: stem + two flow lines forming bowl */}
        <path
          d="M13 27 V9"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M13 11 C 19 11, 23.5 12.5, 23.5 16 C 23.5 19.5, 19 20.8, 13.5 20.8"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M15.5 23.5 C 18.5 23.5, 20.5 24.6, 21.5 26.5"
          fill="none"
          stroke="#9FD3D1"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <div className="font-heading font-bold text-[17px] text-slate-ink">Pax Virentia</div>
          <div className="text-[11.5px] text-slate-ink-light tracking-wide">
            Water-treatment scenario analysis
          </div>
        </div>
      )}
    </div>
  );
}
