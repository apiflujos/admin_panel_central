import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
  if (client) return client;
  if (connectPromise) return connectPromise;
  const url = String(process.env.MONGO_URL || "").trim();
  if (!url) {
    throw new Error("MONGO_URL is required");
  }
  const nextClient = new MongoClient(url);
  connectPromise = nextClient
    .connect()
    .then((connected) => {
      client = connected;
      return connected;
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });
  return connectPromise;
}

export async function getMongoDb(dbName?: string): Promise<Db> {
  const mongoClient = await getMongoClient();
  const name = dbName || String(process.env.MONGO_DB_NAME || "").trim();
  return name ? mongoClient.db(name) : mongoClient.db();
}
