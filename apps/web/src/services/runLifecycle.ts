import { useEffect, useRef, useSyncExternalStore } from 'react';
import { api } from './api';
import { errorMessage } from './simulation';
import type { Run } from './simulation';

export type RunPhase = 'submitting' | Run['status'];
export type RunState = {
  id: string; scenario: string; revision: number; revisionId: string; attempt: number;
  phase: RunPhase; foreground: boolean; error?: string; connectionError?: string; cancelRequested?: boolean;
} | null;
let state: RunState = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let submissionKey = '';
const listeners = new Set<() => void>();
function emit(next: RunState) { state = next; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRunState(): RunState { return useSyncExternalStore(subscribe, () => state, () => state); }
export function useRunDialogFocus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const controls = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    root?.addEventListener('keydown', trap);
    return () => { root?.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); };
  }, []);
  return ref;
}
const terminal = (phase: RunPhase) => ['succeeded', 'failed', 'cancelled'].includes(phase);
async function poll(runId: string, token: number): Promise<void> {
  try {
    const run = await api.get<Run>(`/runs/${encodeURIComponent(runId)}`);
    if (token !== generation || !state) return;
    emit({ ...state, phase: run.status, cancelRequested: run.cancel_requested,
      error: run.error?.message, connectionError: undefined });
  } catch (error) {
    if (token !== generation || !state) return;
    // A transport failure is not a failed scientific run. Check its durable state again.
    emit({ ...state, connectionError: errorMessage(error) });
  }
  if (token === generation && state && !terminal(state.phase)) {
    timer = setTimeout(() => { void poll(runId, token); }, 1500);
  }
}
export async function submitRun(revisionId: string, scenario: string, revision: number, attempt = 1, replayKey?: string): Promise<void> {
  if (state && !terminal(state.phase) && !state.error) { foregroundRun(); return; }
  clearTimeout(timer);
  const token = ++generation;
  submissionKey = replayKey ?? crypto.randomUUID();
  emit({ id: '', scenario, revision, revisionId, attempt, phase: 'submitting', foreground: true });
  try {
    const accepted = await api.post<{ run_id: string; status: Run['status'] }>('/runs', {
      scenario_revision_id: revisionId, requested_modules: ['energy', 'carbon', 'economics', 'ecology'],
    }, { headers: { 'Idempotency-Key': submissionKey } });
    if (token !== generation || !state) return;
    emit({ ...state, id: accepted.run_id, phase: accepted.status });
    if (!terminal(accepted.status)) void poll(accepted.run_id, token);
  } catch (error) {
    if (token === generation && state) emit({ ...state, phase: 'failed', error: errorMessage(error) });
  }
}
export function retryRun(): void {
  if (!state) return;
  void submitRun(state.revisionId, state.scenario, state.revision, state.attempt + 1, state.id ? undefined : submissionKey);
}
export function backgroundRun(): void { if (state) emit({ ...state, foreground: false }); }
export function foregroundRun(): void { if (state) emit({ ...state, foreground: true }); }
export async function cancelRun(): Promise<void> {
  if (!state?.id || terminal(state.phase)) return;
  const runId = state.id;
  try {
    const run = await api.post<Run>(`/runs/${encodeURIComponent(runId)}/cancel`);
    if (state?.id === runId) emit({ ...state, phase: run.status, cancelRequested: run.cancel_requested, connectionError: undefined });
  } catch (error) {
    if (state?.id === runId) emit({ ...state, connectionError: errorMessage(error) });
  }
}
export function dismissRun(): void {
  if (state && !terminal(state.phase)) { backgroundRun(); return; }
  clearTimeout(timer); generation++; emit(null);
}
