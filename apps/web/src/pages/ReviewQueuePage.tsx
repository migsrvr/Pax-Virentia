import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { useAuth } from '../services/auth';
import { canReview } from '../services/roles';
import { STATUS_LABELS, STATUS_TONES, decidePublication, getPublication, listPublications } from '../services/publications';
import type { Publication, PublicationStatus, PublicSnapshot } from '../services/publications';
import { errorMessage, format, label } from '../services/simulation';
import StatusBadge from '../components/common/StatusBadge';
import { Chip, SectionCard, btnDanger, btnPrimary, btnSecondary } from './scenarios/shared';

type Action = 'approve' | 'reject' | 'withdraw';

const ACTION_TEXT: Record<Action, { button: string; pending: string; reasonLabel: string; required: boolean }> = {
  approve: { button: 'Approve and publish', pending: 'Publishing…', reasonLabel: 'Review note (optional)', required: false },
  reject: { button: 'Reject', pending: 'Rejecting…', reasonLabel: 'Reason for rejection (required)', required: true },
  withdraw: { button: 'Withdraw', pending: 'Withdrawing…', reasonLabel: 'Reason for withdrawal (required)', required: true },
};

const when = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

function SnapshotPreview({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[14px] font-semibold text-pv-ink">Exact public payload</h3>
      <table className="w-full text-left text-[14px]">
        <caption className="sr-only">Metrics that will appear publicly</caption>
        <thead>
          <tr className="text-[12px] text-pv-muted">
            <th scope="col" className="py-2 font-medium">Metric</th>
            <th scope="col" className="py-2 text-right font-medium">Value</th>
            <th scope="col" className="py-2 pl-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.metrics.map((metric) => (
            <tr key={metric.key} className="border-t border-pv-hairline">
              <th scope="row" className="py-2 font-normal">{label(metric.key)}</th>
              <td className="py-2 text-right tabular-nums">
                {metric.status === 'not_estimable' ? '—' : `${format(metric.value)} ${metric.unit ?? ''}`}
              </td>
              <td className="py-2 pl-4"><StatusBadge status={metric.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-pv-muted">
        Boundary: {format(snapshot.boundary.volume_m3)} m³ · {snapshot.boundary.period_start ?? '—'} to{' '}
        {snapshot.boundary.period_end ?? '—'} · technology evidence {snapshot.provenance.technology_evidence_status ?? 'unverified'}
      </p>
      {snapshot.limitations.length ? (
        <ul className="list-disc space-y-1 pl-5 text-[12px] text-pv-muted">
          {snapshot.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ReviewItem({ item, own }: { item: Publication; own: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const detail = useQuery({
    queryKey: ['publication', item.id],
    queryFn: () => getPublication(item.id),
    enabled: showPreview,
  });
  const decide = useMutation({
    mutationFn: (action: Action) => decidePublication(item.id, action, reason.trim() || undefined),
    onSuccess: () => {
      setOpen(null);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['publications'] });
      void queryClient.invalidateQueries({ queryKey: ['publication', item.id] });
    },
  });
  const actions: Action[] = item.status === 'pending_review' ? ['approve', 'reject'] : item.status === 'published' ? ['withdraw'] : [];
  const text = open ? ACTION_TEXT[open] : null;
  const reasonMissing = !!text?.required && !reason.trim();

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-pv-divider p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-pv-ink">{item.title}</h3>
          <p className="text-[12px] text-pv-muted">
            Submitted by {item.submitted_by_name ?? 'an analyst'} · {when(item.submitted_at)} · run {item.run_id}
          </p>
          {item.reviewed_at ? (
            <p className="text-[12px] text-pv-muted">
              {item.status === 'rejected' ? 'Rejected' : 'Approved'} by {item.reviewed_by_name ?? 'a reviewer'} · {when(item.reviewed_at)}
              {item.decision_reason ? ` · “${item.decision_reason}”` : ''}
            </p>
          ) : null}
          {item.withdrawn_at ? (
            <p className="text-[12px] text-pv-muted">
              Withdrawn by {item.withdrawn_by_name ?? 'a reviewer'} · {when(item.withdrawn_at)} · “{item.withdrawal_reason}”
            </p>
          ) : null}
        </div>
        <Chip tone={STATUS_TONES[item.status]}>{STATUS_LABELS[item.status]}</Chip>
      </div>
      {item.summary ? <p className="text-[14px] text-pv-ink">{item.summary}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnSecondary} aria-expanded={showPreview} onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Hide public preview' : 'Preview public payload'}
        </button>
        <Link to={`/results?runId=${encodeURIComponent(item.run_id)}`} className={btnSecondary}>Open run</Link>
        {item.status === 'published' ? <Link to={item.public_path} className={btnSecondary}>View public page</Link> : null}
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={action === 'approve' ? btnPrimary : btnDanger}
            disabled={(own && action !== 'withdraw') || decide.isPending}
            onClick={() => { setOpen(action); decide.reset(); }}
          >
            {ACTION_TEXT[action].button}
          </button>
        ))}
      </div>
      {own && item.status === 'pending_review' ? (
        <p className="text-[12px] text-pv-muted">You submitted this snapshot, so another reviewer must decide on it.</p>
      ) : null}

      {showPreview ? (
        detail.isPending ? <p role="status">Loading the public payload…</p>
          : detail.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(detail.error)}</p>
          : detail.data.snapshot_data ? <SnapshotPreview snapshot={detail.data.snapshot_data} /> : null
      ) : null}

      {open && text ? (
        <form
          className="flex flex-col gap-3 rounded-lg bg-pv-bg p-4"
          onSubmit={(event) => { event.preventDefault(); if (!reasonMissing) decide.mutate(open); }}
        >
          <label className="flex flex-col gap-2 text-[14px] text-pv-ink">
            {text.reasonLabel}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={2000}
              required={text.required}
              className="rounded-lg border border-pv-input-border bg-white p-3 focus:outline-pv-teal"
            />
          </label>
          {open === 'approve' ? (
            <p className="text-[12px] text-pv-muted">
              Approval makes this snapshot public immediately. It is not a regulatory approval.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={(open === 'approve' ? btnPrimary : btnDanger) + ' disabled:opacity-50'} disabled={reasonMissing || decide.isPending}>
              {decide.isPending ? text.pending : `Confirm: ${text.button.toLowerCase()}`}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setOpen(null)}>Cancel</button>
          </div>
          {decide.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(decide.error)}</p> : null}
        </form>
      ) : null}
    </li>
  );
}

