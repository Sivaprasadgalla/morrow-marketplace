import { MongoClient } from "mongodb";

declare global {
  var __morrowMongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required for the Auth.js MongoDB adapter.");

  if (!global.__morrowMongoClientPromise) {
    const client = new MongoClient(uri);
    global.__morrowMongoClientPromise = client.connect();
  }

  return global.__morrowMongoClientPromise;
}
