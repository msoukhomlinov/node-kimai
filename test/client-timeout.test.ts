// issue #7: request timeout / AbortSignal / cancellation — typed errors at the wire seam
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, FetchTransport, type HttpTransport, type TransportRequest } from '../src/client';
import { ApiError, KimaiConfigError } from '../src/errors';
import { isKimaiError } from '../src/guards';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token-123';

/** A fetch stub that settles only when the passed signal aborts (models a hung Kimai). */
function hungFetchStub(): ReturnType<typeof vi.fn> {
  return vi.fn((_url: string | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const fail = () => reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
      if (signal?.aborted) {
        fail();
        return;
      }
      signal?.addEventListener('abort', fail, { once: true });
    }),
  );
}

/** The shape a successful response has when the test cares about its body handling. */
const okResponse = {
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => [],
};

/** Await a request that is expected to reject; returns the rejection value. */
async function rejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (err) {
    return err;
  }
  throw new Error('expected the request to reject, but it resolved');
}

describe('FetchTransport timeout / abort / network (issue #7)', () => {
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

  describe('deadline timeout', () => {
    it('rejects with a typed timeout error when the deadline fires', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);

      const err = (await rejection(transport
        .request({ method: 'GET', path: '/api/activities', signal: AbortSignal.timeout(20) })
        )) as ApiError;

      expect(err).toBeInstanceOf(ApiError);
      expect(isKimaiError(err)).toBe(true);
      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
      expect(err.status).toBe(0);
      expect(err.httpStatus).toBe(0);
      expect(err.retryable).toBe(true);
      expect(err.request).toBe(`${BASE_URL}/api/activities`);
      expect(err.message).toBe('The request to the Kimai instance timed out.');
      expect(err.suggestedAction).toBe('Retry the call; if timeouts persist, check the Kimai instance and the network path.');
      expect(typeof err.correlationId).toBe('string');
      expect(stub).toHaveBeenCalledOnce();
    });

    it('classifies a mid-body abort (deadline) the same way', async () => {
      mockFetch.mockImplementation((_url: string | URL, init?: RequestInit) => {
        const signal = init?.signal;
        return Promise.resolve({
          ...okResponse,
          json: () =>
            new Promise<unknown>((_resolve, reject) => {
              if (signal?.aborted) {
                reject(new Error('aborted'));
                return;
              }
              signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
            }),
        });
      });

      const err = (await rejection(transport
        .request({ method: 'GET', path: '/api/activities', signal: AbortSignal.timeout(20) })
        )) as ApiError;

      expect(err).toBeInstanceOf(ApiError);
      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
    });

    it('passes through non-abort body consumption failures unchanged', async () => {
      const boom = new Error('boom');
      mockFetch.mockImplementation(() => Promise.resolve({ ...okResponse, json: async () => { throw boom; } }));

      const err = (await rejection(transport.request({ method: 'GET', path: '/api/activities' })));
      expect(err).toBe(boom);
    });
  });

  describe('external abort', () => {
    it('an aborted per-request signal rejects with the typed timeout-category error', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);

      const controller = new AbortController();
      const p = transport.request({ method: 'GET', path: '/api/activities', signal: controller.signal });
      setTimeout(() => controller.abort(), 10);
      const err = (await rejection(p)) as ApiError;

      expect(err).toBeInstanceOf(ApiError);
      expect(isKimaiError(err)).toBe(true);
      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
      expect(err.status).toBe(0);
      expect(err.retryable).toBe(true);
      expect(err.request).toBe(`${BASE_URL}/api/activities`);
      expect(err.message).toBe('The request was aborted before the Kimai instance responded.');
    });

    it('an already-aborted signal rejects before any fetch settles', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);

      const controller = new AbortController();
      controller.abort();
      const err = (await rejection(transport
        .request({ method: 'GET', path: '/api/activities', signal: controller.signal })
        )) as ApiError;

      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
      expect(err.message).toBe('The request was aborted before the Kimai instance responded.');
    });
  });

  describe('network failure', () => {
    it('rejects with a typed network error when fetch fails (undici cause preserved)', async () => {
      const networkError = Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:1'), { code: 'ECONNREFUSED' }),
      });
      mockFetch.mockRejectedValueOnce(networkError);

      const err = (await rejection(transport.request({ method: 'GET', path: '/api/activities' }))) as ApiError;

      expect(err).toBeInstanceOf(ApiError);
      expect(isKimaiError(err)).toBe(true);
      expect(err.category).toBe('network');
      expect(err.code).toBe('NETWORK');
      expect(err.status).toBe(0);
      expect(err.retryable).toBe(true);
      expect(err.request).toBe(`${BASE_URL}/api/activities`);
      expect(err.message).toBe('The Kimai API could not be reached (network failure: connect ECONNREFUSED 127.0.0.1:1).');
      expect(err.suggestedAction).toBe('Check connectivity to the Kimai instance and retry.');
      expect(err.data).toBe(networkError);
      expect(typeof err.correlationId).toBe('string');
    });

    it('reports the fetch error message when the failure has no cause', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      const err = (await rejection(transport.request({ method: 'GET', path: '/api/activities' }))) as ApiError;
      expect(err.category).toBe('network');
      expect(err.code).toBe('NETWORK');
      expect(err.message).toBe('The Kimai API could not be reached (network failure: fetch failed).');
    });

    it('classifies as network (not abort) when a signal is set but never fired', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
      const controller = new AbortController(); // never aborts

      const err = (await rejection(transport
        .request({ method: 'GET', path: '/api/activities', signal: controller.signal })
        )) as ApiError;

      expect(err.category).toBe('network');
      expect(err.code).toBe('NETWORK');
    });
  });

  describe('no-timeout default (back-compat)', () => {
    it('calls fetch with no signal when no deadline or signal is configured', async () => {
      mockFetch.mockResolvedValueOnce(okResponse);

      await transport.request({ method: 'GET', path: '/api/activities' });

      const [, init] = mockFetch.mock.calls[0]!;
      expect(init.signal).toBeUndefined();
    });
  });
});

