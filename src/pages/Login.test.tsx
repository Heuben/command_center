/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';

/* -------------------------------------------------------------------------- */
/* Mock SessionContext                                                        */
/* -------------------------------------------------------------------------- */

const mockSignIn = vi.fn<[string, string], boolean>();
const mockUseSession = vi.fn(() => ({
  user: null,
  signIn: mockSignIn,
  theme: 'light' as const,
  setTheme: vi.fn(),
}));

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

/* -------------------------------------------------------------------------- */
/* Helper                                                                    */
/* -------------------------------------------------------------------------- */

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('<Login />', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      user: null,
      signIn: mockSignIn,
      theme: 'light' as const,
      setTheme: vi.fn(),
    });
    // Clear localStorage between tests so remembered email doesn't leak
    try {
      window.localStorage.removeItem('bantai-remember-email');
    } catch {
      /* ignore */
    }
  });

  // ── 1. Redirects when already signed in ──────────────────────────────────
  it('redirects to / when the user is already signed in', () => {
    mockUseSession.mockReturnValue({
      user: { id: '1', f_name: 'Riz', l_name: 'Alcantara', role: 'superadmin', email: 'r.alcantara@bantai.gov.ph', command_center_id: null, account_status: 'active', r_profile: null },
      signIn: mockSignIn,
      theme: 'light' as const,
      setTheme: vi.fn(),
    });

    renderLogin();

    // When user is set, the component returns Navigate to="/" — so nothing renders
    expect(screen.queryByRole('heading', { name: /welcome back/i })).toBeNull();
  });

  // ── 2. Renders heading and subheading ───────────────────────────────────
  it('renders the welcome heading and subheading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to access your command center/i)).toBeInTheDocument();
  });

  // ── 3. Renders form fields ─────────────────────────────────────────────
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByRole('textbox', { name: /work email/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  // ── 4. Renders demo account buttons ───────────────────────────────────
  it('renders demo account buttons', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /superadmin — system-wide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin — barangay 171/i })).toBeInTheDocument();
  });

  // ── 5. Renders submit button ───────────────────────────────────────────
  it('renders the sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // ── 6. Shows error when email is empty on submit ───────────────────────
  it('shows an error message when email is empty on submit', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your work email/i);
  });

  // ── 7. Shows error when password is empty on submit ────────────────────
  it('shows an error message when password is empty on submit', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'r.alcantara@bantai.gov.ph');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your password/i);
  });

  // ── 8. Calls signIn and navigates on valid credentials ──────────────────
  it('calls signIn with credentials and navigates on valid login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockReturnValue(true);
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'r.alcantara@bantai.gov.ph');
    await user.type(screen.getByLabelText('Password'), 'superadmin-2026');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // signIn is called with trimmed, lowercased email and password
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('r.alcantara@bantai.gov.ph', 'superadmin-2026');
    });
  });

  // ── 9. Shows error on invalid credentials ────────────────────────────────
  it('shows an error message on invalid credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockReturnValue(false);
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'wrong@email.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
  });

  // ── 10. Toggles password visibility ─────────────────────────────────────
  it('toggles password visibility when the eye button is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ── 11. Pre-fills demo account credentials ───────────────────────────────
  it('pre-fills credentials when a demo account button is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /superadmin — system-wide/i }));

    const emailInput = screen.getByRole('textbox', { name: /work email/i }) as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

    expect(emailInput.value).toBe('r.alcantara@bantai.gov.ph');
    expect(passwordInput.value).toBe('superadmin-2026');
  });

  // ── 12. Clears error when demo account is selected ─────────────────────
  it('clears the error message when a demo account is selected', async () => {
    const user = userEvent.setup();
    mockSignIn.mockReturnValue(false);
    renderLogin();

    // Trigger an error first
    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'wrong@email.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Click demo account
    await user.click(screen.getByRole('button', { name: /superadmin — system-wide/i }));

    // Error should be gone (after exit animation completes)
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  // ── 13. Submit button disabled while busy ───────────────────────────────
  it('disables the submit button while the sign-in request is processing', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 500)));
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'r.alcantara@bantai.gov.ph');
    await user.type(screen.getByLabelText('Password'), 'superadmin-2026');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Button should be disabled and show loading text
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verifying/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
  });

  // ── 14. Shows "Forgot password?" link ──────────────────────────────────
  it('renders the forgot password link', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });

  // ── 15. Renders left branding panel in desktop view ──────────────────────
  it('renders the B.A.N.T.A.I. brand name and tagline in the left panel on desktop', () => {
    renderLogin();
    // On desktop (lg+), the left panel is visible — it has the brand name
    expect(screen.getByRole('heading', { name: /b\.a\.n\.t\.a\.i\./i })).toBeInTheDocument();
  });

  // ── 16. Demo account labels match expected copy ─────────────────────────
  it('renders correct demo account copy', () => {
    renderLogin();
    expect(screen.getByText('Accounts are provisioned internally.')).toBeInTheDocument();
    expect(screen.getByText('Contact your superadmin for access.')).toBeInTheDocument();
  });

  // ── 17. Email validation trims whitespace ────────────────────────────────
  it('trims whitespace from email before validation', async () => {
    const user = userEvent.setup();
    renderLogin();

    // Fill email with whitespace and a valid password (>= 8 chars to pass the
    // password-length rule added in the high-fidelity rewrite)
    await user.type(screen.getByRole('textbox', { name: /work email/i }), '  r.alcantara@bantai.gov.ph  ');
    await user.type(screen.getByLabelText('Password'), 'demo1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Email should be trimmed before sending to signIn
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('r.alcantara@bantai.gov.ph', 'demo1234');
    });
  });

  // ── 18. No error shown initially ────────────────────────────────────────
  it('does not show an error message on initial render', () => {
    renderLogin();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // ── 19. Email format validation (high-fidelity) ────────────────────────────
  it('shows inline email format error for invalid email', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'not-an-email');
    // Inline error message under the email field (not the form-level alert)
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  // ── 20. Email format error clears when valid email is typed ────────────────
  it('clears the email format error when the email becomes valid', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'not-an-email');
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: /work email/i }));
    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'r.alcantara@bantai.gov.ph');
    expect(screen.queryByText(/enter a valid email address/i)).toBeNull();
  });

  // ── 21. Password strength meter appears when password is entered ────────────
  it('shows the password strength meter when a password is typed', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Password'), 'weakpass');
    // "Weak" label appears in the strength meter
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  // ── 22. Strong password shows "Strong" label ────────────────────────────────
  it('shows "Strong" for a strong password', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Password'), 'VeryStr0ng!Pass#2026');
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  // ── 23. Remember me checkbox is present ────────────────────────────────────
  it('renders the "remember me" checkbox', () => {
    renderLogin();
    expect(screen.getByRole('checkbox', { name: /remember my email/i })).toBeInTheDocument();
  });

  // ── 24. Remember me persists email to localStorage on successful sign-in ───
  it('persists email to localStorage when "remember me" is checked and sign-in succeeds', async () => {
    const user = userEvent.setup();
    mockSignIn.mockReturnValue(true);
    renderLogin();

    // Clear any leftover localStorage from prior tests
    window.localStorage.removeItem('bantai-remember-email');

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'r.alcantara@bantai.gov.ph');
    await user.type(screen.getByLabelText('Password'), 'superadmin-2026');
    await user.click(screen.getByRole('checkbox', { name: /remember my email/i }));
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('bantai-remember-email')).toBe('r.alcantara@bantai.gov.ph');
    });
  });

  // ── 25. Trust signal is shown ──────────────────────────────────────────────
  it('renders the secure-connection trust signal', () => {
    renderLogin();
    expect(screen.getByText(/secure connection/i)).toBeInTheDocument();
  });

  // ── 26. Lock icon present in the password field ─────────────────────────────
  it('renders the lock icon inside the password field area', () => {
    const { container } = renderLogin();
    // LockIcon from lucide renders as svg with class containing "lucide-lock"
    expect(container.querySelector('svg.lucide-lock')).toBeTruthy();
  });

  // ── 27. Demo accounts render in dev mode ───────────────────────────────────
  it('renders demo accounts in dev mode (import.meta.env.DEV === true)', () => {
    renderLogin();
    // The demo button is gated by SHOW_DEMO which is true under vitest (DEV)
    expect(screen.getByRole('button', { name: /superadmin — system-wide/i })).toBeInTheDocument();
  });

  // ── 28. Submitting with an invalid email shows form-level error ────────────
  it('shows a form-level error when an invalid email is submitted', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByRole('textbox', { name: /work email/i }), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'validpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // The inline email error and/or the form-level alert should appear.
    // The submit short-circuits before setTimeout (because emailFieldError is set),
    // so the form-level error appears synchronously.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid email/i);
  });

});
