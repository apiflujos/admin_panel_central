export type AlegraConfig = {
  email: string;
  apiKey: string;
  baseUrl?: string;
};

export class AlegraClient {
  private baseUrl: string;

  constructor(private config: AlegraConfig) {
    this.baseUrl = config.baseUrl || "https://api.alegra.com/api/v1";
  }

  async getItem(itemId: string) {
    return this.request(`/items/${itemId}`);
  }

  async getItemWithParams(itemId: string, params: Record<string, unknown>) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const normalized =
        typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      if (normalized.trim() === "") return;
      query.set(key, normalized);
    });
    const suffix = query.toString();
    return this.request(`/items/${itemId}${suffix ? `?${suffix}` : ""}`);
  }

  async listItemsUpdatedSince(queryOrDate: string) {
    const query = queryOrDate.includes("=")
      ? queryOrDate
      : `updated_at_start=${encodeURIComponent(queryOrDate)}`;
    return this.request(`/items?${query}`);
  }

  async searchItems(params: Record<string, unknown>) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const normalized =
        typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      if (normalized.trim() === "") return;
      query.set(key, normalized);
    });
    const suffix = query.toString();
    return this.request(`/items${suffix ? `?${suffix}` : ""}`);
  }

  async findContactByEmail(email: string) {
    return this.request(`/contacts?email=${encodeURIComponent(email)}`);
  }

  async getContact(id: string) {
    return this.request(`/contacts/${id}`);
  }

  async createContact(payload: Record<string, unknown>) {
    return this.request(`/contacts`, { method: "POST", body: payload });
  }

  async updateContact(id: string, payload: Record<string, unknown>) {
    return this.request(`/contacts/${id}`, { method: "PUT", body: payload });
  }

  async createInvoice(payload: Record<string, unknown>) {
    return this.request(`/invoices`, { method: "POST", body: payload });
  }

  async createInventoryAdjustment(payload: Record<string, unknown>) {
    return this.request(`/inventory-adjustments`, { method: "POST", body: payload });
  }

  async createInventoryTransfer(payload: Record<string, unknown>) {
    return this.request(`/inventory-transfers`, { method: "POST", body: payload });
  }

  async createItem(payload: Record<string, unknown>) {
    return this.request(`/items`, { method: "POST", body: payload });
  }

  async updateItem(id: string, payload: Record<string, unknown>) {
    return this.request(`/items/${id}`, { method: "PUT", body: payload });
  }

  async listInvoiceResolutions() {
    return this.request(`/invoices/resolutions`);
  }

  async listWarehouses() {
    return this.request(`/warehouses`);
  }

  async listCostCenters() {
    return this.request(`/cost-centers`);
  }

  async listSellers() {
    return this.request(`/sellers`);
  }

  async listPaymentMethods() {
    return this.request(`/paymentMethods`);
  }

  async listBankAccounts() {
    return this.request(`/bank-accounts`);
  }

  async listPriceLists() {
    return this.request(`/price-lists`);
  }

  async createPayment(payload: Record<string, unknown>) {
    return this.request(`/payments`, { method: "POST", body: payload });
  }

  async listPayments(options?: { limit?: number; start?: number }) {
    const params = new URLSearchParams();
    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options?.start === "number") {
      params.set("start", String(options.start));
    }
    const query = params.toString();
    return this.request(`/payments${query ? `?${query}` : ""}`);
  }

  async listItems(options?: { limit?: number; start?: number }) {
    const params = new URLSearchParams();
    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options?.start === "number") {
      params.set("start", String(options.start));
    }
    const query = params.toString();
    return this.request(`/items${query ? `?${query}` : ""}`);
  }

  async listInvoices(options?: { limit?: number; start?: number }) {
    const params = new URLSearchParams();
    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options?.start === "number") {
      params.set("start", String(options.start));
    }
    const query = params.toString();
    return this.request(`/invoices${query ? `?${query}` : ""}`);
  }

  async listContacts(options?: { limit?: number; start?: number }) {
    const params = new URLSearchParams();
    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options?.start === "number") {
      params.set("start", String(options.start));
    }
    const query = params.toString();
    return this.request(`/contacts${query ? `?${query}` : ""}`);
  }

  async updateInvoice(id: string, payload: Record<string, unknown>) {
    return this.request(`/invoices/${id}`, { method: "PUT", body: payload });
  }

  async getInvoice(id: string) {
    return this.request(`/invoices/${id}`);
  }

  async getInvoicePdf(id: string) {
    const response = await this.requestRaw(`/invoices/${id}/pdf`, {
      method: "GET",
      accept: "application/pdf",
    });
    const contentType = response.headers.get("content-type") || "application/pdf";
    if (contentType.includes("application/json")) {
      const json = await response.json().catch(() => null);
      const url =
        json && typeof json === "object"
          ? (typeof (json as any).pdfUrl === "string"
              ? (json as any).pdfUrl
              : typeof (json as any).url === "string"
                ? (json as any).url
                : "")
          : "";
      if (url) {
        const fallback = await fetch(url);
        if (!fallback.ok) {
          const text = await fallback.text().catch(() => "");
          throw new Error(`Alegra PDF fetch error: ${fallback.status} ${text}`);
        }
        const buffer = Buffer.from(await fallback.arrayBuffer());
        return { contentType: fallback.headers.get("content-type") || "application/pdf", content: buffer };
      }
      throw new Error("Alegra PDF endpoint devolvio JSON inesperado.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { contentType, content: buffer };
  }

  private async request(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {}
  ) {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString(
      "base64"
    );
    const controller = new AbortController();
    const timeoutMs = Number(process.env.ALEGRA_TIMEOUT_MS || 30000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Alegra API error: ${response.status} ${text}`);
    }

    return response.json();
  }

  private async requestRaw(
    path: string,
    options: { method?: string; body?: Record<string, unknown>; accept?: string } = {}
  ) {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString("base64");
    const controller = new AbortController();
    const timeoutMs = Number(process.env.ALEGRA_TIMEOUT_MS || 30000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: options.accept || "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Alegra API error: ${response.status} ${text}`);
    }

    return response;
  }
}
