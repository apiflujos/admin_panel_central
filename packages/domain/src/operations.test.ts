import { normalizeOperationsDays, toAdminWebOperationsListDto } from "./operations";

describe("domain/operations", () => {
  it("normaliza days de operaciones", () => {
    expect(normalizeOperationsDays({ days: "15" })).toBe(15);
    expect(normalizeOperationsDays({ days: "0" })).toBe(7);
    expect(normalizeOperationsDays({ days: "-4" })).toBe(7);
    expect(normalizeOperationsDays({ days: "abc" })).toBe(7);
  });

  it("mapea operaciones y resume estados", () => {
    expect(
      toAdminWebOperationsListDto({
        items: [
          {
            id: "1",
            orderNumber: "#1001",
            customer: "Ana",
            products: "Sandalia",
            alegraStatus: "facturado",
            invoiceNumber: "F-1",
          },
          {
            id: "2",
            orderNumber: "#1002",
            customer: "Leo",
            products: "Bota",
            errorMessage: "Falló sync",
            einvoiceRequested: true,
            einvoiceMissing: ["email"],
          },
        ],
      })
    ).toMatchObject({
      summary: {
        invoicedCount: 1,
        failedCount: 1,
        einvoicePendingCount: 1,
      },
    });
  });
});
