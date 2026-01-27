/**
 * Usage examples for Finance Tracker library
 * Demonstrates common patterns and use cases
 */

import {
  processCSVData,
  calculateAnalytics,
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  categorizeTransaction,
  generateSampleTransactions,
  Transaction,
  TransactionType,
  TransactionCategory,
} from './index';

/**
 * Example 1: Process CSV data and calculate analytics
 */
export async function example1_ProcessAndAnalyze() {
  // Simulate CSV content (in real app, this comes from file upload or API)
  const csvContent = `date,description,merchant,category,amount,type,paymentMethod,account,status,tags
2024-01-15,Grocery shopping,DMart,Groceries,2500,expense,UPI,HDFC Savings,completed,essential
2024-01-16,Food delivery,Swiggy,Dining,450,expense,Credit Card,HDFC Credit,completed,food
2024-01-20,Salary credit,Company,Salary,50000,income,Net Banking,HDFC Savings,completed,income
2024-01-22,Uber ride,Uber,Transport,250,expense,UPI,HDFC Savings,completed,commute`;

  // Process CSV
  const transactions = processCSVData(csvContent);
  console.log(`Loaded ${transactions.length} transactions`);

  // Calculate analytics
  const analytics = calculateAnalytics(transactions);

  // Display results
  console.log('\n=== Financial Summary ===');
  console.log(`Total Income: ${formatCurrency(analytics.totalIncome)}`);
  console.log(`Total Expenses: ${formatCurrency(analytics.totalExpenses)}`);
  console.log(`Net Savings: ${formatCurrency(analytics.netSavings)}`);
  console.log(`Savings Rate: ${analytics.savingsRate.toFixed(1)}%`);

  return analytics;
}

/**
 * Example 2: Auto-categorize transactions
 */
export function example2_AutoCategorize() {
  const transactions = [
    { merchant: 'Amazon India', description: 'Online shopping' },
    { merchant: 'Swiggy', description: 'Food order' },
    { merchant: 'Uber', description: 'Cab ride' },
    { merchant: 'Airtel', description: 'Mobile recharge' },
  ];

  console.log('\n=== Auto Categorization ===');
  transactions.forEach(({ merchant, description }) => {
    const category = categorizeTransaction(merchant, description);
    console.log(`${merchant}: ${category}`);
  });
}

/**
 * Example 3: Generate and analyze sample data
 */
export function example3_SampleData() {
  // Generate 3 months of sample data
  const startDate = new Date(2024, 0, 1);
  const endDate = new Date(2024, 2, 31);
  const transactions = generateSampleTransactions(200, startDate, endDate);

  console.log(`\n=== Generated ${transactions.length} Sample Transactions ===`);

  // Calculate analytics
  const analytics = calculateAnalytics(transactions);

  // Show monthly trends
  console.log('\n=== Monthly Trends ===');
  analytics.monthlyTrends.forEach(trend => {
    console.log(`${trend.monthName}:`);
    console.log(`  Income: ${formatCompactCurrency(trend.income)}`);
    console.log(`  Expenses: ${formatCompactCurrency(trend.expenses)}`);
    console.log(`  Savings: ${formatCompactCurrency(trend.savings)} (${trend.savingsRate.toFixed(1)}%)`);
  });

  return transactions;
}

/**
 * Example 4: Category breakdown analysis
 */
export function example4_CategoryBreakdown() {
  const transactions = generateSampleTransactions(100);
  const analytics = calculateAnalytics(transactions);

  console.log('\n=== Top Expense Categories ===');
  analytics.topExpenseCategories.forEach((cat, index) => {
    console.log(
      `${index + 1}. ${cat.category}: ${formatCurrency(cat.totalAmount)} (${cat.percentageOfTotal.toFixed(1)}%)`
    );
    console.log(`   Average: ${formatCurrency(cat.averageAmount)}, Count: ${cat.transactionCount}`);
  });
}

/**
 * Example 5: Filter and analyze specific period
 */
