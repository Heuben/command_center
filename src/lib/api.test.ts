import { api } from './api';
import { ApiError } from './api';

// Mock fetch globally
const mockedFetch = vi.fn();
globalThis.fetch = mockedFetch as unknown as typeof fetch;

describe('API Service', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';
  const mockResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bantai-access-token');
      window.localStorage.removeItem('bantai-refresh-token');
    }
  });

  describe('login', () => {
    it('should call the correct endpoint with correct parameters', async () => {
      // Mock successful response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200
      } as Response);

      await api.login(mockEmail, mockPassword);

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://www.bantai.online/api/v1/auth/local/signin',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ email: mockEmail, password: mockPassword }),
          credentials: 'include'
        })
      );
    });

    it('should return the access token and refresh token on success', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200
      } as Response);

      const result = await api.login(mockEmail, mockPassword);

      expect(result).toEqual(mockResponse);
    });

    it('should store the access token in localStorage', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200
      } as Response);

      await api.login(mockEmail, mockPassword);

      expect(typeof window !== 'undefined' && window.localStorage.getItem('bantai-access-token'))
        .toBe(mockResponse.accessToken);
    });

    it('should throw an ApiError on HTTP error', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
        status: 401
      } as Response);

      await expect(api.login(mockEmail, mockPassword))
        .rejects
        .toEqual(new ApiError('Invalid credentials', 401));
    });

    it('should throw an ApiError on network error', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.login(mockEmail, mockPassword))
        .rejects
        .toEqual(new ApiError('Request failed.', 0)); // ApiError sets status to 0 for non-HTTP errors
    });
  });

  describe('token refresh', () => {
    it('refreshes tokens after a 401 and retries the original request once', async () => {
      window.localStorage.setItem('bantai-access-token', 'expired-access-token');
      window.localStorage.setItem('bantai-refresh-token', 'old-refresh-token');
      mockedFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ totalIncidents: 1 })
        } as Response);

      await expect(api.dashboardStats()).resolves.toEqual({ totalIncidents: 1 });

      expect(mockedFetch).toHaveBeenCalledTimes(3);
      expect(mockedFetch.mock.calls[1][0]).toBe('https://www.bantai.online/api/v1/auth/refresh');
      expect(mockedFetch.mock.calls[1][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
        credentials: 'include'
      });
      expect(new Headers(mockedFetch.mock.calls[2][1]?.headers).get('Authorization'))
        .toBe('Bearer new-access-token');
      expect(window.localStorage.getItem('bantai-access-token')).toBe('new-access-token');
      expect(window.localStorage.getItem('bantai-refresh-token')).toBe('new-refresh-token');
    });
  });

  describe('auditLogs', () => {
    it('maps the camelCase API response and nextCursor to the UI audit-log shape', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'b30c7eb8-f036-4d5e-8d7a-68713443bfab',
            actorId: '628bacfd-7e4c-4240-a5a9-38793c590a48',
            actorName: 'Jungle Aspiras',
            commandCenterId: '7cb70f0a-777a-4048-9c11-10d7da83e985',
            action: 'ACTIVATE_ACCOUNT',
            targetEntity: 'user_account',
            targetId: '628bacfd-7e4c-4240-a5a9-38793c590a48',
            oldPayload: null,
            newPayload: null,
            createdAt: '2026-10-18T19:25:14.889Z'
          }],
          nextCursor: null
        }),
        status: 200
      } as Response);

      const result = await api.auditLogs(50, null, '7cb70f0a-777a-4048-9c11-10d7da83e985');

      expect(result).toEqual({
        data: [{
          id: 'b30c7eb8-f036-4d5e-8d7a-68713443bfab',
          actor_id: '628bacfd-7e4c-4240-a5a9-38793c590a48',
          actor_name: 'Jungle Aspiras',
          command_center_id: '7cb70f0a-777a-4048-9c11-10d7da83e985',
          action: 'ACTIVATE_ACCOUNT',
          target_entity: 'user_account',
          target_id: '628bacfd-7e4c-4240-a5a9-38793c590a48',
          reference: '628bacfd-7e4c-4240-a5a9-38793c590a48',
          created_at: '2026-10-18T19:25:14.889Z',
          old_value: null,
          new_value: null
        }],
        cursor: null,
        hasNextPage: false
      });
    });
  });

  describe('devLogin', () => {
    it('should call the correct dev login endpoint', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200
      } as Response);

      await api.devLogin();

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://www.bantai.online/api/v1/auth/dev-login',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('createResponder', () => {
    it('posts the DTO to the responders endpoint', async () => {
      const payload = {
        f_name: 'Taylor',
        l_name: 'Reyes',
        email: 'taylor@example.com',
        role: 'responder' as const,
        agency: 'police' as const,
        call_sign: 'PNP-12',
        rank: 'PCpl',
        command_center_id: 'center-id'
      };
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: {}, tempPassword: 'temporary' }),
        status: 201
      } as Response);

      await api.createResponder(payload);

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://www.bantai.online/api/v1/responders',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          credentials: 'include'
        })
      );
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and clear token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
        status: 200
      } as Response);

      // First set a token
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('bantai-access-token', 'test-token');
      }

      await api.logout();

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://www.bantai.online/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );

      // Token should be cleared after logout
      expect(typeof window !== 'undefined' && window.localStorage.getItem('bantai-access-token'))
        .toBeNull();
    });
  });

  describe('me', () => {
    it('should call the me endpoint and include authorization token', async () => {
      const mockProfile = {
        id: '1',
        f_name: 'Test',
        l_name: 'User',
        m_name: null,
        email: 'test@example.com',
        role: 'SUPER',
        command_center_id: null,
        m_number: '1234567890',
        phone_verified_at: null
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
        status: 200
      } as Response);

      // Set a token first
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('bantai-access-token', 'mock-token');
      }

      const result = await api.me();

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://www.bantai.online/api/v1/responders/profile',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      // Optionally, assert on the returned value
      expect(result).toEqual({
        user: {
          id: mockProfile.id,
          f_name: mockProfile.f_name,
          l_name: mockProfile.l_name,
          m_name: mockProfile.m_name,
          email: mockProfile.email,
          role: 'superadmin', // mapped from SUPER
          m_number: mockProfile.m_number,
          command_center_id: mockProfile.command_center_id,
          account_status: undefined,
          must_change_password: undefined,
          r_profile: undefined,
          d_profile: undefined,
        }
      });
    });

    it('maps a lowercase admin profile to the admin role', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'admin-id',
          f_name: 'Branch',
          l_name: 'Admin',
          m_name: null,
          email: 'admin@example.com',
          role: 'admin',
          command_center_id: 'center-id',
          m_number: null,
          phone_verified_at: null
        }),
        status: 200
      } as Response);

      const result = await api.me();

      expect(result.user.role).toBe('admin');
      expect(result.user.command_center_id).toBe('center-id');
    });
  });

  describe('getBranchResponders', () => {
    it('maps the lowercase branch responder response without losing middle names', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: '749d4c75-5507-42c6-ae4c-47549993248f',
          f_name: 'Juanita',
          l_name: 'Aspiras',
          m_name: 'Cruz',
          role: 'responder',
          account_status: 'pending_activation',
          email: 'aspirasjuanita81@gmail.com',
          rank: 'PGEN',
          agency: 'police',
          availability: 'off_duty'
        }],
        status: 200
      } as Response);

      const responders = await api.getBranchResponders('7cb70f0a-777a-4048-9c11-10d7da83e985');

      expect(responders[0]).toMatchObject({
        id: '749d4c75-5507-42c6-ae4c-47549993248f',
        f_name: 'Juanita',
        l_name: 'Aspiras',
        m_name: 'Cruz',
        role: 'responder',
        account_status: 'pending_activation',
        email: 'aspirasjuanita81@gmail.com',
        r_profile: {
          rank: 'PGEN',
          agency: 'police',
          availability: 'off_duty'
        }
      });
    });
  });

  describe('getRespondersByStatus', () => {
    it('maps the paginated deactivated response and sends its cursor', async () => {
      const centerId = '7cb70f0a-777a-4048-9c11-10d7da83e985';
      const cursor = 'encoded-next-cursor';
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: '749d4c75-5507-42c6-ae4c-47549993248f',
            f_name: 'John',
            l_name: 'Doe',
            m_name: 'Middle',
            role: 'responder',
            account_status: 'deactivated',
            email: 'john@example.com',
            rank: 'Officer',
            agency: 'Police Department',
            availability: 'off_duty'
          }],
          nextCursor: cursor
        }),
        status: 200
      } as Response);

      const result = await api.getRespondersByStatus(centerId, 'deactivated', cursor);

      expect(mockedFetch).toHaveBeenCalledWith(
        `https://www.bantai.online/api/v1/command-centers/${centerId}/responders/status/deactivated?cursor=${cursor}`,
        expect.objectContaining({ credentials: 'include' })
      );
      expect(result).toMatchObject({
        nextCursor: cursor,
        data: [{
          id: '749d4c75-5507-42c6-ae4c-47549993248f',
          account_status: 'deactivated',
          r_profile: {
            agency: 'police',
            rank: 'Officer',
            availability: 'off_duty'
          }
        }]
      });
    });

    it('requests and maps pending_activation responders', async () => {
      const centerId = '123e4567-e89b-12d3-a456-426614174000';
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'user-uuid',
            f_name: 'John',
            l_name: 'Doe',
            m_name: 'Middle',
            role: 'responder',
            account_status: 'pending_activation',
            email: 'john@example.com',
            rank: 'Officer',
            agency: 'Police Department',
            availability: 'off_duty'
          }],
          nextCursor: null
        }),
        status: 200
      } as Response);

      const result = await api.getRespondersByStatus(centerId, 'pending_activation');

      expect(mockedFetch.mock.calls[0][0]).toBe(
        `https://www.bantai.online/api/v1/command-centers/${centerId}/responders/status/pending_activation`
      );
      expect(result.data[0]).toMatchObject({
        id: 'user-uuid',
        account_status: 'pending_activation',
        r_profile: { agency: 'police', rank: 'Officer' }
      });
    });

    it('requests and maps active responders', async () => {
      const centerId = '123e4567-e89b-12d3-a456-426614174000';
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'user-uuid',
            f_name: 'John',
            l_name: 'Doe',
            m_name: 'Middle',
            role: 'responder',
            account_status: 'deactivated',
            email: 'john@example.com',
            rank: 'Officer',
            agency: 'Police Department',
            availability: 'off_duty'
          }],
          nextCursor: null
        }),
        status: 200
      } as Response);

      const result = await api.getRespondersByStatus(centerId, 'active');

      expect(mockedFetch.mock.calls[0][0]).toBe(
        `https://www.bantai.online/api/v1/command-centers/${centerId}/responders/status/active`
      );
      expect(result.data[0]).toMatchObject({
        id: 'user-uuid',
        account_status: 'deactivated',
        r_profile: { agency: 'police', rank: 'Officer' }
      });
    });
  });

  describe('responder account status actions', () => {
    it.each(['activate', 'deactivate'] as const)(
      'PATCHes the responder %s endpoint using the command center and responder IDs',
      async (action) => {
        const centerId = '7cb70f0a-777a-4048-9c11-10d7da83e985';
        const responderId = '52272e0b-7374-41db-9e3c-fa7c5972c3d9';
        mockedFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
          status: 204
        } as Response);

        await api[`${action}Responder`](centerId, responderId);

        expect(mockedFetch).toHaveBeenCalledWith(
          `https://www.bantai.online/api/v1/command-centers/${centerId}/responders/${responderId}/${action}`,
          expect.objectContaining({ method: 'PATCH', credentials: 'include' })
        );
      }
    );
  });
});