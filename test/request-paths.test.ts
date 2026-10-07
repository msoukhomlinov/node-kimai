// Request path construction: identifier validation and URL building.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, FetchTransport } from '../src/client';
import { KimaiConfigError } from '../src/errors';
import { invokeOperation } from '../src/operations/index';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

const MALFORMED_IDS: unknown[] = ['abc', -1, 1.5, '1/2', 0, Number.NaN];

let client: ApiClient;
let transport: { request: ReturnType<typeof vi.fn> };

beforeEach(() => {
  transport = { request: vi.fn().mockResolvedValue({}) };
  client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: transport as never });
});

type Call = (c: ApiClient, id: never) => Promise<unknown>;

/** One representative id-taking method per resource client, and the path a valid id produces. */
const METHODS: Array<[string, Call, string]> = [
  ['activities.get', (c, id) => c.activities.get(id), '/api/activities/7'],
  ['activities.deleteRate', (c, id) => c.activities.deleteRate(1, id), '/api/activities/1/rates/7'],
  ['customers.delete', (c, id) => c.customers.delete(id), '/api/customers/7'],
  ['customers.deleteComment', (c, id) => c.customers.deleteComment(1, id), '/api/customers/1/comments/7'],
  ['projects.update', (c, id) => c.projects.update(id, { name: 'x', customer: 1 } as never), '/api/projects/7'],
  ['projects.deleteRate', (c, id) => c.projects.deleteRate(id, 2), '/api/projects/7/rates/2'],
  ['timesheets.delete', (c, id) => c.timesheets.delete(id), '/api/timesheets/7'],
  ['timesheets.stop', (c, id) => c.timesheets.stop(id), '/api/timesheets/7/stop'],
  ['users.deleteApiToken', (c, id) => c.users.deleteApiToken(id), '/api/users/api-token/7'],
  ['teams.removeMember', (c, id) => c.teams.removeMember(1, id), '/api/teams/1/members/7'],
  ['tags.delete', (c, id) => c.tags.delete(id), '/api/tags/7'],
  ['invoices.get', (c, id) => c.invoices.get(id), '/api/invoices/7'],
  ['export.deleteTemplate', (c, id) => c.export.deleteTemplate(id), '/api/export/7'],
  ['actions.getActions', (c, id) => c.actions.getActions('project', id, 'index', 'en'), '/api/actions/project/7/index/en'],
];

describe('resource clients - identifiers in request paths', () => {
  it.each(METHODS)('%s builds the same path for a valid id', async (_name, call, path) => {
    await call(client, 7 as never);
    expect(transport.request).toHaveBeenCalledWith(expect.objectContaining({ path }));
  });

  it.each(METHODS)('%s rejects malformed identifiers with no request', async (_name, call) => {
    for (const id of MALFORMED_IDS) {
      await expect(call(client, id as never)).rejects.toBeInstanceOf(KimaiConfigError);
    }
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('dry-run rejects malformed identifiers instead of describing a request', async () => {
    for (const id of MALFORMED_IDS) {
      await expect(client.timesheets.delete(id as never, { dryRun: true })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.teams.addMember(1, id as never, { dryRun: true })).rejects.toBeInstanceOf(KimaiConfigError);
    }
    expect(transport.request).not.toHaveBeenCalled();
  });

  it.each([
    ['resource', ['other', 1, 'index', 'en']],
    ['view', ['project', 1, 'a/b', 'en']],
    ['locale', ['project', 1, 'index', 'e n']],
    ['view (empty)', ['project', 1, '', 'en']],
  ])('actions.getActions rejects a malformed %s segment', async (_name, args) => {
    const [resource, id, view, locale] = args as [never, number, string, string];
    await expect(client.actions.getActions(resource, id, view, locale)).rejects.toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('rejects a malformed path handed to the client directly', async () => {
    await expect(client.get('/api/a//b')).rejects.toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('operations.invoke - identifiers', () => {
  it.each([
    ['timesheets.delete', (id: unknown) => ({ id }), { confirm: 'timesheets.delete', dryRun: false }],
    ['activities.get', (id: unknown) => ({ id }), {}],
    ['teams.removeMember', (id: unknown) => ({ teamId: 1, userId: id }), { confirm: 'teams.removeMember', dryRun: false }],
  ] as const)('%s rejects malformed identifiers before any request', async (operation, input, options) => {
    for (const value of MALFORMED_IDS) {
      const err = await invokeOperation(client, operation, input(value), options).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(KimaiConfigError);
      expect((err as KimaiConfigError).message).toContain('No request was issued');
    }
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('rejects a malformed resolve identifier id', async () => {
    const err = await invokeOperation(client, 'activities.resolve', { identifier: { id: 'abc' } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('still dispatches a valid id', async () => {
    await invokeOperation(client, 'timesheets.delete', { id: 3 }, { confirm: 'timesheets.delete', dryRun: false });
    expect(transport.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/api/timesheets/3' }));
  });
});

describe('FetchTransport - URL building', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const ok = { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] };

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(ok);
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['https://host/kimai', '/api/activities', 'https://host/kimai/api/activities'],
    ['https://host/kimai/', '/api/activities', 'https://host/kimai/api/activities'],
    ['https://host', '/api/activities/7', 'https://host/api/activities/7'],
    ['https://host/', 'api/activities', 'https://host/api/activities'],
  ])('base %s + %s -> %s', async (base, path, expected) => {
    await new FetchTransport(base, TOKEN).request({ method: 'GET', path });
    expect(mockFetch.mock.calls[0]![0]).toBe(expected);
  });

  it('keeps query parameters in the query string', async () => {
    await new FetchTransport(`${BASE_URL}/kimai`, TOKEN).request({ method: 'GET', path: '/api/timesheets', query: { users: [1, 2], term: 'a b' } });
    expect(mockFetch.mock.calls[0]![0]).toBe(`${BASE_URL}/kimai/api/timesheets?users=1&users=2&term=a+b`);
  });

  it('rejects a malformed path with no fetch', async () => {
    for (const path of ['/api/a//b', '']) {
      await expect(new FetchTransport(BASE_URL, TOKEN).request({ method: 'GET', path })).rejects.toBeInstanceOf(KimaiConfigError);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
