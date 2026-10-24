import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AuthProvider } from '../services/auth';
import type { SessionUser } from '../services/auth';

export type Call = { method: string; path: string; body: unknown; headers: Headers };
type Reply = { status?: number; body?: unknown; headers?: Record<string, string>; raw?: BodyInit };
type Handler = Reply | ((call: Call) => Reply);
type RouteSpec = [method: string, path: string | RegExp, handler: Handler];

/** Replace fetch with a small router over /api/v1 paths; returns the recorded calls. */
export function mockApi(routes: RouteSpec[]) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^\/api\/v1/, '') + url.search;
    const method = (init.method ?? 'GET').toUpperCase();
    let body: unknown = init.body;
    if (typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    }
    const call = { method, path, body, headers: new Headers(init.headers) };
    calls.push(call);
    const route = routes.find(([m, p]) => m === method && (typeof p === 'string' ? p === path || p === url.pathname.replace(/^\/api\/v1/, '') : p.test(path)));
    if (!route) return new Response(JSON.stringify({ error: { code: 'not_mocked', message: `${method} ${path} not mocked` } }), { status: 599 });
    const reply = typeof route[2] === 'function' ? route[2](call) : route[2];
    const status = reply.status ?? 200;
    if (status === 204) return new Response(null, { status });
    return new Response(reply.raw ?? JSON.stringify(reply.body ?? {}), {
      status, headers: { 'Content-Type': 'application/json', ...(reply.headers ?? {}) },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

export const analyst: SessionUser = { id: 'u-analyst', email: 'analyst@example.com', display_name: 'Ana Analyst', role: 'analyst' };
export const reviewer: SessionUser = { id: 'u-reviewer', email: 'reviewer@example.com', display_name: 'Rey Reviewer', role: 'reviewer' };

export const sessionRoute = (user: SessionUser | null, csrf = 'csrf-from-session'): RouteSpec =>
  ['GET', '/auth/session', user ? { body: { user, csrf_token: csrf } } : { status: 401, body: { error: { code: 'authentication_required' } } }];

export function renderApp(ui: ReactElement, { route = '/', path = '*' }: { route?: string; path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
