// InvoiceClient - Invoice resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { Invoice, InvoiceMeta, InvoiceListParams } from '../types';

import type { ApiClient } from '../client';

export class InvoiceClient {
  constructor(private client: ApiClient) {}

  async list(params?: InvoiceListParams): Promise<Invoice[]> {
    return this.client.get<Invoice[]>('/api/invoices', { query: params });
  }

  async getAll(params?: InvoiceListParams): Promise<Invoice[]> {
    const query = { ...params };
    const pages: Invoice[] = [];
    let page = query.page || 1;
    const size = query.size || 100;

    while (true) {
      const results = await this.client.get<Invoice[]>('/api/invoices', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      pages.push(...results);
      if (results.length < size) break;
      page++;
    }
    return pages;
  }

  async *listPages(params?: InvoiceListParams): AsyncIterable<Invoice[]> {
    const query = { ...params };
    const size = query.size || 100;
    let page = query.page || 1;

    while (true) {
      const results = await this.client.get<Invoice[]>('/api/invoices', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      yield results;
      if (results.length < size) break;
      page++;
    }
  }

  async getById(id: number): Promise<Invoice> {
    return this.client.get<Invoice>(`/api/invoices/${id}`);
  }

  async updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice> {
    return this.client.patch<Invoice>(`/api/invoices/${id}/custom-fields`, { body: fields });
  }

  async download(id: number): Promise<ArrayBuffer> {
    return this.client.get<ArrayBuffer>(`/api/invoices/${id}/download`, { responseType: 'arraybuffer' });
  }
}
