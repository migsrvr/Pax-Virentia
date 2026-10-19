import { useSyncExternalStore } from 'react';

/* Run lifecycle store. The prototype has no calculation worker connected, so a
   local executor advances the documented job lifecycle (queued → running →
   succeeded). Dialog transitions are derived from this state; there are no
   manual "show complete / show failed" triggers in the UI. */

export type RunPhase = 'running' | 'succeeded' | 'failed';

export type RunState = {
  id: string;
  scenario: string;
  revision: number;
  attempt: number;
  phase: RunPhase;
  progress: number;
  foreground: boolean;
} | null;

const TICK_MS = 100;
const TOTAL_MS = 7000;
const PROGRESS_PER_TICK = (100 * TICK_MS) / TOTAL_MS;

let state: RunState = null;
let timer: number | undefined;
const listeners = new Set<() => void>();

function emit(next: RunState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RunState {
  return state;
}

export function useRunState(): RunState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function startAttempt(attempt: number): void {
  window.clearInterval(timer);
  emit({
    id: 'R-0142',
    scenario: 'Pax Silica pilot',
    revision: 1,
    attempt,
    phase: 'running',
    progress: 0,
    foreground: true,
  });
  timer = window.setInterval(() => {
    if (!state || state.phase !== 'running') {
      window.clearInterval(timer);
      return;
    }
    const progress = Math.min(100, state.progress + PROGRESS_PER_TICK);
    if (progress >= 100) {
      window.clearInterval(timer);
      emit({ ...state, progress: 100, phase: 'succeeded' });
    } else {
      emit({ ...state, progress });
    }
  }, TICK_MS);
}

export function submitRun(): void {
  startAttempt(1);
}

export function retryRun(): void {
  if (state) startAttempt(state.attempt + 1);
}

/* "Run in background" and Escape: the run keeps advancing, the dialog hides. */
export function backgroundRun(): void {
  if (state) emit({ ...state, foreground: false });
}

/* Opening the run view again, e.g. pressing "Run simulation" while a run lives. */
export function foregroundRun(): void {
  if (state) emit({ ...state, foreground: true });
}

/* "Cancel run": the job stops and nothing is kept. */
export function cancelRun(): void {
  window.clearInterval(timer);
  emit(null);
}

/* Closing a finished run's dialog ("Back to dashboard", "View results", "Edit inputs"). */
export function dismissRun(): void {
  window.clearInterval(timer);
  emit(null);
}
