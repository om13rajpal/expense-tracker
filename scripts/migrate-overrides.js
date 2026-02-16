/**
 * Migrate overridden transactions from raw categories to budget category names.
 * e.g. "Dining" (override) -> "Food & Dining" (override preserved)
 *
 * This updates the category but keeps categoryOverride: true intact.
 * Income/financial categories are left untouched.
 *
 * Usage: node scripts/migrate-overrides.js
 */

const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "finance";

const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment Income", "Other Income"];
const FINANCIAL_CATS = ["Savings", "Investment", "Loan Payment", "Credit Card", "Tax"];
const SKIP_CATS = new Set([...INCOME_CATS, ...FINANCIAL_CATS]);

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Build reverse map from budget categories
  const budgetDocs = await db.collection("budget_categories").find({}).toArray();
  const reverseMap = {};
  const budgetNames = new Set();
  let othersName = null;

  for (const doc of budgetDocs) {
    budgetNames.add(doc.name);
    if (doc.name.toLowerCase() === "others") othersName = doc.name;
    for (const cat of doc.transactionCategories || []) {
      reverseMap[cat] = doc.name;
    }
  }

  // Get ALL transactions (including overrides)
  const allTxns = await db.collection("transactions").find({}).toArray();

  const ops = [];
  const changes = {};

  for (const txn of allTxns) {
    const cat = txn.category || "Uncategorized";

    // Skip if already a budget category name
    if (budgetNames.has(cat)) continue;

    // Skip income and financial categories
    if (SKIP_CATS.has(cat)) continue;

    // Find the budget category
    let newCat = reverseMap[cat];
    if (!newCat && othersName) newCat = othersName;
    if (!newCat) continue;

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

    const key = `${cat} -> ${newCat}`;
    changes[key] = (changes[key] || 0) + 1;
  }

  console.log(`Transactions to update: ${ops.length}`);
  if (Object.keys(changes).length > 0) {
    console.log("Changes:");
    for (const [change, count] of Object.entries(changes)) {
      console.log(`  ${change}: ${count}`);
    }
  }

  if (ops.length > 0) {
    const result = await db.collection("transactions").bulkWrite(ops, { ordered: false });
    console.log(`\nDone! Modified: ${result.modifiedCount}`);
  } else {
    console.log("\nNothing to update.");
  }

  // Print final distribution
  const dist = await db.collection("transactions").aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log("\nFinal category distribution:");
  for (const d of dist) {
    const status = budgetNames.has(d._id) ? "budget" : SKIP_CATS.has(d._id) ? "income/financial" : "OTHER";
    console.log(`  ${d._id}: ${d.count}  [${status}]`);
  }

  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
