/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuditLogs } from './AuditLogs';

const { mockAuditLogs, mockUseSession, mockUseCommandCenters } = vi.hoisted(() => ({
  mockAuditLogs: vi.fn(),
  mockUseSession: vi.fn(),
  mockUseCommandCenters: vi.fn(),
}));

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('../contexts/CommandCenterContext', () => ({
  useCommandCenters: () => mockUseCommandCenters(),
}));

vi.mock('../lib/api', () => ({
  api: {
    auditLogs: mockAuditLogs,
    getBranchActors: vi.fn(),
  },
}));

describe('<AuditLogs />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogs.mockResolvedValue({ data: [], cursor: null, hasNextPage: false });
    mockUseCommandCenters.mockReturnValue({
      centerName: (id: string) => id,
      ready: true,
    });
  });

  it('does not request superadmin audit logs until a branch is selected', () => {
    mockUseSession.mockReturnValue({
      isSuperadmin: true,
      scopeCenterId: null,
    });

    render(<AuditLogs />);

    expect(screen.getByText(/select a command center from branch context/i)).toBeInTheDocument();
    expect(mockAuditLogs).not.toHaveBeenCalled();
  });

  it('requests audit logs with the selected superadmin command center', async () => {
    mockUseSession.mockReturnValue({
      isSuperadmin: true,
      scopeCenterId: 'branch-1',
    });

    render(<AuditLogs />);

    await waitFor(() => {
      expect(mockAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
        commandCenterId: 'branch-1',
      }));
    });
  });
});
