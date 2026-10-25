/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';

const { mockDashboardStats, mockUseSession } = vi.hoisted(() => ({
  mockDashboardStats: vi.fn(),
  mockUseSession: vi.fn(),
}));

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('../lib/api', () => ({
  api: {
    dashboardStats: mockDashboardStats,
  },
}));

const stats = {
  totalIncidents: 12,
  totalActivePersonnel: 8,
  totalGunIncidents: 2,
  totalBladeIncidents: 3,
  totalCollisionIncidents: 1,
};

describe('<Dashboard />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardStats.mockResolvedValue(stats);
  });

  it('asks superadmins to select a branch instead of requesting all-branch stats', () => {
    mockUseSession.mockReturnValue({
      user: { id: 'super-1' },
      scopeCenterId: null,
      isSuperadmin: true,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/select a branch from the branch context menu/i)).toBeInTheDocument();
    expect(mockDashboardStats).not.toHaveBeenCalled();
  });

  it('requests stats for the selected superadmin branch', async () => {
    mockUseSession.mockReturnValue({
      user: { id: 'super-1' },
      scopeCenterId: 'branch-1',
      isSuperadmin: true,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(mockDashboardStats).toHaveBeenCalledWith('branch-1');
  });
});
