async function run() {
  const email = process.env.ALEGRA_EMAIL;
  const apiKey = process.env.ALEGRA_API_KEY;
  const reference = process.env.ALEGRA_REFERENCE;
  if (!email || !apiKey || !reference) {
    console.error("Faltan ALEGRA_EMAIL, ALEGRA_API_KEY o ALEGRA_REFERENCE en el entorno.");
    process.exit(1);
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const params = new URLSearchParams({
    metadata: "true",
    limit: "30",
    reference,
  });
  const response = await fetch(`https://api.alegra.com/api/v1/items?${params.toString()}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`Alegra HTTP ${response.status}: ${text}`);
    process.exit(1);
  }

  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
