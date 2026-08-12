// InvoiceClient tests - includes pagination
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('InvoiceClient', () => {
  let client: ApiClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
  });

  describe('list', () => {
    it('should call GET /api/invoices', async () => {
      const fixture = loadFixture('invoice');
      transport.request.mockResolvedValueOnce(fixture);

      await client.invoices.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/invoices',
        query: undefined,
      });
    });

    it('should pass query params', async () => {
      const fixture = loadFixture('invoice');
      transport.request.mockResolvedValueOnce(fixture);

      await client.invoices.list({ customer: 1, page: 2, size: 50 });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/invoices',
        query: { customer: 1, page: 2, size: 50 },
      });
    });
  });

  describe('getAll', () => {
    it('should paginate until empty', async () => {
      const page1 = loadFixture('invoice');
      const emptyPage: unknown[] = [];

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(emptyPage);

      // Use size=1 so 2 items triggers pagination
      await client.invoices.getAll({ size: 1 });

      expect(transport.request).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        path: '/api/invoices',
        query: { page: 1, size: 1 },
      });
      expect(transport.request).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        path: '/api/invoices',
        query: { page: 2, size: 1 },
      });
    });

    it('should stop when less than size returned', async () => {
      const fixture = loadFixture('invoice') as unknown[];
      const page1 = fixture; // 2 items - equals size=2, continue
      const page2 = [fixture[0]]; // 1 item - less than size=2, stop

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await client.invoices.getAll({ size: 2 });

      expect(transport.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual([...page1, ...page2]);
    });

    it('should preserve additional query params across pages', async () => {
      const page1 = loadFixture('invoice');
      transport.request.mockResolvedValueOnce(page1);

      await client.invoices.getAll({ customer: 5 });

      const call = transport.request.mock.calls[0][0];
      expect(call.query.customer).toBe(5);
    });
  });

  describe('listPages', () => {
    it('should yield pages as async iterable', async () => {
      const fixture = loadFixture('invoice') as unknown[];
      const page1 = fixture; // 2 items - equals size=2, continue
      const page2 = [fixture[0]]; // 1 item - less than size=2, stop

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const pages: unknown[][] = [];
      for await (const page of client.invoices.listPages({ size: 2 })) {
        pages.push(page as unknown[]);
      }

      expect(pages).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('should call GET /api/invoices/{id}', async () => {
      const fixture = loadFixture('invoice_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.invoices.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/invoices/1',
      });
    });
  });

  describe('updateCustomFields', () => {
    it('should call PATCH /api/invoices/{id}/custom-fields', async () => {
      const fixture = loadFixture('invoice_single');
      transport.request.mockResolvedValueOnce(fixture);

      const fields = [{ name: 'po_number', value: 'PO-123' }];
      await client.invoices.updateCustomFields(1, fields);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/invoices/1/custom-fields',
        body: fields,
      });
    });
  });

  describe('download', () => {
    it('should call GET /api/invoices/{id}/download with responseType=arraybuffer', async () => {
      const buffer = new ArrayBuffer(10);
      transport.request.mockResolvedValueOnce(buffer);

      const result = await client.invoices.download(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/invoices/1/download',
        responseType: 'arraybuffer',
      });
      expect(result).toBe(buffer);
    });
  });

  describe('no delete method', () => {
    it('should NOT have a delete(id) method', () => {
      expect(client.invoices.delete).toBeUndefined();
    });
  });
});
