const uniqueSuffix = Date.now();
const baseReference = `TEST-AZUL-${uniqueSuffix}`;

const payload = {
  name: "TEST Azul Nuevo",
  reference: baseReference,
  status: "active",
  inventory: {
    unit: "unit",
  },
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
    },
    {
      name: "TEST Azul Nuevo - Talla 36",
      reference: `${baseReference}-36`,
      price: [{ idPriceList: 1, price: 189000 }],
    },
    {
      name: "TEST Azul Nuevo - Talla 37",
      reference: `${baseReference}-37`,
      price: [{ idPriceList: 1, price: 189000 }],
    },
  ],
};

async function fetchVariantAttributeId(auth, baseUrl, attributeName) {
  const endpoints = [
    "/items/variant-attributes",
    "/item-variants/attributes",
    "/variant-attributes",
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      continue;
    }
    const payload = await response.json();
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    const match = items.find((item) => {
      const name = String(item?.name || item?.label || "").toLowerCase();
      return name === attributeName.toLowerCase();
    });
    if (match?.id) {
      return { id: Number(match.id), endpoint };
    }
  }
  return { id: null, endpoint: null };
}

async function createVariantAttribute(auth, baseUrl, attributeName) {
  const endpoints = [
    "/items/variant-attributes",
    "/item-variants/attributes",
    "/variant-attributes",
  ];
  const payloads = [
    { name: attributeName },
    { label: attributeName },
  ];
  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
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
        continue;
      }
      try {
        const parsed = JSON.parse(text);
        const id = parsed?.id || parsed?.data?.id || parsed?.item?.id;
        if (id) {
          return { id: Number(id), endpoint };
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return { id: null, endpoint: null };
}

async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const priceListId = process.env.ALEGRA_PRICE_LIST_ID;
  const taxId = process.env.ALEGRA_TAX_ID;
  const imageUrl = process.env.ALEGRA_IMAGE_URL;
  const unit = process.env.ALEGRA_UNIT;
  const variantAttrId = process.env.ALEGRA_VARIANT_ATTRIBUTE_ID;
  const variantAttrName = process.env.ALEGRA_VARIANT_ATTRIBUTE_NAME || "Talla";
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
  } else {
    delete payload.tax;
  }
  if (imageUrl) {
    payload.images = [{ url: String(imageUrl) }];
  }
  if (unit) {
    payload.inventory.unit = String(unit);
  }
  const baseUrl = "https://api.alegra.com/api/v1";
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  let resolvedAttrId = variantAttrId ? Number(variantAttrId) : null;
  if (!resolvedAttrId) {
    const found = await fetchVariantAttributeId(auth, baseUrl, variantAttrName);
    resolvedAttrId = found.id;
  }
  if (!resolvedAttrId) {
    const created = await createVariantAttribute(auth, baseUrl, variantAttrName);
    resolvedAttrId = created.id;
  }
  if (!resolvedAttrId) {
    console.error(
      `No se encontro ni se pudo crear el atributo de variante "${variantAttrName}". Define ALEGRA_VARIANT_ATTRIBUTE_ID.`
    );
    process.exit(1);
  }

  payload.itemVariants.forEach((variant) => {
    variant.variantAttributes = [
      {
        id: resolvedAttrId,
        label: variantAttrName,
        value: variant.reference?.split("-").pop() || "",
      },
    ];
  });

  const response = await fetch(`${baseUrl}/items`, {
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
