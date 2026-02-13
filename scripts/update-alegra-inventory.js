const payload = {
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
  const itemId = process.env.ALEGRA_ITEM_ID;
  const warehouseId = process.env.ALEGRA_WAREHOUSE_ID;
  const qty = process.env.ALEGRA_QTY;
  const unit = process.env.ALEGRA_UNIT;
  if (!email || !apiKey || !itemId) {
    console.error("Faltan ALEGRA_EMAIL, ALEGRA_API_KEY o ALEGRA_ITEM_ID en el entorno.");
    process.exit(1);
  }

  if (warehouseId) {
    payload.inventory.warehouses[0].id = Number(warehouseId);
  }
  if (qty) {
    payload.inventory.availableQuantity = Number(qty);
    payload.inventory.warehouses[0].availableQuantity = Number(qty);
  }
  if (unit) {
    payload.inventory.unit = unit;
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const response = await fetch(`https://api.alegra.com/api/v1/items/${itemId}`, {
    method: "PUT",
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

  console.log("Inventario actualizado OK:");
  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
