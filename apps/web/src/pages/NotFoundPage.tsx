import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink">Page not found</h1>
        <p className="mt-1 text-sm leading-5 text-pv-muted">
          This page doesn't exist in the utility portal.
        </p>
      </div>
      <section className="rounded-xl border border-pv-divider bg-white p-6">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-lg border border-pv-border-soft bg-white px-4 text-sm font-semibold text-pv-ink transition-colors hover:bg-pv-bg"
        >
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
