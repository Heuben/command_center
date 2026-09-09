import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Radio,
  AlertTriangle,
  Users,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  Loader2Icon,
  LockIcon,
  CheckIcon
} from 'lucide-react';
import bantaiLogo from '../bantai_logo_pic_icons/bantai_logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { Button, Input, Label } from '../components/ui/primitives';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const demoAccounts = [
  {
    email: 'r.alcantara@bantai.gov.ph',
    label: 'Superadmin — System-wide',
    password: 'superadmin-2026'
  },
  {
    email: 'e.reyes@brgy171.bantai.gov.ph',
    label: 'Admin — Barangay 171',
    password: 'admin-171-2026'
  }
];

const REMEMBER_KEY = 'bantai-remember-email';
// TODO: hide demo accounts once the real auth/database is wired up.
// For now they're always visible so the Figma review can use them.
const SHOW_DEMO = true;

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
        style={{}}
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

function StatBadge({
  icon: Icon,
  label,
  value,
  colorClass
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
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
  const { user, signIn } = useSession();
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
    window.setTimeout(() => {
      const ok = signIn(email.trim(), password);
      setBusy(false);
      if (ok) {
        navigate('/');
      } else {
        setFormError(
          'Invalid email or password. Try the demo accounts below or contact your superadmin.'
        );
      }
    }, 400);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left branding panel ───────────────────────────────────────── */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#0a1628] p-10 text-white dark:bg-[#060b18] lg:flex lg:w-1/2 xl:p-14"
        style={{ minHeight: '100dvh' }}
        aria-hidden="true"
      >
        <GeoGrid />
        <GradientOrbs />

        <FadeIn reduced={reduced} delay={0.05} className="relative z-10">
          <div className="mb-4">
            <img src={bantaiLogo} alt="BANTAI Logo" className="h-20 w-auto object-contain mix-blend-screen" />
          </div>
          <p className="mt-1 text-sm font-medium text-white/60">
            Barangay Analytics &amp; Tactical<br />Action Intelligence
          </p>
        </FadeIn>

        <FadeIn reduced={reduced} delay={0.18} className="relative z-10">
          <p className="text-[15px] font-medium leading-relaxed text-white/80 max-w-xs">
            Real-time emergency response coordination, incident tracking, and resource dispatch — all in one command center.
          </p>
        </FadeIn>

        <FadeIn reduced={reduced} delay={0.32} className="relative z-10 grid grid-cols-3 gap-3">
          <StatBadge
            icon={Radio}
            label="Active Units"
            value="24 / 7"
            colorClass="bg-[rgb(24_92_232_/_1)]"
          />
          <StatBadge
            icon={AlertTriangle}
            label="Alerts Today"
            value="127"
            colorClass="bg-[rgb(217_119_6_/_1)]"
          />
          <StatBadge
            icon={Users}
            label="Personnel"
            value="1,840"
            colorClass="bg-[rgb(16_138_70_/_1)]"
          />
        </FadeIn>

        <FadeIn reduced={reduced} delay={0.42} className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-[11px] text-white/30">
            © 2026 Bantai Government. All systems operational.
          </p>
        </FadeIn>
      </aside>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <main className="flex w-full flex-col items-center justify-center bg-canvas px-6 py-12 lg:w-1/2 lg:px-16">
        {/* Mobile logo */}
        <FadeIn reduced={reduced} delay={0.05} className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-40 w-40 items-center justify-center rounded-2xl shadow-lg overflow-hidden">
            <img src={bantaiLogo} alt="BANTAI Logo" className="h-full w-full object-contain p-8" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-ink">B.A.N.T.A.I.</h1>
          <p className="text-[13px] text-ink-muted">Command Center</p>
        </FadeIn>

        <div className="w-full max-w-[400px]">
          <FadeIn reduced={reduced} delay={0.1} className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Sign in to access your command center.
            </p>
          </FadeIn>

          <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? errorId : undefined}>

            {/* Email */}
            <FadeIn reduced={reduced} delay={0.15}>
              <div className="space-y-1.5">
                <Label htmlFor={emailId}>Work Email</Label>
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
                  className="h-11"
                  invalid={!!emailFieldError}
                  aria-invalid={!!emailFieldError}
                  aria-describedby={emailFieldError ? emailErrorId : undefined}
                  disabled={busy}
                />
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
                  <Label htmlFor={passwordId}>Password</Label>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas rounded px-1"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas rounded"
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
                className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-ink-muted"
              >
                <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    id={rememberId}
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={busy}
                    className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border border-line bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="flex items-start gap-2.5 overflow-hidden rounded-lg border border-danger/20 bg-danger/5 px-3.5 py-3"
                >
                  <ErrorIcon />
                  <p className="text-[13px] font-medium leading-snug text-danger">{formError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <FadeIn reduced={reduced} delay={0.34}>
              <Button
                type="submit"
                variant="primary"
                className="h-11 w-full text-sm font-semibold"
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
          </form>

          {/* Trust signal */}
          <FadeIn reduced={reduced} delay={0.4} className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
            <LockIcon className="h-3 w-3" aria-hidden="true" />
            <span>Secure connection · TLS 1.3</span>
          </FadeIn>

          {/* Demo accounts (dev only) */}
          {SHOW_DEMO && (
            <FadeIn reduced={reduced} delay={0.46} className="mt-8 rounded-xl border border-dashed border-line bg-surface p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
                Demo Accounts
                <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">Quick Fill</span>
              </p>
              <ul className="space-y-2">
                {demoAccounts.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(a.password);
                        setFormError(null);
                      }}
                      className="flex w-full flex-col items-start rounded-lg border border-transparent px-3 py-2.5 text-left transition-all duration-150 hover:border-line hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                    >
                      <span className="text-[13px] font-medium text-primary">{a.label}</span>
                      <span className="mt-0.5 text-[12px] text-ink-faint">{a.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </FadeIn>
          )}

          {/* Footer */}
          <FadeIn reduced={reduced} delay={0.52} className="mt-6 text-center">
            <p className="text-[12px] text-ink-faint">
              Accounts are provisioned internally.{' '}
              <span className="font-medium text-ink-muted">Contact your superadmin for access.</span>
            </p>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
