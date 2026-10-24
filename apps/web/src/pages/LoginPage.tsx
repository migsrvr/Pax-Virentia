import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  FileCheck,
  GitCompareArrows,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import markLogo from '../assets/pax-virentia-mark.png';
import { ApiError } from '../services/api';
import { useAuth } from '../services/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MESSAGE = 'Enter a complete email address, like name@example.com.';
const PASSWORD_MESSAGE = 'Enter your password.';

const HIGHLIGHTS = [
  {
    icon: SlidersHorizontal,
    title: 'Set up scenarios',
    body: 'Treatment process, operating conditions and cost assumptions in one guided flow, with units and supported ranges.',
  },
  {
    icon: GitCompareArrows,
    title: 'Compare alternatives',
    body: 'Baseline and alternatives on the same volume, period and boundaries, with absolute and percentage differences.',
  },
  {
    icon: FileCheck,
    title: 'Share reviewed results',
    body: 'Export reports and publish reviewed snapshots to the public portal, with assumptions attached.',
  },
];

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (!loading && user) {
    return <Navigate to={from ?? '/'} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextEmailError = EMAIL_PATTERN.test(email.trim()) ? null : EMAIL_MESSAGE;
    const nextPasswordError = password ? null : PASSWORD_MESSAGE;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      (nextEmailError ? emailRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, remember);
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const emailField = err.fieldErrors.find((item) => item.field === 'email');
        const passwordField = err.fieldErrors.find((item) => item.field === 'password');
        if (emailField) setEmailError(emailField.message);
        if (passwordField) setPasswordError(passwordField.message);
        if (!emailField && !passwordField) {
          const details = err.fieldErrors.map((item) => item.message).join(' ');
          setFormError(details ? `${err.message} ${details}` : err.message);
        }
      } else {
        setFormError('The workspace API is unreachable. Start the backend and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fixList: { label: string; focus: () => void }[] = [];
  if (emailError) {
    fixList.push({ label: "Email address isn't complete", focus: () => emailRef.current?.focus() });
  }
  if (passwordError) {
    fixList.push({ label: 'Password is empty', focus: () => passwordRef.current?.focus() });
  }
  const alertVisible = fixList.length > 0 || formError !== null;

  return (
    <div className="grid min-h-screen bg-pv-bg lg:grid-cols-2">
      {/* Section - About Pax Virentia */}
      <section className="flex flex-col gap-8 bg-pv-mint px-6 py-8 sm:px-10 lg:p-12">
        <img
          src={markLogo}
          alt="Pax Virentia — water-drop leaf mark with wordmark"
          className="h-[144px] w-[150px] object-contain object-left"
        />

        <div className="flex max-w-[520px] flex-col gap-4">
          <span className="inline-flex h-6 w-fit items-center self-start rounded-full bg-white px-2 text-[12px] font-medium leading-4 text-pv-ink-strong">
            Utility portal
          </span>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-pv-ink-strong">
            Model treatment scenarios before you change operations
          </h1>
          <p className="text-[14px] leading-5 text-pv-ink">
            Compare simulated energy use, CO2e emissions and operating costs for your plant. Every
            result comes from an offline model and the assumptions you enter - so you can see the
            trade-offs before anything changes at the plant.
          </p>
        </div>

        <ul className="flex max-w-[520px] flex-col gap-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                <Icon size={20} className="text-pv-teal" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-5 text-pv-ink-strong">
                  {title}
                </span>
                <span className="block text-[14px] leading-5 text-pv-ink">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex max-w-[520px] gap-3 rounded-xl bg-white p-4">
          <Info size={20} className="mt-0.5 shrink-0 text-pv-info" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">
              Offline simulation platform
            </p>
            <p className="text-[14px] leading-5 text-pv-muted">
              No live plant monitoring, sensor feeds or plant integration. Results are simulated
              estimates, not measurements or validated findings.
            </p>
          </div>
        </div>
      </section>

      {/* Section - Sign in */}
      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-8">
        <div className="flex w-full max-w-[400px] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.24px] text-pv-ink">
              Sign in
            </h2>
            <p className="text-[14px] leading-5 text-pv-muted">
              Use the account your workspace administrator created for you.
            </p>
          </div>

          {alertVisible && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-pv-err-border bg-pv-err-bg p-4"
            >
              <CircleAlert
                size={20}
                className="mt-0.5 shrink-0 text-pv-err-field"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[14px] font-semibold leading-5 text-pv-err-ink">
                  {fixList.length > 0
                    ? `Fix ${fixList.length} field${fixList.length === 1 ? '' : 's'} to sign in`
                    : formError}
                </p>
                {fixList.length > 0 && (
                  <ul className="pl-[18px]">
                    {fixList.map((item) => (
                      <li key={item.label} className="relative">
                        <span aria-hidden="true" className="absolute -left-5 text-pv-ink">
                          •
                        </span>
                        <button
                          type="button"
                          onClick={item.focus}
                          className="text-left text-[14px] leading-5 text-pv-teal underline transition-colors hover:text-pv-teal-hover"
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Form - Sign in to the utility portal */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[12px] font-medium leading-4 text-pv-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                ref={emailRef}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError(null);
                  if (formError) setFormError(null);
                }}
                placeholder="ana.santos@example.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={clsx(
                  'h-11 w-full rounded-lg bg-white px-3 text-[14px] leading-5 text-pv-ink outline-none placeholder:text-pv-muted',
                  emailError ? 'border-2 border-pv-err-field' : 'border border-pv-input-border',
                )}
              />
              {emailError && (
                <p
                  id="email-error"
                  className="flex items-start gap-1 text-[12px] leading-4 text-pv-err-ink"
                >
                  <CircleAlert size={16} className="shrink-0" aria-hidden="true" />
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[12px] font-medium leading-4 text-pv-ink">
                  Password
                </label>
                <span className="text-[12px] leading-4 text-pv-muted">
                  Forgot it? Ask your administrator.
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  ref={passwordRef}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError(null);
                    if (formError) setFormError(null);
                  }}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={clsx(
                    'h-11 w-full rounded-lg bg-white pl-3 pr-11 text-[14px] leading-5 text-pv-ink outline-none',
                    passwordError ? 'border-2 border-pv-err-field' : 'border border-pv-input-border',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-pv-muted transition-colors hover:text-pv-ink"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p
                  id="password-error"
                  className="flex items-start gap-1 text-[12px] leading-4 text-pv-err-ink"
                >
                  <CircleAlert size={16} className="shrink-0" aria-hidden="true" />
                  {passwordError}
                </p>
              )}
            </div>

            <label className="flex h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border border-[#767676] bg-white peer-checked:border-pv-teal peer-checked:bg-pv-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pv-teal">
                {remember && <Check size={14} strokeWidth={3} className="text-white" aria-hidden="true" />}
              </span>
              <span className="text-[14px] leading-5 text-pv-ink">
                Keep me signed in on this device
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-pv-teal text-[14px] font-semibold leading-5 text-white transition-colors hover:bg-pv-teal-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-pv-divider" />
            <span className="text-[12px] leading-4 text-pv-muted">or</span>
            <span className="h-px flex-1 bg-pv-divider" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold leading-5 text-pv-ink">
              Looking for published results?
            </p>
            <p className="text-[14px] leading-5 text-pv-muted">
              The public portal shows reviewed sustainability summaries without an account.
            </p>
            <Link
              to="/public/home"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-pv-border-soft bg-white px-4 text-[14px] font-semibold leading-5 text-pv-ink transition-colors hover:border-pv-input-border"
            >
              Visit the public portal
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <p className="text-[12px] leading-4 text-pv-muted">
            Accounts are provisioned by your workspace administrator. Pax Virentia doesn&apos;t
            offer public sign-up.
          </p>
        </div>
      </section>
    </div>
  );
}
