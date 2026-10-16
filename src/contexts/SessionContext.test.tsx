import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import { act } from 'react-dom/test-utils';
import type { UserAccount } from '../types';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    login: vi.fn(),
    devLogin: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  }
}));

// Import the mocked api
import { api } from '../lib/api';

// Mock UserAccount for testing
const mockUser: UserAccount = {
  id: '1',
  f_name: 'Test',
  l_name: 'User',
  role: 'superadmin',
  email: 'test@example.com',
  command_center_id: null,
  account_status: 'active'
};

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

describe('SessionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('signIn', () => {
    it('should store access token and set user on successful login', async () => {
      // Arrange
      vi.mocked(api.login).mockResolvedValue({ accessToken: 'test-token', refreshToken: 'test-refresh-token' });
      vi.mocked(api.me).mockResolvedValue({ user: mockUser });

      // Act
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { signIn } = result.current;
      let returnedUser: UserAccount | null = null;
      await act(async () => {
        returnedUser = await signIn('test@example.com', 'password');
      });

      // Assert
      expect(api.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(window.localStorage.getItem('bantai-access-token')).toBe('test-token');
      expect(api.me).toHaveBeenCalled();
      expect(returnedUser).toEqual(mockUser);
      // The user state should be updated
      expect(result.current.user).toEqual(mockUser);
    });

    it('should throw error on invalid credentials', async () => {
      // Arrange
      const error = new Error('Invalid email or password');
      vi.mocked(api.login).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { signIn } = result.current;

      // Assert
      await expect(signIn('test@example.com', 'wrong')).rejects.toThrow(error);
      // Ensure token is not stored
      expect(window.localStorage.getItem('bantai-access-token')).toBeNull();
      // User state should remain null
      expect(result.current.user).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const networkError = new Error('Network error');
      vi.mocked(api.login).mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { signIn } = result.current;

      // Assert
      await expect(signIn('test@example.com', 'password')).rejects.toThrow(networkError);
      expect(window.localStorage.getItem('bantai-access-token')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('devLogin', () => {
    it('should store access token and set user on successful dev login in development mode', async () => {
      // Arrange
      // Mock import.meta.env.DEV to true
      vi.stubEnv('DEV', true);
      vi.mocked(api.devLogin).mockResolvedValue({ accessToken: 'dev-token', refreshToken: 'dev-refresh-token' });
      vi.mocked(api.me).mockResolvedValue({ user: mockUser });

      // Act
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { devLogin } = result.current;
      let returnedUser: UserAccount | null = null;
      await act(async () => {
        returnedUser = await devLogin();
      });

      // Assert
      expect(api.devLogin).toHaveBeenCalled();
      expect(window.localStorage.getItem('bantai-access-token')).toBe('dev-token');
      expect(api.me).toHaveBeenCalled();
      expect(returnedUser).toEqual(mockUser);
      expect(result.current.user).toEqual(mockUser);
    });

    it.skip('should throw error if development mode is disabled', async () => {
      // Arrange
      vi.stubEnv('DEV', false);

      // Act
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { devLogin } = result.current;

      // Assert
      await expect(devLogin()).rejects.toThrow('Development mode is disabled.');
      expect(window.localStorage.getItem('bantai-access-token')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should remove access token from localStorage and set user to null', async () => {
      // Arrange
      // First, log in to set the state
      vi.mocked(api.login).mockResolvedValueOnce({ accessToken: 'test-token', refreshToken: 'test-refresh-token' });
      vi.mocked(api.me).mockResolvedValueOnce({ user: mockUser });
      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
      const { signIn, signOut } = result.current;
      await act(async () => {
        await signIn('test@example.com', 'password');
      });
      // Now we are logged in
      expect(result.current.user).toEqual(mockUser);
      expect(window.localStorage.getItem('bantai-access-token')).toBe('test-token');

      // Now, log out
      vi.mocked(api.logout).mockResolvedValueOnce({ ok: true });
      await act(async () => {
        await signOut();
      });

      // Assert
      expect(api.logout).toHaveBeenCalled();
      expect(window.localStorage.getItem('bantai-access-token')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
});
