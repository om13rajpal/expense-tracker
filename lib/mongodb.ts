import { MongoClient } from "mongodb"
import { ensureIndexes } from "./db-indexes"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || "finance"

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable")
}

let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  const client = new MongoClient(uri)
  clientPromise = client.connect()
}

export async function getMongoDb() {
  const client = await clientPromise
  const db = client.db(dbName)

  // Fire-and-forget: ensureIndexes has its own guard flag and retries on failure
  ensureIndexes(db).catch((err) =>
    console.error("Background index creation failed:", err)
  )

  return db
}
