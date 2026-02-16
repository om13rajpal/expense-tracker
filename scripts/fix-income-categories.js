/**
 * Fix: Revert income/financial transactions that were incorrectly mapped to "Others".
 * These categories are not expense budget categories and should keep their original values.
 *
 * Usage: node scripts/fix-income-categories.js
 */

const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "finance";

// Income and financial categories that should NOT be mapped to budget categories
const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Investment Income", "Other Income",
];
const FINANCIAL_CATEGORIES = [
  "Savings", "Investment", "Loan Payment", "Credit Card", "Tax",
];
const PRESERVE_CATEGORIES = [...INCOME_CATEGORIES, ...FINANCIAL_CATEGORIES];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Find transactions that are income/financial type but got mapped to "Others"
  // We need to check the transaction type field
  const wronglyMapped = await db
    .collection("transactions")
    .find({
      category: "Others",
      $or: [
        { type: "income" },
        { type: { $in: ["transfer", "investment"] } },
      ],
    })
    .toArray();

  console.log(`Income/financial transactions incorrectly set to "Others": ${wronglyMapped.length}`);

  // For these, we need to figure out what the original category was.
  // Since we can't reverse it perfectly, let's set income types back based on their type field.
  // Income type -> "Other Income" (most were "Other Income" based on migration output: 23 matched)
  // For investment/savings, we'll check description patterns

  const ops = [];
  const changes = {};

  for (const txn of wronglyMapped) {
    let newCat = "Others"; // default, unchanged

    if (txn.type === "income") {
      // Determine the income sub-category from description/merchant
      const desc = ((txn.description || "") + " " + (txn.merchant || "")).toLowerCase();
      if (desc.includes("salary") || desc.includes("payroll")) {
        newCat = "Salary";
      } else if (desc.includes("freelance") || desc.includes("contract")) {
        newCat = "Freelance";
      } else if (desc.includes("business")) {
        newCat = "Business";
      } else if (desc.includes("dividend") || desc.includes("interest") || desc.includes("investment")) {
        newCat = "Investment Income";
      } else {
        newCat = "Other Income";
      }
    }

    if (newCat !== "Others") {
      ops.push({
        updateOne: {
          filter: { _id: txn._id },
          update: { $set: { category: newCat, updatedAt: new Date().toISOString() } },
        },
      });
      const key = `Others -> ${newCat}`;
      changes[key] = (changes[key] || 0) + 1;
    }
  }

  // Also fix non-override transactions that had "Investment" or "Savings" as original category
  // These are expense-side but represent financial movements, not budget spending
  // Check by matching type or description
  const investmentTxns = await db
    .collection("transactions")
    .find({
      category: "Others",
      categoryOverride: { $ne: true },
      $or: [
        { description: { $regex: /invest|sip|mutual|stock|groww|zerodha|kuvera/i } },
        { merchant: { $regex: /invest|sip|mutual|stock|groww|zerodha|kuvera/i } },
      ],
    })
    .toArray();

  for (const txn of investmentTxns) {
    // Skip if already handled above
    if (ops.some((op) => op.updateOne.filter._id.equals(txn._id))) continue;

    ops.push({
      updateOne: {
        filter: { _id: txn._id },
        update: { $set: { category: "Investment", updatedAt: new Date().toISOString() } },
      },
    });
    changes["Others -> Investment"] = (changes["Others -> Investment"] || 0) + 1;
  }

  console.log(`\nChanges to make: ${ops.length}`);
  if (Object.keys(changes).length > 0) {
    console.log("Breakdown:");
    for (const [change, count] of Object.entries(changes)) {
      console.log(`  ${change}: ${count}`);
    }
  }

  if (ops.length > 0) {
    const result = await db
      .collection("transactions")
      .bulkWrite(ops, { ordered: false });
    console.log(`\nDone! Modified: ${result.modifiedCount}`);
  } else {
    console.log("\nNo changes needed.");
  }

  // Print final category distribution
  const pipeline = [
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];
  const dist = await db.collection("transactions").aggregate(pipeline).toArray();
  console.log("\nFinal category distribution:");
  for (const d of dist) {
    console.log(`  ${d._id}: ${d.count}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
