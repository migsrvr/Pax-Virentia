import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, csrfStore } from './api';

export type Role = 'analyst' | 'reviewer' | 'administrator';

export interface SessionUser {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role | string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  csrfToken: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(() => csrfStore.get());

  useEffect(() => {
    let active = true;
    api
      .get<{ user: SessionUser; csrf_token?: string }>('/auth/session')
      .then((payload) => {
        if (!active) return;
        setUser(payload.user);
        // The server re-derives the token from the session cookie, so a restored
        // browser or a new tab regains write access.
        if (payload.csrf_token) {
          csrfStore.set(payload.csrf_token);
          setCsrfToken(payload.csrf_token);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const payload = await api.post<{ user: SessionUser; csrf_token: string }>('/auth/login', {
      email,
      password,
      remember,
    });
    csrfStore.set(payload.csrf_token);
    setCsrfToken(payload.csrf_token);
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setCsrfToken(null);
      csrfStore.set(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, csrfToken, login, logout }),
    [user, loading, csrfToken, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-mist text-[14px] text-slate-ink-light">
        Checking your session…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
