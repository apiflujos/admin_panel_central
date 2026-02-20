import { describe, it, expect } from "vitest";
import { buildContactName, mapShopifyToAlegraContact, buildInvoicePayload } from "./shopify-to-alegra.service";

describe("shopify-to-alegra mapping logic", () => {
  const mockPayload = {
    id: 12345,
    name: "#1001",
    email: "customer@example.com",
    total_price: "150.00",
    currency: "COP",
    customer: {
      id: 67890,
      first_name: "John",
      last_name: "Doe",
      email: "customer@example.com",
      phone: "+573101234567",
      default_address: {
        address1: "Calle 123",
        city: "Bogotá",
        province: "Cundinamarca",
        zip: "110111",
        country_code: "CO",
      },
    },
    line_items: [
      {
        sku: "SKU-001",
        quantity: 2,
        price: "50.00",
        discounted_price: "45.00",
        title: "Product 1",
        variant_id: 111,
      },
      {
        sku: "SKU-002",
        quantity: 1,
        price: "60.00",
        title: "Product 2",
        variant_id: 222,
      },
    ],
  };

  describe("buildContactName", () => {
    it("should build name from first and last name", () => {
      const name = buildContactName(mockPayload);
      expect(name).toBe("John Doe");
    });

    it("should fallback to email if names are missing", () => {
      const payload = { ...mockPayload, customer: { ...mockPayload.customer, first_name: "", last_name: "" } };
      const name = buildContactName(payload);
      expect(name).toBe("customer@example.com");
    });
  });

  describe("mapShopifyToAlegraContact", () => {
    it("should map basic contact info correctly", () => {
      const contact = mapShopifyToAlegraContact(mockPayload, "customer@example.com", {});
      expect(contact.name).toBe("John Doe");
      expect(contact.email).toBe("customer@example.com");
      expect(contact.identification).toBe("3101234567"); // 57 stripped
      expect(contact.identificationType).toBe("CC");
    });

    it("should use override data when einvoice is active", () => {
      const override = {
        fiscalName: "John Doe SAS",
        idNumber: "900123456-1",
        idType: "NIT",
      };
      const contact = mapShopifyToAlegraContact(mockPayload, "billing@example.com", {
        einvoiceActive: true,
        override,
      });
      expect(contact.name).toBe("John Doe SAS");
      expect(contact.email).toBe("billing@example.com");
      expect(contact.identification).toBe("900123456-1");
      expect(contact.identificationType).toBe("NIT");
    });
  });

  describe("buildInvoicePayload", () => {
    const mockSettings = {
      generateInvoice: true,
      resolutionId: "101",
      costCenterId: "202",
      warehouseId: "303",
      sellerId: "404",
      paymentMethod: "cash",
      bankAccountId: "505",
      applyPayment: true,
      observationsTemplate: "Order {{order.name}}",
      einvoiceEnabled: false,
    };

    it("should map invoice data correctly", () => {
      const invoice = buildInvoicePayload(mockPayload, "999", mockSettings);
      expect(invoice.client).toBe(999);
      expect(invoice.resolution?.id).toBe(101);
      expect(invoice.warehouse?.id).toBe(303);
      expect(invoice.observations).toBe("Order #1001");
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0]).toEqual({
        name: "Product 1",
        price: 45,
        quantity: 2,
      });
      expect(invoice.items[1]).toEqual({
        name: "Product 2",
        price: 60,
        quantity: 1,
      });
    });

    it("should handle draft status if configured", () => {
      const settings = { ...mockSettings, invoiceStatus: "draft" as const };
      const invoice = buildInvoicePayload(mockPayload, "999", settings);
      expect(invoice.status).toBe("draft");
    });
  });
});
