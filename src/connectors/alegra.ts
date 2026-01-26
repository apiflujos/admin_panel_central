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

  async listItemsUpdatedSince(updatedAtMin: string) {
    return this.request(`/items?updated_at_start=${encodeURIComponent(updatedAtMin)}`);
  }

  async findContactByEmail(email: string) {
    return this.request(`/contacts?email=${encodeURIComponent(email)}`);
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
    return this.request(`/inventory/adjustments`, { method: "POST", body: payload });
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

  private async request(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {}
  ) {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString(
      "base64"
    );
    const controller = new AbortController();
    const timeoutMs = Number(process.env.ALEGRA_TIMEOUT_MS || 10000);
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
}