export function example5_PeriodAnalysis(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
) {
  // Filter transactions by date range
  const filtered = transactions.filter(
    t => t.date >= startDate && t.date <= endDate
  );

  console.log(`\n=== Period Analysis: ${formatDate(startDate)} to ${formatDate(endDate)} ===`);
  console.log(`Transactions: ${filtered.length}`);

  const analytics = calculateAnalytics(filtered);
  console.log(`Total Income: ${formatCurrency(analytics.totalIncome)}`);
  console.log(`Total Expenses: ${formatCurrency(analytics.totalExpenses)}`);
  console.log(`Net Savings: ${formatCurrency(analytics.netSavings)}`);
}

/**
 * Example 6: Top merchants analysis
 */
export function example6_TopMerchants() {
  const transactions = generateSampleTransactions(150);
  const analytics = calculateAnalytics(transactions);

  console.log('\n=== Top 10 Merchants ===');
  analytics.topMerchants.forEach((merchant, index) => {
    console.log(
      `${index + 1}. ${merchant.merchant}: ${formatCurrency(merchant.totalAmount)}`
    );
    console.log(`   Category: ${merchant.primaryCategory}`);
    console.log(`   Transactions: ${merchant.transactionCount}, Average: ${formatCurrency(merchant.averageAmount)}`);
  });
}

/**
 * Example 7: Payment method analysis
 */
export function example7_PaymentMethods() {
  const transactions = generateSampleTransactions(100);
  const analytics = calculateAnalytics(transactions);

  console.log('\n=== Payment Method Breakdown ===');
  analytics.paymentMethodBreakdown.forEach(method => {
    console.log(
      `${method.method}: ${formatCurrency(method.amount)} (${method.percentage.toFixed(1)}%)`
    );
    console.log(`  Transactions: ${method.transactionCount}`);
  });
}

/**
 * Example 8: Filter by category
 */
export function example8_FilterByCategory(
  transactions: Transaction[],
  category: TransactionCategory
) {
  const filtered = transactions.filter(t => t.category === category);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  console.log(`\n=== ${category} Analysis ===`);
  console.log(`Total Transactions: ${filtered.length}`);
  console.log(`Total Amount: ${formatCurrency(total)}`);
  console.log(`Average: ${formatCurrency(total / filtered.length)}`);

  // Show recent transactions
  console.log('\nRecent Transactions:');
  filtered.slice(0, 5).forEach(t => {
    console.log(`  ${formatDate(t.date, 'short')}: ${t.merchant} - ${formatCurrency(t.amount)}`);
  });
}

/**
 * Example 9: Income vs Expense comparison
 */
export function example9_IncomeVsExpense() {
  const transactions = generateSampleTransactions(200);

  const income = transactions.filter(t => t.type === TransactionType.INCOME);
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);

  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

  console.log('\n=== Income vs Expense ===');
  console.log(`Income: ${formatCurrency(totalIncome)} (${income.length} transactions)`);
  console.log(`Expenses: ${formatCurrency(totalExpenses)} (${expenses.length} transactions)`);
  console.log(`Difference: ${formatCurrency(totalIncome - totalExpenses)}`);
  console.log(`Ratio: ${(totalIncome / totalExpenses).toFixed(2)}x`);
}

/**
 * Example 10: Recurring expenses analysis
 */
export function example10_RecurringExpenses() {
  const transactions = generateSampleTransactions(150);

  const recurring = transactions.filter(
    t => t.recurring && t.type === TransactionType.EXPENSE
  );

  const totalRecurring = recurring.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  console.log('\n=== Recurring Expenses ===');
  console.log(`Total Recurring: ${formatCurrency(totalRecurring)}`);
  console.log(`Count: ${recurring.length} transactions`);
  console.log(`Percentage of total expenses: ${((totalRecurring / totalExpenses) * 100).toFixed(1)}%`);

  console.log('\nRecurring Items:');
  recurring.forEach(t => {
    console.log(`  ${t.merchant}: ${formatCurrency(t.amount)} (${t.category})`);
  });
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Finance Tracker Library Examples     ║');
  console.log('╚════════════════════════════════════════╝');

  await example1_ProcessAndAnalyze();
  example2_AutoCategorize();
  example3_SampleData();
  example4_CategoryBreakdown();
  example6_TopMerchants();
  example7_PaymentMethods();
  example9_IncomeVsExpense();
  example10_RecurringExpenses();

  console.log('\n✓ All examples completed!');
}

// Uncomment to run examples
// runAllExamples();
