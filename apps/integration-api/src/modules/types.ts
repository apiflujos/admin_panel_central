export type IntegrationApiModule = {
  key: "auth" | "settings" | "sync" | "webhooks" | "operations";
  label: string;
  mountPaths: string[];
};
