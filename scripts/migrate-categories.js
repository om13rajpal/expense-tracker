/**
 * One-time migration: remap transaction categories to budget category names.
 *
 * For every transaction whose category is a raw TransactionCategory value
 * (e.g. "Dining", "Groceries"), this script updates it to the budget
 * category name that owns it (e.g. "Food & Dining").
 *
 * Transactions with categoryOverride: true are skipped.
 *
 * Usage:
 *   node scripts/migrate-categories.js
 *
 * Requires MONGODB_URI and optionally MONGODB_DB env vars (reads from .env.local).
 */

const { MongoClient } = require("mongodb");
const path = require("path");

// Load .env.local
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "finance";

if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // 1. Load budget categories to build reverse mapping
  const budgetDocs = await db.collection("budget_categories").find({}).toArray();

  if (budgetDocs.length === 0) {
    console.log("No budget categories found. Nothing to migrate.");
    await client.close();
    return;
  }

  // Build reverse map: transactionCategory -> budgetCategoryName
  // e.g. "Dining" -> "Food & Dining", "Groceries" -> "Food & Dining"
  const reverseMap = {};
  let othersName = null;

  for (const doc of budgetDocs) {
    const budgetName = doc.name;
    const txnCats = doc.transactionCategories || [];

    if (budgetName.toLowerCase() === "others") {
      othersName = budgetName;
    }

    for (const cat of txnCats) {
      reverseMap[cat] = budgetName;
    }
  }

  console.log("Budget categories found:", budgetDocs.length);
  console.log("Reverse mapping entries:", Object.keys(reverseMap).length);
  console.log("Reverse map:", JSON.stringify(reverseMap, null, 2));
  console.log();

  // 2. Load all transactions (skip manual overrides)
  const transactions = await db
    .collection("transactions")
    .find({
      $or: [
        { categoryOverride: { $ne: true } },
        { categoryOverride: { $exists: false } },
      ],
    })
    .toArray();

  console.log(`Total transactions to check: ${transactions.length}`);

  // 3. Build bulk update operations
  const ops = [];
  const changeSummary = {};
  let skippedAlready = 0;
  let unmapped = 0;

  for (const txn of transactions) {
    const oldCat = txn.category || "Uncategorized";

    // If already a budget category name, skip
    const isBudgetName = budgetDocs.some((d) => d.name === oldCat);
    if (isBudgetName) {
      skippedAlready++;
      continue;
    }

    // Find the budget category this transaction category belongs to
    let newCat = reverseMap[oldCat];

    // If not in any mapping, assign to "Others" (if it exists)
    if (!newCat) {
      if (othersName) {
        newCat = othersName;
      } else {
        unmapped++;
        continue;
      }
    }

    ops.push({
      updateOne: {
        filter: { _id: txn._id },
        update: {
          $set: {
            category: newCat,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    const key = `${oldCat} -> ${newCat}`;
    changeSummary[key] = (changeSummary[key] || 0) + 1;
  }

  console.log(`Already using budget names: ${skippedAlready}`);
  console.log(`Unmapped (no budget category): ${unmapped}`);
  console.log(`To update: ${ops.length}`);
  console.log();

  if (Object.keys(changeSummary).length > 0) {
    console.log("Changes:");
    for (const [change, count] of Object.entries(changeSummary)) {
      console.log(`  ${change}: ${count}`);
    }
    console.log();
  }

  // 4. Execute bulk update
  if (ops.length > 0) {
    const result = await db
      .collection("transactions")
      .bulkWrite(ops, { ordered: false });
    console.log(`Done! Modified: ${result.modifiedCount}`);
  } else {
    console.log("Nothing to update.");
  }

  // Also count manual overrides for info
  const overrideCount = await db
    .collection("transactions")
    .countDocuments({ categoryOverride: true });
  console.log(`Skipped (manual override): ${overrideCount}`);

  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
