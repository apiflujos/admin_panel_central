import { LoginPage } from "../../../components/login-page";

export default async function AuthLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) || {};
  const hasError = resolved.error === "1";
  return <LoginPage hasError={hasError} />;
}
