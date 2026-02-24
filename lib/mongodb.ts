/**
 * MongoDB connection singleton for the Finova application.
 *
 * Manages a single shared `MongoClient` connection, reusing it across
 * all API route handlers and server-side functions. In development mode,
 * the client promise is cached on the Node.js `global` object to survive
 * hot-module reloading. In production, a fresh client is created once per
 * cold start.
 *
 * On each call to `getMongoDb()`, background index creation is triggered
 * (fire-and-forget) via `ensureIndexes()` from `db-indexes.ts`.
 *
 * @module lib/mongodb
 */

import { MongoClient } from "mongodb"
import { ensureIndexes } from "./db-indexes"

/** MongoDB connection URI from the `MONGODB_URI` environment variable. */
const uri = process.env.MONGODB_URI

/** Database name, defaults to "finance" if `MONGODB_DB` is not set. */
const dbName = process.env.MONGODB_DB || "finance"

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable")
}

/** Resolved promise that yields the connected MongoClient instance. */
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  /** Global cache for the MongoClient promise, persisted across HMR in development. */
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

/**
 * Obtain a reference to the application's MongoDB database.
 *
 * Awaits the shared client connection and returns the `Db` instance
 * for the configured database name. Also kicks off background index
 * creation (idempotent, guarded by a flag in `ensureIndexes()`).
 *
 * @returns The MongoDB `Db` instance for the "finance" database (or custom name).
 *
 * @example
 * const db = await getMongoDb();
 * const txns = await db.collection('transactions').find({ userId }).toArray();
 */
export async function getMongoDb() {
  const client = await clientPromise
  const db = client.db(dbName)

  // Fire-and-forget: ensureIndexes has its own guard flag and retries on failure
  ensureIndexes(db).catch((err) =>
    console.error("Background index creation failed:", err)
  )

  return db
}
