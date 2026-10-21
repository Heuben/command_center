/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../lib/api';
import { PasswordReset } from './PasswordReset';

vi.mock('../lib/api', () => ({
  api: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn()
  }
}));

function renderPasswordReset(path = '/forgot-password') {
  window.history.replaceState({}, '', path);
  return render(
    <BrowserRouter>
      <PasswordReset />
    </BrowserRouter>
  );
}

describe('<PasswordReset />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a reset link and shows a generic confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ ok: true });
    renderPasswordReset();

    await user.type(screen.getByLabelText(/work email/i), 'STAFF@example.test');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.requestPasswordReset).toHaveBeenCalledWith('staff@example.test');
    });
    expect(
      screen.getByText(/if an active command-center account matches that email/i)
    ).toBeInTheDocument();
  });

  it('rejects mismatched passwords without sending them to the API', async () => {
    const user = userEvent.setup();
    renderPasswordReset(`/forgot-password?token=${'a'.repeat(64)}`);

    await user.type(screen.getByLabelText(/^new password$/i), 'new-password-123');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'different-password');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('submits a valid reset token and confirms completion', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({ ok: true });
    const token = 'b'.repeat(64);
    renderPasswordReset(`/forgot-password?token=${token}`);

    await user.type(screen.getByLabelText(/^new password$/i), 'a-new-password-123');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'a-new-password-123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith(token, 'a-new-password-123');
    });
    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument();
  });
});
