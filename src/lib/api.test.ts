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
        email: 'aspirasjuanita81@gmail.com',
        r_profile: {
          rank: 'PGEN',
          agency: 'police',
          availability: 'off_duty'
        }
      });
    });
  });
});