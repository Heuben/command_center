/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from './Settings';
import type { UserAccount } from '../types';

const { mockSetTheme, mockSignOut, mockSetSirenVolume, mockToast, mockUseSession, mockGetSettings, mockUpdateUser, mockUpdateSettings } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
  mockSignOut: vi.fn(),
  mockSetSirenVolume: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  mockUseSession: vi.fn(),
  mockGetSettings: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockUpdateSettings: vi.fn(),
}));

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => mockToast,
}));

vi.mock('../lib/api', () => ({
  api: {
    getSettings: mockGetSettings,
    updateSettings: mockUpdateSettings,
    updateUser: mockUpdateUser,
  },
}));

const mockUser: UserAccount = {
  id: 'u-1',
  f_name: 'Aiko',
  l_name: 'Santos',
  role: 'admin',
  email: 'aiko@example.com',
  command_center_id: 'branch-1',
  account_status: 'active',
};

describe('<Settings />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockGetSettings.mockResolvedValue({
      infrastructureRegion: 'Metro Manila Operations',
      apiBaseUrl: 'https://api.bantai.gov.ph/v1',
      webhookUrl: 'https://hooks.bantai.gov.ph/alerts',
      aiConfidenceThreshold: 80,
      defaultRoutingMode: 'nearest',
      branchProvisioning: 'approved',
    });

    mockUseSession.mockReturnValue({
      user: mockUser,
      theme: 'light',
      setTheme: mockSetTheme,
      sirenVolume: 70,
      setSirenVolume: mockSetSirenVolume,
      signOut: mockSignOut,
      isSuperadmin: false,
    });
  });

  it('does not render the alert siren section', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(await screen.findByText(/appearance/i)).toBeInTheDocument();
    expect(screen.queryByText(/alert siren/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/siren volume/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /test siren/i })).not.toBeInTheDocument();
  });

  it('does not render the system configuration cards', async () => {
    mockUseSession.mockReturnValue({
      user: mockUser,
      theme: 'light',
      setTheme: mockSetTheme,
      sirenVolume: 70,
      setSirenVolume: mockSetSirenVolume,
      signOut: mockSignOut,
      isSuperadmin: true,
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /^Profile$/i })).toBeInTheDocument();
    expect(screen.queryByText(/api \/ webhook config/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cross-branch defaults/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ai model confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save system settings/i })).not.toBeInTheDocument();
  });
});
