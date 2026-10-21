import React, { useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MailIcon,
  ShieldCheckIcon
} from 'lucide-react';
import bantaiIcon from '../bantai_logo_pic_icons/bantai_icon2.png';
import { Button, Input, Label } from '../components/ui/primitives';
import { api } from '../lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'We could not complete your request. Please try again.';
}

export function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.requestPasswordReset(normalizedEmail);
      setRequestSent(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError('This password reset link is invalid or has expired.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Choose a password between 12 and 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setResetComplete(true);
      navigate('/forgot-password', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const isResetMode = !!token && !resetComplete;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-[440px]">
        <Link
          to="/login"
          className="mb-6 flex items-center justify-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
          aria-label="BANTAI Command Center sign in"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#df5b62] p-1.5">
            <img src={bantaiIcon} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-bold tracking-[0.12em] text-ink">B.A.N.T.A.I.</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Command Center
            </span>
          </span>
        </Link>

        <section className="rounded-lg border border-line bg-surface p-6 sm:p-8">
          {resetComplete ? (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
                Password updated
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Your password has been changed. Sign in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-transparent bg-danger px-3.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                Back to sign in
              </Link>
            </div>
          ) : requestSent ? (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-danger">
                <MailIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
                Check your email
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                If an active command-center account matches that email, you’ll receive a link to
                reset its password. The link expires in 30 minutes.
              </p>
              <button
                type="button"
                onClick={() => setRequestSent(false)}
                className="mt-5 rounded text-sm font-medium text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
              >
                Try another email
              </button>
            </div>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-danger/5 text-danger">
                {isResetMode ? (
                  <KeyRoundIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <LockKeyholeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
                {isResetMode ? 'Set a new password' : 'Forgot your password?'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {isResetMode
                  ? 'Choose a new password for your command-center account.'
                  : 'Enter the work email address linked to your account and we’ll send you a reset link.'}
              </p>

              {isResetMode ? (
                <form
                  onSubmit={submitReset}
                  className="mt-6 space-y-4"
                  aria-describedby={error ? errorId : undefined}
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={passwordId}>New password</Label>
                    <Input
                      id={passwordId}
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 12 characters"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={confirmPasswordId}>Confirm new password</Label>
                    <Input
                      id={confirmPasswordId}
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Enter your new password again"
                      disabled={busy}
                    />
                  </div>
                  {error && (
                    <p id={errorId} role="alert" className="text-sm font-medium text-danger">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="danger"
                    className="h-11 w-full text-sm font-semibold"
                    disabled={busy}
                    aria-busy={busy}
                  >
                    {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
                    {busy ? 'Updating password…' : 'Update password'}
                  </Button>
                </form>
              ) : (
                <form
                  onSubmit={submitRequest}
                  className="mt-6 space-y-4"
                  aria-describedby={error ? errorId : undefined}
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={emailId}>Work email</Label>
                    <div className="relative">
                      <MailIcon
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                        aria-hidden="true"
                      />
                      <Input
                        id={emailId}
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@station.bantai.gov.ph"
                        className="h-11 pl-9"
                        disabled={busy}
                      />
                    </div>
                  </div>
                  {error && (
                    <p id={errorId} role="alert" className="text-sm font-medium text-danger">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="danger"
                    className="h-11 w-full text-sm font-semibold"
                    disabled={busy}
                    aria-busy={busy}
                  >
                    {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
                    {busy ? 'Sending link…' : 'Send reset link'}
                  </Button>
                </form>
              )}
            </>
          )}

          {!resetComplete && !requestSent && (
            <div className="mt-6 border-t border-line pt-5">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
              >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>
            </div>
          )}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Secure account recovery</span>
          </div>
        </section>
      </div>
    </main>
  );
}
