import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('JWT API authentication', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    api.clearAccessToken();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the access token and refreshes it from the HttpOnly-cookie flow after a 401', async () => {
    const responses = [
      new Response(
        JSON.stringify({
          accessToken: 'access-one',
          refreshToken: 'refresh-one'
        }),
        { status: 200 }
      ),
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401
      }),
      new Response(
        JSON.stringify({
          accessToken: 'access-two',
          refreshToken: 'refresh-two'
        }),
        { status: 200 }
      ),
      new Response(JSON.stringify({}), { status: 200 })
    ];
    const requests: Array<{
      authorization: string | null;
      credentials: RequestCredentials | undefined;
    }> = [];
    fetchMock.mockImplementation(async (_input, init) => {
      requests.push({
        authorization: new Headers(init?.headers).get('Authorization'),
        credentials: init?.credentials
      });
      const response = responses.shift();
      if (!response) throw new Error('Unexpected extra request.');
      return response;
    });

    await api.login('user@example.test', 'password');
    await api.state();

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://www.bantai.online/api/v1/auth/local/signin'
    );
    expect(requests[0].authorization).toBeNull();
    expect(requests[1].authorization).toBe('Bearer access-one');
    expect(requests[2].credentials).toBe('include');
    expect(requests[2].authorization).toBeNull();
    expect(requests[3].authorization).toBe('Bearer access-two');
  });

  it('sends the email and password unchanged to the sign-in endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }),
        { status: 200 }
      )
    );

    await api.login('user@example.test', ' password with spaces ');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'user@example.test',
      password: ' password with spaces '
    });
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
  });

  it('rejects passwords longer than the backend DTO permits', async () => {
    await expect(api.login('user@example.test', 'x'.repeat(129))).rejects.toMatchObject({
      status: 400
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('patches responder profile with bearer auth and no user id in the request', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'responder-access' }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ availability: 'on_duty' }), {
          status: 200
        })
      );

    await api.login('responder@example.test', 'password');
    await api.patchResponderProfile({ availability: 'on_duty' });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://www.bantai.online/api/v1/responders/profile');
    expect(init?.method).toBe('PATCH');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer responder-access'
    );
    expect(JSON.parse(String(init?.body))).toEqual({ availability: 'on_duty' });
  });
});
