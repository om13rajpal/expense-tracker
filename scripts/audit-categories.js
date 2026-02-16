/**
 * Audit transaction categories — show full distribution, identify issues.
 * Usage: node scripts/audit-categories.js
 */

const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "finance";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // 1. Budget categories and their mappings
  const budgetDocs = await db.collection("budget_categories").find({}).toArray();
  const reverseMap = {};
  const budgetNames = new Set();
  for (const doc of budgetDocs) {
    budgetNames.add(doc.name);
    for (const cat of doc.transactionCategories || []) {
      reverseMap[cat] = doc.name;
    }
  }

  console.log("=== BUDGET CATEGORIES ===");
  for (const doc of budgetDocs) {
    console.log(`  ${doc.name} -> [${(doc.transactionCategories || []).join(", ")}]`);
  }

  // Income categories (should NOT be mapped to budget categories)
  const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment Income", "Other Income"];
  const FINANCIAL_CATS = ["Savings", "Investment", "Loan Payment", "Credit Card", "Tax"];

  // 2. All transactions
  const allTxns = await db.collection("transactions").find({}).toArray();
  console.log(`\n=== TOTAL TRANSACTIONS: ${allTxns.length} ===`);

  // 3. Category distribution by type
  const byTypeAndCat = {};
  const overrideCats = {};
  const nonOverrideCats = {};

  for (const txn of allTxns) {
    const cat = txn.category || "Uncategorized";
    const type = txn.type || "unknown";
    const key = `${type}|${cat}`;
    byTypeAndCat[key] = (byTypeAndCat[key] || 0) + 1;

    if (txn.categoryOverride === true) {
      overrideCats[cat] = (overrideCats[cat] || 0) + 1;
    } else {
      nonOverrideCats[cat] = (nonOverrideCats[cat] || 0) + 1;
    }
  }

  console.log("\n=== DISTRIBUTION BY TYPE & CATEGORY ===");
  const sorted = Object.entries(byTypeAndCat).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted) {
    const [type, cat] = key.split("|");
    const isBudgetName = budgetNames.has(cat);
    const mappedTo = reverseMap[cat];
    const isIncome = INCOME_CATS.includes(cat);
    const isFinancial = FINANCIAL_CATS.includes(cat);

    let status = "";
    if (isBudgetName) status = "OK (budget name)";
    else if (isIncome) status = "OK (income)";
    else if (isFinancial) status = "OK (financial)";
    else if (mappedTo) status = `SHOULD BE -> ${mappedTo}`;
    else status = "UNMAPPED";

    console.log(`  [${type}] ${cat}: ${count}  ${status}`);
  }

  // 4. Identify problems
  console.log("\n=== ISSUES ===");

  // Transactions using raw transaction categories instead of budget names
  let issueCount = 0;
  for (const txn of allTxns) {
    const cat = txn.category || "Uncategorized";
    const type = txn.type || "unknown";

    // Skip income and financial categories — they're correct as-is
    if (INCOME_CATS.includes(cat) || FINANCIAL_CATS.includes(cat)) continue;

    // If it's a budget name, it's correct
    if (budgetNames.has(cat)) continue;

    // If it maps to a budget category, it should have been migrated
    if (reverseMap[cat]) {
      issueCount++;
      if (issueCount <= 10) {
        const override = txn.categoryOverride ? " [OVERRIDE]" : "";
        console.log(`  ${txn.txnId || txn._id}: "${cat}" should be "${reverseMap[cat]}" (${type})${override}`);
      }
    }
  }
  if (issueCount > 10) {
    console.log(`  ... and ${issueCount - 10} more`);
  }
  console.log(`\nTotal transactions with stale categories: ${issueCount}`);

  // 5. Override breakdown
  const overrideCount = allTxns.filter((t) => t.categoryOverride === true).length;
  console.log(`\n=== OVERRIDES ===`);
  console.log(`Manual overrides (categoryOverride=true): ${overrideCount}`);
  console.log("Override category distribution:");
  for (const [cat, count] of Object.entries(overrideCats).sort((a, b) => b[1] - a[1])) {
    const mapped = reverseMap[cat];
    const note = mapped ? ` (should be ${mapped})` : budgetNames.has(cat) ? " (OK)" : "";
    console.log(`  ${cat}: ${count}${note}`);
  }

  console.log("\nNon-override category distribution:");
  for (const [cat, count] of Object.entries(nonOverrideCats).sort((a, b) => b[1] - a[1])) {
    const note = budgetNames.has(cat) ? " (OK)" : INCOME_CATS.includes(cat) ? " (OK income)" : FINANCIAL_CATS.includes(cat) ? " (OK financial)" : ` (stale -> ${reverseMap[cat] || "?"})`;
    console.log(`  ${cat}: ${count}${note}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
