import { describe, expect, it } from 'vitest';
import { api, ApiError, csrfStore } from './api';
import { getPublicReport } from './publications';
import { mockApi } from '../test/utils';

describe('CSRF recovery', () => {
  it('re-issues the token from the session and retries a rejected write once', async () => {
    csrfStore.set(null);
    let attempts = 0;
    const calls = mockApi([
      ['POST', '/scenarios', (call) => {
        attempts += 1;
        return call.headers.get('X-CSRF-Token') === 'restored-token'
          ? { status: 201, body: { id: 's1' } }
          : { status: 403, body: { error: { code: 'csrf_rejected', message: 'CSRF required.' } } };
      }],
      ['GET', '/auth/session', { body: { user: { id: 'u' }, csrf_token: 'restored-token' } }],
    ]);
    await expect(api.post('/scenarios', { name: 'x' })).resolves.toEqual({ id: 's1' });
    expect(attempts).toBe(2);
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(['POST /scenarios', 'GET /auth/session', 'POST /scenarios']);
    expect(csrfStore.get()).toBe('restored-token');
    expect(sessionStorage.getItem('pv-csrf')).toBe('restored-token');
  });

  it('does not loop when the refreshed token is still rejected', async () => {
    csrfStore.set('stale');
    const calls = mockApi([
      ['POST', '/scenarios', { status: 403, body: { error: { code: 'csrf_rejected', message: 'CSRF required.' } } }],
      ['GET', '/auth/session', { body: { user: { id: 'u' }, csrf_token: 'still-wrong' } }],
    ]);
    await expect(api.post('/scenarios', {})).rejects.toMatchObject({ status: 403, code: 'csrf_rejected' });
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(2);
  });

  it('does not retry other 403 errors or reads', async () => {
    csrfStore.set('token');
    const calls = mockApi([
      ['POST', '/publications/p/approve', { status: 403, body: { error: { code: 'self_review_forbidden', message: 'No.' } } }],
    ]);
    await expect(api.post('/publications/p/approve')).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.get('X-CSRF-Token')).toBe('token');
  });
});

describe('public report states', () => {
  it('maps 200, 410 tombstones and 404 to distinct states', async () => {
    mockApi([
      ['GET', '/public/reports/live', { body: { slug: 'live', title: 'Live', published_at: '2026-10-20T00:00:00Z' } }],
      ['GET', '/public/reports/gone', { status: 410, body: { error: { code: 'publication_withdrawn', message: 'Withdrawn',
        details: { slug: 'gone', title: 'Old', withdrawn_at: '2026-10-21T00:00:00Z', withdrawal_reason: 'Corrected' } } } }],
      ['GET', '/public/reports/missing', { status: 404, body: { error: { code: 'publication_not_found', message: 'Missing' } } }],
    ]);
    await expect(getPublicReport('live')).resolves.toMatchObject({ state: 'published', report: { title: 'Live' } });
    await expect(getPublicReport('gone')).resolves.toEqual({ state: 'withdrawn', tombstone: expect.objectContaining({ withdrawal_reason: 'Corrected' }) });
    await expect(getPublicReport('missing')).resolves.toEqual({ state: 'missing' });
  });
});
