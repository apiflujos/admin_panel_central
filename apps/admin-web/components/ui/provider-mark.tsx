const providerLogos: Record<string, string> = {
  Shopify: "/brands/shopify.png",
  WooCommerce: "/brands/woocommerce.png",
  Alegra: "/brands/alegra.png",
  "Google Ads": "/brands/googleads.png",
  "Meta Ads": "/brands/meta.png",
  "TikTok Ads": "/brands/tiktok.png",
};

export function ProviderMark({ provider }: { provider: string }) {
  const src = providerLogos[provider];
  if (!src) return null;
  return <img className="provider-mark" src={src} alt={provider} />;
}
