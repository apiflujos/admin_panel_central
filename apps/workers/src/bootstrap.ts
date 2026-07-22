import "dotenv/config";

import { assertStartupEnv } from "../../../src/utils/env-check";
import { startWorkersRuntime, workerRuntimeGroups } from ".";

// Workers no reciben OAuth callbacks, así que APP_HOST no es obligatorio aquí.
assertStartupEnv({ requireShopifyOAuth: false });

console.log("-------------------------------------------");
console.log("[workers] starting background runtime");
console.log(
  "[workers] groups",
  workerRuntimeGroups.map((group) => ({ key: group.key, jobs: group.jobs }))
);
console.log("-------------------------------------------");
startWorkersRuntime();
