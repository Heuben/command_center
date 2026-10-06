import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  CheckIcon
} from 'lucide-react';
import bantaiIcon from '../bantai_logo_pic_icons/bantai_icon2.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { Button, Input, Label } from '../components/ui/primitives';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const REMEMBER_KEY = 'bantai-remember-email';
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.MODE === 'test';

/* -------------------------------------------------------------------------- */
/* Email format validation                                                     */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(value: string): string | null {
  if (!value.trim()) return null;
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address.';
  return null;
}

function passwordError(value: string): string | null {
  if (!value) return null;
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

/* -------------------------------------------------------------------------- */
/* Password strength                                                           */
/* -------------------------------------------------------------------------- */

type Strength = 'empty' | 'weak' | 'fair' | 'strong';

function strengthOf(pw: string): Strength {
  if (!pw) return 'empty';
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  return 'strong';
}

const STRENGTH_META: Record<Strength, { label: string; color: string; width: string }> = {
  empty:  { label: '',         color: 'bg-ink-faint/30', width: 'w-0'    },
  weak:   { label: 'Weak',     color: 'bg-danger',       width: 'w-1/3'  },
  fair:   { label: 'Fair',     color: 'bg-urgent',       width: 'w-2/3'  },
  strong: { label: 'Strong',   color: 'bg-success',      width: 'w-full'  },
};

/* -------------------------------------------------------------------------- */
/* Decorative sub-components                                                   */
/* -------------------------------------------------------------------------- */

function GeoGrid() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.08] text-white"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="geo-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-grid)" />
    </svg>
  );
}

