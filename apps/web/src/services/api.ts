export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldError[];
  details: Record<string, unknown> | null;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: FieldError[] = [],
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

const CSRF_KEY = 'pv-csrf';
let memoryCsrf: string | null = null;

/** The session's CSRF token. sessionStorage may be unavailable, so memory is authoritative. */
export const csrfStore = {
  get(): string | null {
    if (memoryCsrf) return memoryCsrf;
    try {
      memoryCsrf = sessionStorage.getItem(CSRF_KEY);
    } catch {
      memoryCsrf = null;
    }
    return memoryCsrf;
  },
  set(token: string | null) {
    memoryCsrf = token;
    try {
      if (token) sessionStorage.setItem(CSRF_KEY, token);
      else sessionStorage.removeItem(CSRF_KEY);
    } catch {
      // Storage can be blocked (private windows); the in-memory token still works.
    }
  },
};

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function errorFrom(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null);
  const detail = payload?.error;
  return new ApiError(
    response.status,
    detail?.code ?? 'request_failed',
    detail?.message ?? 'The request could not be completed.',
    detail?.field_errors ?? [],
    detail?.details ?? null,
  );
}

let refreshing: Promise<string | null> | null = null;

/** Re-issue the session-derived CSRF token from the session cookie (one request at a time). */
export function refreshCsrf(): Promise<string | null> {
  refreshing ??= fetch(`${apiBaseUrl}/auth/session`, { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      const token = typeof payload?.csrf_token === 'string' ? payload.csrf_token : null;
      csrfStore.set(token);
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, init: RequestInit, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (
    init.body !== undefined &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const method = (init.method ?? 'GET').toUpperCase();
  if (WRITE_METHODS.includes(method)) {
    const csrf = csrfStore.get();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include', ...init, headers });
  if (!response.ok && response.status === 403 && WRITE_METHODS.includes(method) && !retried) {
    const error = await errorFrom(response.clone());
    // A restored browser or a new tab has the session cookie but no token yet.
    if (error.code === 'csrf_rejected' && (await refreshCsrf())) {
      return send(path, init, true);
    }
  }
  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return (await response.json().catch(() => null)) as T;
}

/** Fetch a generated file and hand it to the browser as a download. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await send(path, { method: 'GET' });
  if (!response.ok) throw await errorFrom(response);
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Open a generated file (e.g. an inline PDF) in a new tab. Pass a tab opened
 * synchronously in the click handler so popup blockers allow it.
 */
export async function openFile(path: string, preview: Window | null = window.open('', '_blank')): Promise<void> {
  try {
    const response = await send(path, { method: 'GET' });
    if (!response.ok) throw await errorFrom(response);
    const url = URL.createObjectURL(await response.blob());
    if (preview) preview.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, init: RequestInit = {}) =>
    request<T>(path, { ...init, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  /** POST a raw (non-JSON) body such as CSV text. */
  postRaw: <T>(path: string, body: BodyInit, contentType: string) =>
    request<T>(path, { method: 'POST', body, headers: { 'Content-Type': contentType } }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