const TABS: { status: PublicationStatus; title: string; empty: string }[] = [
  { status: 'pending_review', title: 'Awaiting review', empty: 'No snapshots are waiting for review.' },
  { status: 'published', title: 'Published', empty: 'Nothing is published on the public portal.' },
  { status: 'rejected', title: 'Rejected', empty: 'No rejected snapshots.' },
  { status: 'withdrawn', title: 'Withdrawn', empty: 'No withdrawn snapshots.' },
];

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<PublicationStatus>('pending_review');
  const list = useQuery({
    queryKey: ['publications', 'status', tab],
    queryFn: () => listPublications({ status: tab }),
    enabled: canReview(user),
  });
  const current = TABS.find((item) => item.status === tab)!;

  if (!canReview(user)) {
    return (
      <SectionCard>
        <h1 className="text-[24px] font-semibold text-pv-ink">Publication reviews</h1>
        <p className="text-[14px] text-pv-muted">Only reviewers and administrators can approve, reject or withdraw public snapshots.</p>
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-pv-ink">
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="flex items-center gap-2 text-[28px] font-semibold tracking-tight">
          <ClipboardCheck size={28} className="text-pv-teal" aria-hidden="true" /> Publication reviews
        </h1>
        <p className="text-[14px] text-pv-muted">
          Check each redacted snapshot against its run, evidence and limitations before it reaches the public portal.
          Every decision is recorded in the audit trail.
        </p>
      </div>
      <nav aria-label="Publication status" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button key={item.status} type="button" aria-current={tab === item.status ? 'page' : undefined}
            className={tab === item.status ? btnPrimary : btnSecondary} onClick={() => setTab(item.status)}>
            {item.title}
          </button>
        ))}
      </nav>
      <SectionCard className="gap-4">
        <h2 className="text-[18px] font-semibold">{current.title}</h2>
        {list.isPending ? <p role="status">Loading publications…</p>
          : list.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(list.error)}</p>
          : list.data.length === 0 ? <p className="text-[14px] text-pv-muted">{current.empty}</p>
          : (
            <ul className="flex flex-col gap-4">
              {list.data.map((item) => <ReviewItem key={item.id} item={item} own={item.submitted_by === user?.id} />)}
            </ul>
          )}
      </SectionCard>
    </div>
  );
}
