import type { SessionUser } from './auth';

/** Mirrors backend/app/api/dependencies.py ANALYST_ROLES / REVIEWER_ROLES (the server enforces them). */
export const canAnalyze = (user: SessionUser | null) =>
  user?.role === 'analyst' || user?.role === 'administrator';
export const canReview = (user: SessionUser | null) =>
  user?.role === 'reviewer' || user?.role === 'administrator';