function GradientOrbs() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-30 blur-3xl dark:opacity-25"
        style={{ background: 'rgb(202 32 40 / 1)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full opacity-25 blur-3xl dark:opacity-20"
        style={{ background: 'rgb(14 165 233 / 1)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-1/4 h-48 w-48 rounded-full opacity-20 blur-3xl dark:opacity-15"
        style={{ background: 'rgb(236 72 153 / 1)' }}
        aria-hidden="true"
      />
    </>
  );
}

function ErrorIcon() {
  return <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />;
}

function Spinner() {
  return <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/* Animation primitives                                                        */
/* -------------------------------------------------------------------------- */

function FadeIn({
  children,
  delay = 0,
  reduced,
  className
}: {
  children: React.ReactNode;
  delay?: number;
  reduced: boolean;
  className?: string;
}) {
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export function Login() {
  const { user, ready, signIn, devLogin } = useSession();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  // Form state
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(REMEMBER_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !!window.localStorage.getItem(REMEMBER_KEY);
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Validation
  const emailFieldError = emailError(email);
  const passwordFieldError = passwordError(password);
  const passwordStrength = useMemo(() => strengthOf(password), [password]);
  const strengthMeta = STRENGTH_META[passwordStrength];

  // Refs
  const emailRef = useRef<HTMLInputElement>(null);

  // Accessibility
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const rememberId = useId();

  // Auto-focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[13px] text-ink-muted">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Enter your work email.');
      return;
    }
    if (emailFieldError) {
      setFormError(emailFieldError);
      return;
    }
    if (!password) {
      setFormError('Enter your password.');
      return;
    }
    if (passwordFieldError) {
      setFormError(passwordFieldError);
      return;
    }

    // Persist / clear remembered email
    try {
      if (remember) {
        window.localStorage.setItem(REMEMBER_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      /* storage unavailable */
    }

    setBusy(true);
    setFormError(null);
    void (async () => {
      const ok = await signIn(email.trim(), password);
      setBusy(false);
      if (ok) {
        navigate('/');
      } else {
        setFormError('Invalid email or password. Contact your superadmin if you need an account.');
      }
    })();
  };

  const enterDevelopmentSystem = async () => {
    setBusy(true);
    setFormError(null);
    const ok = await devLogin();
    setBusy(false);
    if (ok) {
      navigate('/');
    } else {
      setFormError('Could not enter the development system. Make sure the local API is running in development mode.');
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-canvas lg:h-[100dvh] lg:grid-cols-[38%_62%] lg:overflow-hidden">
      {/* ── Left branding panel ───────────────────────────────────────── */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#991b1b] p-8 text-white lg:flex xl:p-12"
        style={{ minHeight: '100dvh' }}
        aria-hidden="true"
      >
        <GeoGrid />
        <GradientOrbs />
        <FadeIn reduced={reduced} delay={0.05} className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-2 shadow-lg">
              <img src={bantaiIcon} alt="BANTAI" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-white">B.A.N.T.A.I.</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                Command Center
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn reduced={reduced} delay={0.18} className="relative z-10 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Secure operations platform
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Prepared teams.<br />Stronger communities.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 xl:text-base">
            A secure workspace for authorized personnel to coordinate information and manage
            command center operations.
          </p>
        </FadeIn>

        <FadeIn reduced={reduced} delay={0.32} className="relative z-10 border-t border-white/20 pt-5">
          <p className="text-[11px] text-white/65">
            © 2026 BANTAI Command Center
          </p>
        </FadeIn>
      </aside>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas px-4 py-8 sm:px-6 lg:min-h-0 lg:h-full lg:overflow-y-auto lg:px-10 lg:py-8 xl:px-16">
        {/* Mobile logo */}
        <FadeIn reduced={reduced} delay={0.05} className="mb-6 flex items-center gap-3 lg:hidden">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1.5 shadow-card">
            <img src={bantaiIcon} alt="BANTAI" className="h-full w-full object-contain" />
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-[0.12em] text-ink">B.A.N.T.A.I.</h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Command Center
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-line bg-surface p-5 shadow-panel sm:p-7">
          <FadeIn reduced={reduced} delay={0.1} className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-danger">
              <LockIcon className="h-3 w-3" aria-hidden="true" />
              Authorized personnel
            </div>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">Welcome back</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Sign in to access your command center.
            </p>
          </FadeIn>

          <form onSubmit={submit} noValidate className="space-y-4" aria-describedby={formError ? errorId : undefined}>

            {/* Email */}
            <FadeIn reduced={reduced} delay={0.15}>
              <div className="space-y-1.5">
                <Label htmlFor={emailId} className="text-[13px]">Work email</Label>
                <div className="relative">
                  <MailIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <Input
                    ref={emailRef}
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="name@station.bantai.gov.ph"
                    className="h-11 pl-9"
                    invalid={!!emailFieldError}
                    aria-invalid={!!emailFieldError}
                    aria-describedby={emailFieldError ? emailErrorId : undefined}
                    disabled={busy}
                  />
                </div>
                {emailFieldError && (
                  <p id={emailErrorId} className="text-[12px] font-medium text-danger">
                    {emailFieldError}
                  </p>
                )}
              </div>
            </FadeIn>

            {/* Password */}
            <FadeIn reduced={reduced} delay={0.22}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={passwordId} className="text-[13px]">Password</Label>
                  <button
                    type="button"
                    className="rounded px-1 text-[11px] font-medium text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <LockIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <Input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="••••••••"
                    className="h-11 pl-9 pr-10"
                    invalid={!!passwordFieldError}
                    aria-invalid={!!passwordFieldError}
                    aria-describedby={passwordFieldError ? passwordErrorId : undefined}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded bg-surface p-1 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Password strength meter */}
                {password && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-faint/15">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${strengthMeta.color} ${strengthMeta.width}`}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        passwordStrength === 'weak' ? 'text-danger' :
                        passwordStrength === 'fair' ? 'text-urgent' :
                        passwordStrength === 'strong' ? 'text-success' :
                        'text-ink-faint'
                      }`}
                      aria-live="polite"
                    >
                      {strengthMeta.label}
                    </span>
                  </div>
                )}

                {passwordFieldError && (
                  <p id={passwordErrorId} className="text-[12px] font-medium text-danger">
                    {passwordFieldError}
                  </p>
                )}
              </div>
            </FadeIn>

            {/* Remember me */}
            <FadeIn reduced={reduced} delay={0.28}>
              <label
                htmlFor={rememberId}
                  className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-ink-muted"
              >
                <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    id={rememberId}
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={busy}
                    className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border border-line bg-surface transition-colors checked:border-danger checked:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <CheckIcon
                    className="pointer-events-none relative z-10 h-3 w-3 stroke-[3] text-white opacity-0 transition-opacity peer-checked:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                Remember my email on this device
              </label>
            </FadeIn>

            {/* Form-level error */}
            <AnimatePresence>
              {formError && (
                <motion.div
                  key="form-error"
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  initial={reduced ? false : { opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex items-start gap-2 overflow-hidden rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5"
                >
                  <ErrorIcon />
                  <p className="text-[12px] font-medium leading-snug text-danger">{formError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <FadeIn reduced={reduced} delay={0.34}>
              <Button
                type="submit"
                variant="danger"
                className="h-11 w-full text-sm font-semibold focus-visible:ring-danger/50"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Verifying…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </FadeIn>
            {SHOW_DEMO && (
              <FadeIn reduced={reduced} delay={0.38}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full text-[13px] font-semibold"
                  onClick={enterDevelopmentSystem}
                  disabled={busy}
                >
                  {busy ? <Spinner /> : null}
                  Enter system (development only)
                </Button>
              </FadeIn>
            )}
          </form>

          {/* Trust signal */}
          <FadeIn reduced={reduced} delay={0.4} className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
            <LockIcon className="h-3 w-3" aria-hidden="true" />
            <span>Secure connection · TLS 1.3</span>
          </FadeIn>

          {/* Footer */}
          <FadeIn reduced={reduced} delay={0.52} className="mt-3 text-center">
            <p className="text-xs leading-relaxed text-ink-faint">
              Accounts are provisioned internally.{' '}
              <span className="font-medium text-ink-muted">Contact your superadmin for access.</span>
            </p>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
