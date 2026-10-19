import { Link } from 'react-router-dom';

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Methodology</h1>
        <p className="mt-1 text-sm leading-5 text-pv-muted">
          Evidence, factors and limitations behind every estimate.
        </p>
      </div>
      <section className="rounded-xl border border-pv-divider bg-white p-6">
        <h2 className="text-lg font-semibold leading-[26px] text-pv-ink">Scheduled for a later design pass</h2>
        <p className="mt-2 max-w-2xl text-sm leading-5 text-pv-muted">
          The full methodology — including the grid-factor assumption (DOE 2023 Luzon–Visayas carried
          forward to 2026) and the evidence gate for the ecological indicator — will be documented here.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-11 items-center rounded-lg border border-pv-border-soft bg-white px-4 text-sm font-semibold text-pv-ink transition-colors hover:bg-pv-bg"
        >
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
