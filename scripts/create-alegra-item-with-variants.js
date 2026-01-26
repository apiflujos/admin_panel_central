const uniqueSuffix = Date.now();
const baseReference = `TEST-AZUL-${uniqueSuffix}`;

const payload = {
  name: "TEST Azul Nuevo",
  reference: baseReference,
  status: "active",
  images: [
    {
      url: "https://via.placeholder.com/600x600.png?text=TEST+Azul",
    },
  ],
  price: [
    {
      idPriceList: 1,
      price: 189000,
    },
  ],
  itemVariants: [
    {
      name: "TEST Azul Nuevo - Talla 35",
      reference: `${baseReference}-35`,
      price: [{ idPriceList: 1, price: 189000 }],
      variantAttributes: [{ label: "Talla", value: "35" }],
    },
    {
      name: "TEST Azul Nuevo - Talla 36",
      reference: `${baseReference}-36`,
      price: [{ idPriceList: 1, price: 189000 }],
      variantAttributes: [{ label: "Talla", value: "36" }],
    },
    {
      name: "TEST Azul Nuevo - Talla 37",
      reference: `${baseReference}-37`,
      price: [{ idPriceList: 1, price: 189000 }],
      variantAttributes: [{ label: "Talla", value: "37" }],
    },
  ],
};

async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const priceListId = process.env.ALEGRA_PRICE_LIST_ID;
  const taxId = process.env.ALEGRA_TAX_ID;
  const imageUrl = process.env.ALEGRA_IMAGE_URL;
  if (!email || !apiKey) {
    console.error("Faltan ALEGRA_EMAIL o ALEGRA_API_KEY en el entorno.");
    process.exit(1);
  }

  if (priceListId) {
    payload.price[0].idPriceList = Number(priceListId);
    payload.itemVariants.forEach((variant) => {
      variant.price[0].idPriceList = Number(priceListId);
    });
  }
  if (taxId) {
    payload.tax = [{ id: Number(taxId) }];
  }
  if (imageUrl) {
    payload.images = [{ url: String(imageUrl) }];
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

  console.log("Item con variantes creado OK:");
  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
