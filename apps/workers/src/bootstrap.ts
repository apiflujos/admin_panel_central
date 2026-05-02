import "dotenv/config";

import { startWorkersRuntime, workerRuntimeGroups } from ".";

console.log("-------------------------------------------");
console.log("[workers] starting background runtime");
console.log(
  "[workers] groups",
  workerRuntimeGroups.map((group) => ({ key: group.key, jobs: group.jobs }))
);
console.log("-------------------------------------------");
startWorkersRuntime();
