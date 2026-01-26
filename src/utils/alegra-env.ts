export function getAlegraBaseUrl(environment?: string) {
  if (environment === "sandbox") {
    return "https://sandbox.alegra.com/api/v1";
  }
  return "https://api.alegra.com/api/v1";
}
