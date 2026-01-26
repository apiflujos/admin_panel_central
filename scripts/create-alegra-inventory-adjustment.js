const payload = {
  date: new Date().toISOString().slice(0, 10),
  observations: "Ajuste inventario prueba webhook",
  items: [],
};

async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const warehouseId = process.env.ALEGRA_WAREHOUSE_ID;
  const itemsJson = process.env.ALEGRA_ITEMS_JSON;
  const itemId = process.env.ALEGRA_ITEM_ID;
  const qty = process.env.ALEGRA_QTY;
  const unitCost = process.env.ALEGRA_UNIT_COST;
  if (!email || !apiKey) {
    console.error("Faltan ALEGRA_EMAIL o ALEGRA_API_KEY en el entorno.");
    process.exit(1);
  }

  if (itemsJson) {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error("ALEGRA_ITEMS_JSON debe ser un array JSON con items.");
      process.exit(1);
    }
    payload.items = parsed.map((item) => ({
      ...item,
      id: Number(item.id),
      quantity: Number(item.quantity),
      warehouse: item.warehouse || (warehouseId ? { id: Number(warehouseId) } : undefined),
    }));
  } else {
    if (!itemId || !qty) {
      console.error(
        "Faltan ALEGRA_ITEM_ID y/o ALEGRA_QTY (o usa ALEGRA_ITEMS_JSON)."
      );
      process.exit(1);
    }
    payload.items = [
      {
        id: Number(itemId),
        quantity: Number(qty),
        type: "input",
        unitCost: unitCost ? Number(unitCost) : undefined,
        warehouse: warehouseId ? { id: Number(warehouseId) } : undefined,
        observations: "Ajuste inventario prueba webhook",
      },
    ];
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const response = await fetch(`https://api.alegra.com/api/v1/inventory/adjustments`, {
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

  console.log("Ajuste de inventario creado OK:");
  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
