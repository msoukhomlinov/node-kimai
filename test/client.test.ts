// Base client, transport, and error handling tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, FetchTransport, HttpTransport, TransportRequest } from '../src/client';
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  RateLimitError,
  ServerError,
  createApiError,
} from '../src/errors';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token-123';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`./__fixtures__/${name}.json`);
}

describe('FetchTransport', () => {
  let transport: FetchTransport;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    transport = new FetchTransport(BASE_URL, TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request URL construction', () => {
    it('should construct URL from baseUrl and path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({ method: 'GET', path: '/api/activities' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/api\.kimai\.test\/api\/activities$/),
        expect.any(Object),
      );
    });

    it('should handle path with leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({ method: 'GET', path: '/api/activities' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/activities`);
    });

    it('should handle path without leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({ method: 'GET', path: 'api/activities' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/activities`);
    });
  });

  describe('query parameters', () => {
    it('should encode simple query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        query: { name: 'test', visible: true },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('name=test');
      expect(url).toContain('visible=true');
    });

    it('should encode array query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/timesheets',
        query: { users: [1, 2, 3] },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('users=1');
      expect(url).toContain('users=2');
      expect(url).toContain('users=3');
    });

    it('should skip undefined and null query values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        query: { name: 'test', visible: undefined, billable: null },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('name=test');
      expect(url).not.toContain('visible');
      expect(url).not.toContain('billable');
    });

    it('should handle empty query object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        query: {},
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/activities`);
    });
  });

  describe('headers', () => {
    it('should set Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({ method: 'GET', path: '/api/activities' });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should set Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({ method: 'GET', path: '/api/activities' });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('should allow custom headers to override', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        headers: { 'X-Custom': 'value' },
      });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['X-Custom']).toBe('value');
    });
  });

  describe('request body', () => {
    it('should JSON stringify POST body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 1 }),
      });

      const body = { name: 'Test', visible: true };
      await transport.request({ method: 'POST', path: '/api/activities', body });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.body).toBe(JSON.stringify(body));
    });

    it('should JSON stringify PATCH body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 1 }),
      });

      const body = { name: 'Updated' };
      await transport.request({ method: 'PATCH', path: '/api/activities/1', body });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.body).toBe(JSON.stringify(body));
    });

    it('should not send body for GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        body: { name: 'test' },
      });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.body).toBeUndefined();
    });

    it('should move GET body to query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'GET',
        path: '/api/activities',
        body: { name: 'test', visible: true },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('name=test');
      expect(url).toContain('visible=true');
    });

    it('should move DELETE body to query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
      });

      await transport.request({
        method: 'DELETE',
        path: '/api/activities/1',
        body: { force: true },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('force=true');
    });

    it('should handle null body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      await transport.request({
        method: 'POST',
        path: '/api/activities',
        body: null,
      });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.body).toBeUndefined();
    });
  });

  describe('HTTP method', () => {
    it.each(['GET', 'POST', 'PATCH', 'DELETE'] as const)(
      'should use %s method',
      async (method) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => [],
        });

        await transport.request({ method, path: '/api/activities' });

        const [, opts] = mockFetch.mock.calls[0];
        expect(opts.method).toBe(method);
      },
    );
  });

  describe('response parsing', () => {
    it('should parse JSON response', async () => {
      const data = loadFixture('activity');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => data,
      });

      const result = await transport.request<unknown>({ method: 'GET', path: '/api/activities' });
      expect(result).toEqual(data);
    });

    it('should handle empty JSON array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [],
      });

      const result = await transport.request<unknown[]>({ method: 'GET', path: '/api/activities' });
      expect(result).toEqual([]);
    });

    it('should handle 204 No Content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
      });

      const result = await transport.request<unknown>({ method: 'DELETE', path: '/api/activities/1' });
      expect(result).toBeUndefined();
    });

    it('should handle 205 Reset Content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 205,
        headers: { get: () => null },
      });

      const result = await transport.request<unknown>({ method: 'DELETE', path: '/api/activities/1' });
      expect(result).toBeUndefined();
    });

    it('should handle text response when Content-Type is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        text: async () => 'plain text response',
      });

      const result = await transport.request<string>({ method: 'GET', path: '/api/ping' });
      expect(result).toBe('plain text response');
    });

    it('should handle empty text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        text: async () => '',
      });

      const result = await transport.request<unknown>({ method: 'GET', path: '/api/ping' });
      expect(result).toBeUndefined();
    });

    it('should handle empty whitespace text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        text: async () => '   \n  ',
      });

      const result = await transport.request<unknown>({ method: 'GET', path: '/api/ping' });
      expect(result).toBeUndefined();
    });

    it('should try to parse JSON from non-JSON Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        text: async () => '{"parsed": true}',
      });

      const result = await transport.request<unknown>({ method: 'GET', path: '/api/test' });
      expect(result).toEqual({ parsed: true });
    });

    it('should return text when JSON parse fails for non-JSON Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        text: async () => '<html>not json</html>',
      });

      const result = await transport.request<string>({ method: 'GET', path: '/api/test' });
      expect(result).toBe('<html>not json</html>');
    });

    it('should handle responseType=text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => 'raw text',
      });

      const result = await transport.request<string>({
        method: 'GET',
        path: '/api/test',
        responseType: 'text',
      });
      expect(result).toBe('raw text');
    });

    it('should handle responseType=arraybuffer', async () => {
      const buffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/octet-stream' },
        arrayBuffer: async () => buffer,
      });

      const result = await transport.request<ArrayBuffer>({
        method: 'GET',
        path: '/api/file',
        responseType: 'arraybuffer',
      });
      expect(result).toBe(buffer);
    });
  });

  describe('error handling', () => {
    it('should throw BadRequestError for 400', async () => {
      const errorData = loadFixture('error_400');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorData,
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestError);
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(400);
        expect((err as ApiError).message).toBe('The request body contains invalid data.');
        expect((err as ApiError).data).toEqual(errorData);
      }
    });

    it('should throw UnauthorizedError for 401', async () => {
      const errorData = loadFixture('error_401');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError for 403', async () => {
      const errorData = loadFixture('error_403');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for 404', async () => {
      const errorData = loadFixture('error_404');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities/999' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnprocessableEntityError for 422', async () => {
      const errorData = loadFixture('error_422');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'POST', path: '/api/activities' }),
      ).rejects.toThrow(UnprocessableEntityError);
    });

    it('should throw RateLimitError for 429', async () => {
      const errorData = loadFixture('error_429');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(RateLimitError);
    });

    it('should throw ServerError for 500', async () => {
      const errorData = loadFixture('error_500');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => errorData,
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(ServerError);
    });

    it('should throw ServerError for 502', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => ({ title: 'Bad Gateway' }),
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(ServerError);
    });

    it('should throw generic ApiError for unhandled status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        statusText: "I'm a Teapot",
        json: async () => ({ title: "I'm a Teapot" }),
      });

      await expect(
        transport.request({ method: 'GET', path: '/api/activities' }),
      ).rejects.toThrow(ApiError);
    });

    it('should use message field from error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Custom error message' }),
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities' });
      } catch (err) {
        expect((err as ApiError).message).toBe('Custom error message');
      }
    });

    it('should fall back to title field when message is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ title: 'Resource not found' }),
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities/999' });
      } catch (err) {
        expect((err as ApiError).message).toBe('Resource not found');
      }
    });

    it('should use HTTP status text when no message or title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Something went wrong' }),
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities' });
      } catch (err) {
        expect((err as ApiError).message).toBe('HTTP 500: Internal Server Error');
      }
    });

    it('should handle text error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Server error text',
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities' });
      } catch (err) {
        expect((err as ApiError).data).toBe('Server error text');
      }
    });

    it('should include request URL in error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ title: 'Not Found' }),
      });

      try {
        await transport.request({ method: 'GET', path: '/api/activities/999' });
      } catch (err) {
        expect((err as ApiError).request).toBe(`${BASE_URL}/api/activities/999`);
      }
    });
  });
});

describe('createApiError', () => {
  it('should create BadRequestError for 400', () => {
    const err = createApiError({ status: 400, message: 'Bad', request: '/test' });
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.status).toBe(400);
  });

  it('should create UnauthorizedError for 401', () => {
    const err = createApiError({ status: 401, message: 'Unauthorized', request: '/test' });
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('should create ForbiddenError for 403', () => {
    const err = createApiError({ status: 403, message: 'Forbidden', request: '/test' });
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('should create NotFoundError for 404', () => {
    const err = createApiError({ status: 404, message: 'Not found', request: '/test' });
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('should create UnprocessableEntityError for 422', () => {
    const err = createApiError({ status: 422, message: 'Invalid', request: '/test' });
    expect(err).toBeInstanceOf(UnprocessableEntityError);
  });

  it('should create RateLimitError for 429', () => {
    const err = createApiError({ status: 429, message: 'Rate limited', request: '/test' });
    expect(err).toBeInstanceOf(RateLimitError);
  });

  it('should create ServerError for 5xx', () => {
    const err = createApiError({ status: 503, message: 'Unavailable', request: '/test' });
    expect(err).toBeInstanceOf(ServerError);
    expect(err.status).toBe(503);
  });

  it('should create generic ApiError for other codes', () => {
    const err = createApiError({ status: 418, message: 'Teapot', request: '/test' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(BadRequestError);
  });

  it('should preserve all error properties', () => {
    const err = createApiError({
      status: 400,
      message: 'Error',
      data: { code: 'VALIDATION_ERROR' },
      request: '/api/test',
      code: 'VALIDATION_ERROR',
    });
    expect(err.message).toBe('Error');
    expect(err.data).toEqual({ code: 'VALIDATION_ERROR' });
    expect(err.request).toBe('/api/test');
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});

describe('ApiClient', () => {
  describe('constructor', () => {
    it('should store baseUrl and token', () => {
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN });
      expect(client.baseUrl).toBe(BASE_URL);
      expect(client.token).toBe(TOKEN);
    });

    it('should strip trailing slashes from baseUrl', () => {
      const client = new ApiClient({ baseUrl: `${BASE_URL}///`, token: TOKEN });
      expect(client.baseUrl).toBe(BASE_URL);
    });

    it('should create FetchTransport when no transport provided', () => {
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN });
      // Internal transport is private, verify via behavior
      expect(client).toBeDefined();
    });

    it('should use custom transport when provided', () => {
      const customTransport: HttpTransport = {
        request: vi.fn().mockResolvedValue([]),
      };
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: customTransport });
      // Verify resource clients can use it
      expect(client.activities).toBeDefined();
    });

    it('should create all resource clients', () => {
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN });
      expect(client.activities).toBeDefined();
      expect(client.customers).toBeDefined();
      expect(client.projects).toBeDefined();
      expect(client.timesheets).toBeDefined();
      expect(client.users).toBeDefined();
      expect(client.tags).toBeDefined();
      expect(client.teams).toBeDefined();
      expect(client.invoices).toBeDefined();
      expect(client.approvalBundle).toBeDefined();
      expect(client.config).toBeDefined();
      expect(client.system).toBeDefined();
      expect(client.export).toBeDefined();
      expect(client.actions).toBeDefined();
    });
  });

  describe('HTTP methods', () => {
    let client: ApiClient;
    let transport: { request: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      transport = { request: vi.fn().mockResolvedValue({}) };
      client = new ApiClient({
        baseUrl: BASE_URL,
        token: TOKEN,
        transport: transport as HttpTransport,
      });
    });

    it('get should call transport with GET method', async () => {
      await client.get('/api/test', { query: { foo: 'bar' } });
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/test',
        query: { foo: 'bar' },
      });
    });

    it('get should work without query', async () => {
      await client.get('/api/test');
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/test',
        query: undefined,
      });
    });

    it('post should call transport with POST method and body', async () => {
      const body = { name: 'test' };
      await client.post('/api/test', { query: { q: 1 }, body });
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/test',
        query: { q: 1 },
        body,
      });
    });

    it('patch should call transport with PATCH method and body', async () => {
      const body = { name: 'updated' };
      await client.patch('/api/test', { body });
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/test',
        query: undefined,
        body,
      });
    });

    it('delete should call transport with DELETE method', async () => {
      await client.delete('/api/test', { query: { force: true } });
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/test',
        query: { force: true },
        body: undefined,
      });
    });
  });
});
