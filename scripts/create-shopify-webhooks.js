const DEFAULT_API_VERSION = "2024-04";
const TOPICS = ["orders/create", "orders/updated"];

async function run() {
  const shopDomain = process.env.SHOPIFY_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
  const baseUrl = process.env.WEBHOOK_BASE_URL;
  if (!shopDomain || !accessToken || !baseUrl) {
    console.error("Faltan SHOPIFY_DOMAIN, SHOPIFY_ACCESS_TOKEN o WEBHOOK_BASE_URL.");
    process.exit(1);
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const address = `${normalizedBase}/api/webhooks/shopify`;
  const endpoint = `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin/api/${apiVersion}/webhooks.json`;

  for (const topic of TOPICS) {
    const payload = {
      webhook: {
        topic,
        address,
        format: "json",
      },
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`Shopify HTTP ${response.status} (${topic}): ${text}`);
      process.exit(1);
    }
    console.log(`Webhook creado (${topic}): ${text}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