describe('ApiClient timeout / abort wiring (issue #7)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor option', () => {
    it('rejects a non-positive or non-finite timeoutMs with KimaiConfigError (zero wire activity)', () => {
      for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => new ApiClient({ baseUrl: BASE_URL, token: TOKEN, timeoutMs: bad })).toThrow(KimaiConfigError);
      }
      expect(() => new ApiClient({ baseUrl: BASE_URL, token: TOKEN, timeoutMs: 30_000 })).not.toThrow();
    });

    it('stores the deadline and applies it to requests that set no per-request timeout', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, timeoutMs: 20 });

      const started = Date.now();
      const err = (await rejection(client.get('/api/activities'))) as ApiError;
      expect(Date.now() - started).toBeLessThan(5_000);

      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
      expect(stub).toHaveBeenCalledOnce();
    });

    it('a per-request timeoutMs wins over the constructor deadline', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, timeoutMs: 60_000 });

      const started = Date.now();
      const err = (await rejection(client.get('/api/activities', { timeoutMs: 20 }))) as ApiError;
      // the 20 ms per-request deadline won; the 60 s constructor deadline would have
      // outrun this test by far (and would trip the vitest timeout if it had won)
      expect(Date.now() - started).toBeLessThan(5_000);

      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
    });
  });

  describe('per-request signal', () => {
    it('an external abort mid-request (via the client) yields the typed error', async () => {
      const stub = hungFetchStub();
      vi.stubGlobal('fetch', stub);
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN });

      const controller = new AbortController();
      const p = client.get('/api/activities', { signal: controller.signal });
      setTimeout(() => controller.abort(), 10);
      const err = (await rejection(p)) as ApiError;

      expect(err.category).toBe('timeout');
      expect(err.code).toBe('TIMEOUT');
      expect(err.message).toBe('The request was aborted before the Kimai instance responded.');
    });

    it('passes the per-request signal through to a custom transport (identity, no deadline set)', async () => {
      const request = vi.fn().mockResolvedValue({});
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: { request } as HttpTransport });

      const controller = new AbortController();
      await client.get('/api/activities', { signal: controller.signal });

      const received: TransportRequest = request.mock.calls[0]![0];
      expect(received.signal).toBe(controller.signal);
    });

    it('combines the constructor deadline with a per-request signal for a custom transport', async () => {
      const request = vi.fn().mockResolvedValue({});
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, timeoutMs: 60_000, transport: { request } as HttpTransport });

      const controller = new AbortController();
      await client.get('/api/activities', { signal: controller.signal });

      const received: TransportRequest = request.mock.calls[0]![0];
      expect(received.signal).toBeDefined();
      expect(received.signal).not.toBe(controller.signal);
      expect(received.signal?.aborted).toBe(false);
      controller.abort();
      expect(received.signal?.aborted).toBe(true);
    });

    it('sends no signal to a custom transport when nothing is configured', async () => {
      const request = vi.fn().mockResolvedValue({});
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: { request } as HttpTransport });

      await client.get('/api/activities');

      const received: TransportRequest = request.mock.calls[0]![0];
      expect(received.signal).toBeUndefined();
    });

    it('rejects an invalid per-request timeoutMs before any wire activity', async () => {
      const request = vi.fn();
      const client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: { request } as HttpTransport });

      await expect(client.get('/api/activities', { timeoutMs: 0 })).rejects.toThrow(KimaiConfigError);
      expect(request).not.toHaveBeenCalled();
    });
  });
});
