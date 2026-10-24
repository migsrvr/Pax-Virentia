import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Circle, CircleCheck, CircleX, FileText } from 'lucide-react';
import { useAuth } from '../../services/auth';
import { canAnalyze } from '../../services/roles';
import { STATUS_LABELS, STATUS_TONES, listPublications, submitPublication } from '../../services/publications';
import type { Publication } from '../../services/publications';
import { errorMessage } from '../../services/simulation';
import { safePublicText } from '../../services/text';
import { Chip, btnPrimary, btnSecondary } from '../../pages/scenarios/shared';

const safeTitle = (value: string) => safePublicText(value) || 'Scenario report';

function Steps({ publication }: { publication: Publication | undefined }) {
  const status = publication?.status;
  const steps = [
    { title: 'Redacted', desc: 'Only allowlisted results, units and limitations are copied', done: !!publication },
    {
      title: 'Reviewer decision',
      desc: status === 'rejected'
        ? `Rejected${publication?.reviewed_by_name ? ` by ${publication.reviewed_by_name}` : ''}`
        : status === 'pending_review' ? 'Waiting for a reviewer other than the submitter' : 'A reviewer approves or rejects with a reason',
      done: status === 'published' || status === 'withdrawn',
      failed: status === 'rejected',
    },
    {
      title: status === 'withdrawn' ? 'Withdrawn' : 'Published',
      desc: status === 'withdrawn' ? 'Public access has been removed' : 'Appears on the public portal with its limitations',
      done: status === 'published',
      failed: status === 'withdrawn',
    },
  ];
  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {steps.map((step) => (
        <li key={step.title} className="flex gap-3 rounded-xl bg-pv-bg p-4">
          {step.failed ? (
            <CircleX size={20} className="mt-0.5 shrink-0 text-pv-err-ink" aria-hidden="true" />
          ) : step.done ? (
            <CircleCheck size={20} className="mt-0.5 shrink-0 text-pv-ev-green" aria-hidden="true" />
          ) : (
            <Circle size={20} className="mt-0.5 shrink-0 text-pv-input-border" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <span className="block text-[14px] font-semibold leading-5 text-pv-ink">{step.title}</span>
            <span className="block text-[12px] leading-4 text-pv-muted">{step.desc}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Submit a run's redacted public snapshot for review and show its real workflow status. */
export default function PublicationPanel({ runId, defaultTitle }: { runId: string | undefined; defaultTitle: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState('');
  const history = useQuery({
    queryKey: ['publications', 'run', runId],
    queryFn: () => listPublications({ runId }),
    enabled: !!runId,
  });
  const submit = useMutation({
    mutationFn: () => submitPublication({
      run_id: runId!,
      title: safeTitle(defaultTitle),
      summary: summary.trim() || undefined,
    }),
    onSuccess: () => {
      setSummary('');
      void queryClient.invalidateQueries({ queryKey: ['publications'] });
    },
  });
  const latest = history.data?.[0];
  const canSubmit = canAnalyze(user) && !!runId && latest?.status !== 'pending_review';

  return (
    <section
      aria-label="Public snapshot"
      className="flex flex-col gap-4 rounded-xl border border-pv-divider bg-white p-6 shadow-pv-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px] font-semibold leading-[26px] text-pv-ink">Public snapshot</h2>
          <p className="text-[14px] leading-5 text-pv-muted">
            A reviewed, redacted copy of this run’s results for the public portal. Submitting does not
            publish anything until a reviewer approves it.
          </p>
        </div>
        {latest ? <Chip tone={STATUS_TONES[latest.status]}>{STATUS_LABELS[latest.status]}</Chip> : null}
      </div>

      {!runId ? (
        <p className="text-[14px] text-pv-muted">Choose a completed run to prepare a public snapshot.</p>
      ) : history.isPending ? (
        <p role="status" className="text-[14px] text-pv-muted">Loading publication status…</p>
      ) : history.isError ? (
        <p role="alert" className="text-pv-err-ink">{errorMessage(history.error)}</p>
      ) : (
        <>
          <Steps publication={latest} />
          {latest?.status === 'rejected' && latest.decision_reason ? (
            <p className="rounded-lg bg-pv-err-bg px-4 py-3 text-[14px] text-pv-err-ink">
              Reviewer’s reason: {latest.decision_reason}
            </p>
          ) : null}
          {latest?.status === 'withdrawn' && latest.withdrawal_reason ? (
            <p className="rounded-lg bg-pv-bg px-4 py-3 text-[14px] text-pv-muted">
              Withdrawn: {latest.withdrawal_reason}
            </p>
          ) : null}
          {canSubmit ? (
            <label className="flex flex-col gap-2 text-[14px] text-pv-ink">
              Public summary (optional)
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
                maxLength={2000}
                className="rounded-lg border border-pv-input-border p-3 focus:outline-pv-teal"
              />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[12px] leading-4 text-pv-muted">
              Publishing isn’t a regulatory approval. Reviewers and administrators can withdraw a published snapshot.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {latest?.status === 'published' ? (
                <Link to={latest.public_path} className={btnSecondary}>
                  View public page
                </Link>
              ) : null}
              {canSubmit ? (
                <button
                  type="button"
                  className={btnPrimary + ' disabled:opacity-50'}
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  <FileText size={18} aria-hidden="true" />
                  {submit.isPending ? 'Submitting…' : latest ? 'Submit a new version for review' : 'Submit for review'}
                </button>
              ) : null}
            </div>
          </div>
          {submit.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(submit.error)}</p> : null}
          {submit.isSuccess ? (
            <p role="status" className="text-[14px] text-pv-ok-ink">
              Submitted “{submit.data.title}” for review. It stays private until a reviewer approves it.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
