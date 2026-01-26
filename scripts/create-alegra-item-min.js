const payload = {
  name: "TEST Olivia Shoes - Item Prueba IVA",
  reference: `TEST-OLIVIA-IVA-${Date.now()}`,
  status: "active",
  price: [
    {
      idPriceList: 1,
      price: 189000,
    },
  ],
  tax: [{ id: 3 }],
};

async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const priceListId = process.env.ALEGRA_PRICE_LIST_ID;
  const taxId = process.env.ALEGRA_TAX_ID;
  if (!email || !apiKey) {
    console.error("Faltan ALEGRA_EMAIL o ALEGRA_API_KEY en el entorno.");
    process.exit(1);
  }
  if (priceListId) {
    payload.price[0].idPriceList = Number(priceListId);
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
