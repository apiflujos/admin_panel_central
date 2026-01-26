const uniqueSuffix = Date.now();
const payload = {
  name: `TEST Olivia Shoes - Item Prueba IVA ${uniqueSuffix}`,
  reference: `TEST-OLIVIA-IVA-${uniqueSuffix}`,
  description: "Item de prueba para validar precio, IVA y existencias.",
  status: "active",
  price: [
    {
      idPriceList: 1,
      price: 189000,
    },
  ],
  inventory: {
    availableQuantity: 15,
    unit: "unit",
    warehouses: [
      {
        id: 1,
        availableQuantity: 15,
      },
    ],
  },
};

async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const taxId = process.env.ALEGRA_TAX_ID;
  const priceListId = process.env.ALEGRA_PRICE_LIST_ID;
  const warehouseId = process.env.ALEGRA_WAREHOUSE_ID;
  const unit = process.env.ALEGRA_UNIT;
  if (!email || !apiKey) {
    console.error("Faltan ALEGRA_EMAIL o ALEGRA_API_KEY en el entorno.");
    process.exit(1);
  }

  if (priceListId) {
    payload.price[0].idPriceList = Number(priceListId);
  }
  if (warehouseId) {
    payload.inventory.warehouses[0].id = Number(warehouseId);
  }
  if (unit) {
    payload.inventory.unit = unit;
  }
  if (taxId) {
    payload.tax = [{ id: Number(taxId) }];
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const response = await fetch("https://api.alegra.com/api/v1/items", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`Alegra HTTP ${response.status}: ${text}`);
    console.error("Payload enviado:");
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log("Item creado OK:");
  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
