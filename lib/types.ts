/**
 * Core TypeScript type definitions for the Finova personal finance platform.
 *
 * This module defines the foundational data structures used throughout the application,
 * including transactions imported from Google Sheets, analytics aggregations for dashboard
 * visualizations, budget tracking, savings goals, investment portfolio types (SIP, Stock,
 * Mutual Fund), Needs/Wants/Investments (NWI) budgeting framework, financial health
 * metrics, FIRE (Financial Independence, Retire Early) calculations, and the Bucket List
 * aspirational-purchase tracker.
 *
 * All monetary values are denominated in Indian Rupees (INR) unless otherwise noted.
 *
 * @module lib/types
 */

// ============================================================================
// Transaction Core
// ============================================================================

/**
 * A single financial transaction imported and normalized from Google Sheets.
 *
 * Maps to the 12-column structure of the bank statement sheet:
 * `txn_id | value_date | post_date | description | reference_no | debit | credit | balance | txn_type | account_source | imported_at | hash`
 *
 * After parsing, the raw row is enriched with auto-categorization, merchant
 * extraction, and payment method detection (UPI/NEFT/IMPS/Net Banking).
 */
export interface Transaction {
  /** Unique transaction identifier, typically the bank's `txn_id` from the sheet. */
  id: string;
  /** Value date of the transaction (when the money actually moved). */
  date: Date;
  /** Raw description string from the bank statement (e.g. "UPI/DR/ref/MERCHANT/BANK"). */
  description: string;
  /** Extracted merchant or payee name parsed from the description. */
  merchant: string;
  /** Auto-assigned or user-overridden spending/income category. */
  category: TransactionCategory;
  /** Absolute transaction amount in INR (always positive; direction indicated by `type`). */
  amount: number;
  /** Whether the transaction represents income, expense, transfer, investment, or refund. */
  type: TransactionType;
  /** Detected payment channel (UPI, NEFT, IMPS, Net Banking, etc.). */
  paymentMethod: PaymentMethod;
  /** Source bank account identifier (e.g. "HDFC Savings", "SBI Current"). */
  account: string;
  /** Current processing status of the transaction. */
  status: TransactionStatus;
  /** User-applied or auto-generated tags for flexible filtering. */
  tags: string[];
  /** Optional free-text notes attached by the user. */
  notes?: string;
  /** Optional geolocation or place name associated with the transaction. */
  location?: string;
  /** Optional URL to a scanned receipt image (uploaded via Telegram bot). */
  receiptUrl?: string;
  /** Whether this transaction recurs on a regular schedule (rent, SIP, subscription, etc.). */
  recurring: boolean;
  /** Optional reference to a related transaction (e.g. refund linked to original purchase). */
  relatedTransactionId?: string;
  /** Running account balance after this transaction, as reported by the bank. */
  balance?: number;
  /** Row index from the Google Sheet, used to preserve original ordering for same-day transactions. */
  sequence?: number;
}

/**
 * Raw, unparsed transaction data as imported directly from a CSV file.
 *
 * All fields are strings matching the CSV column values before type coercion.
 * This interface is used as an intermediate representation during the
 * CSV-to-Transaction parsing pipeline in `data-processor.ts`.
 */
export interface RawTransaction {
  /** Date string in DD/MM/YYYY or ISO format. */
  date: string;
  /** Unprocessed description from the bank statement. */
  description: string;
  /** Merchant name (may be empty if not extractable from description). */
  merchant: string;
  /** Optional category string; may be empty for auto-categorization. */
  category?: string;
  /** Amount as a string, potentially with commas or currency symbols. */
  amount: string;
  /** Transaction type string ("income", "expense", etc.). */
  type: string;
  /** Payment method string ("UPI", "NEFT", etc.). */
  paymentMethod: string;
  /** Bank account name or identifier. */
  account: string;
  /** Status string ("completed", "pending", etc.). */
  status: string;
  /** Comma-separated tag strings. */
  tags?: string;
  /** Free-text notes. */
  notes?: string;
  /** Location string. */
  location?: string;
  /** Receipt image URL. */
  receiptUrl?: string;
  /** "true" or "false" string indicating recurrence. */
  recurring?: string;
  /** ID of a related transaction. */
  relatedTransactionId?: string;
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Classifies the direction and purpose of a financial transaction.
 *
 * Used to determine whether a transaction adds to or subtracts from
 * the user's available balance, and how it should be aggregated in
 * analytics (income vs. expense totals, savings rate calculations, etc.).
 */
export enum TransactionType {
  /** Money received: salary, freelance payments, interest, dividends. */
  INCOME = 'income',
  /** Money spent: purchases, bills, subscriptions. */
  EXPENSE = 'expense',
  /** Money moved between own accounts (does not affect net worth). */
  TRANSFER = 'transfer',
  /** Money allocated to investments: SIPs, stocks, mutual funds. */
  INVESTMENT = 'investment',
  /** Money returned from a previous purchase or overpayment. */
  REFUND = 'refund',
}

/**
 * Spending and income categories for automatic transaction classification.
 *
 * The categorizer engine in `categorizer.ts` maps merchant names and
 * description patterns to these categories using fuzzy matching (Jaro-Winkler
 * similarity). Categories are grouped into Income, Essential Expenses,
 * Lifestyle, Financial, and Other for NWI budget classification.
 */
export enum TransactionCategory {
  // ── Income ──
  /** Regular employment salary or wages. */
  SALARY = 'Salary',
  /** Freelance or contract work payments. */
  FREELANCE = 'Freelance',
  /** Business revenue or self-employment income. */
  BUSINESS = 'Business',
  /** Returns from investments: dividends, interest, capital gains. */
  INVESTMENT_INCOME = 'Investment Income',
  /** Miscellaneous income not fitting other categories. */
  OTHER_INCOME = 'Other Income',

  // ── Essential Expenses ──
  /** Monthly rent or housing payments. */
  RENT = 'Rent',
  /** Electricity, water, gas, and other utility bills. */
  UTILITIES = 'Utilities',
  /** Grocery shopping and daily food supplies. */
  GROCERIES = 'Groceries',
  /** Medical expenses, doctor visits, pharmacy purchases. */
  HEALTHCARE = 'Healthcare',
  /** Insurance premiums (health, life, vehicle, etc.). */
  INSURANCE = 'Insurance',
  /** Public transport, auto-rickshaw, cab rides. */
  TRANSPORT = 'Transport',
  /** Petrol, diesel, and vehicle fuel. */
  FUEL = 'Fuel',

  // ── Lifestyle ──
  /** Restaurant meals, food delivery (Swiggy/Zomato), cafes. */
  DINING = 'Dining',
  /** Movies, streaming subscriptions, events, gaming. */
  ENTERTAINMENT = 'Entertainment',
  /** Retail purchases: clothing, electronics, general merchandise. */
  SHOPPING = 'Shopping',
  /** Vacation travel, flights, hotels, tours. */
  TRAVEL = 'Travel',
  /** Courses, books, tuition, educational subscriptions. */
  EDUCATION = 'Education',
  /** Gym memberships, sports, fitness equipment. */
  FITNESS = 'Fitness',
  /** Salon, grooming, personal hygiene products. */
  PERSONAL_CARE = 'Personal Care',

  // ── Financial ──
  /** Explicit transfers to savings accounts. */
  SAVINGS = 'Savings',
  /** Investment purchases: SIPs, mutual funds, stocks. */
  INVESTMENT = 'Investment',
  /** EMI payments on loans (home, car, personal). */
  LOAN_PAYMENT = 'Loan Payment',
  /** Credit card bill payments. */
  CREDIT_CARD = 'Credit Card',
  /** Income tax, GST, or other tax payments. */
  TAX = 'Tax',

  // ── Other ──
  /** Recurring subscription services (Netflix, Spotify, etc.). */
  SUBSCRIPTION = 'Subscription',
  /** Gifts given to others. */
  GIFTS = 'Gifts',
  /** Charitable donations. */
  CHARITY = 'Charity',
  /** Expenses that don't fit any specific category. */
  MISCELLANEOUS = 'Miscellaneous',
  /** Transactions that haven't been categorized yet. */
  UNCATEGORIZED = 'Uncategorized',
}

/**
 * Payment channels and instruments used for transactions.
 *
 * Detected automatically from bank statement description patterns:
 * - UPI: "UPI/DR/..." or "UPI/CR/..."
 * - NEFT: "NEFT*..." or "NEFT/..."
 * - IMPS: "IMPS/..."
 * - Net Banking: "INB ..." patterns
 */
export enum PaymentMethod {
  /** Physical cash payment. */
  CASH = 'Cash',
  /** Debit card transaction. */
  DEBIT_CARD = 'Debit Card',
  /** Credit card transaction. */
  CREDIT_CARD = 'Credit Card',
  /** Unified Payments Interface (GPay, PhonePe, Paytm, etc.). */
  UPI = 'UPI',
  /** National Electronic Funds Transfer (batch settlement). */
  NEFT = 'NEFT',
  /** Immediate Payment Service (real-time interbank transfer). */
  IMPS = 'IMPS',
  /** Internet banking / net banking transfer. */
  NET_BANKING = 'Net Banking',
  /** Digital wallet (Paytm Wallet, Amazon Pay, etc.). */
  WALLET = 'Wallet',
  /** Paper cheque. */
  CHEQUE = 'Cheque',
  /** Payment method not identifiable from the description. */
  OTHER = 'Other',
}

/**
 * Processing status of a financial transaction.
 *
 * Most bank-imported transactions arrive as "completed". The pending/failed/cancelled
 * statuses are used for manually entered or Telegram-submitted transactions that
 * may require confirmation.
 */
export enum TransactionStatus {
  /** Transaction has been fully processed and settled. */
  COMPLETED = 'completed',
  /** Transaction is awaiting processing or user confirmation. */
  PENDING = 'pending',
  /** Transaction failed during processing. */
  FAILED = 'failed',
  /** Transaction was cancelled by the user or bank. */
  CANCELLED = 'cancelled',
}

// ============================================================================
// Analytics & Dashboard
// ============================================================================

/**
 * Aggregated analytics data powering the main dashboard visualizations.
 *
 * Computed by `analytics.ts#calculateAnalytics()` from the full transaction set,
 * providing summary statistics, category breakdowns, payment method distributions,
 * monthly trends, and top-N rankings used by charts and KPI cards.
 */
export interface Analytics {
  /** Sum of all income transactions in the period (INR). */
  totalIncome: number;
  /** Sum of all expense transactions in the period (INR). */
  totalExpenses: number;
  /** Income minus expenses (INR). */
  netSavings: number;
  /** Savings as a percentage of income: `(netSavings / totalIncome) * 100`. */
  savingsRate: number;
  /** Average monthly income across all months in the dataset (INR). */
  averageMonthlyIncome: number;
  /** Average monthly expenses across all months in the dataset (INR). */
  averageMonthlyExpense: number;
  /** Average monthly savings (income - expenses) across all months (INR). */
  averageMonthlySavings: number;
  /** Mean daily spending: `totalExpenses / number_of_days` (INR). */
  dailyAverageSpend: number;
  /** Per-category expense breakdown for pie/donut charts. */
  categoryBreakdown: CategoryBreakdown[];
  /** Per-payment-method breakdown for distribution charts. */
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  /** Month-by-month income/expense/savings time series. */
  monthlyTrends: MonthlyTrend[];
  /** Top expense categories ranked by total amount. */
  topExpenseCategories: CategorySummary[];
  /** Top merchants ranked by total spending. */
  topMerchants: MerchantSummary[];
  /** Total amount spent on detected recurring transactions (INR). */
  recurringExpenses: number;
}

/**
 * Breakdown of spending for a single transaction category.
 * Used in pie charts and donut charts on the dashboard.
 */
export interface CategoryBreakdown {
  /** The transaction category being summarized. */
  category: TransactionCategory;
  /** Total amount spent in this category (INR). */
  amount: number;
  /** This category's share of total spending as a percentage. */
  percentage: number;
  /** Number of transactions in this category. */
  transactionCount: number;
  /** Optional hex color code for chart rendering (from CATEGORY_COLORS). */
  color?: string;
}

/**
 * Breakdown of transaction volume by payment method.
 * Used for payment distribution charts and insights.
 */
export interface PaymentMethodBreakdown {
  /** The payment method being summarized. */
  method: PaymentMethod;
  /** Total amount transacted via this method (INR). */
  amount: number;
  /** This method's share of total transactions as a percentage. */
  percentage: number;
  /** Number of transactions using this method. */
  transactionCount: number;
}

/**
 * Monthly aggregated metrics for time-series trend charts.
 * Each entry represents one calendar month of financial activity.
 */
export interface MonthlyTrend {
  /** Month identifier in "YYYY-MM" format (e.g. "2026-02"). */
  month: string;
  /** Calendar year. */
  year: number;
  /** Human-readable month label (e.g. "February 2026"). */
  monthName: string;
  /** Total income received in this month (INR). */
  income: number;
  /** Total expenses in this month (INR). */
  expenses: number;
  /** Net savings (income - expenses) for this month (INR). */
  savings: number;
  /** Savings rate for this month as a percentage. */
  savingsRate: number;
  /** Total number of transactions in this month. */
  transactionCount: number;
}

/**
 * Daily aggregated metrics for granular trend analysis.
 * Each entry represents one calendar day.
 */
export interface DailyTrend {
  /** Date in "YYYY-MM-DD" format. */
  date: string;
  /** Total income on this day (INR). */
  income: number;
  /** Total expenses on this day (INR). */
  expenses: number;
  /** Net amount (income - expenses) for this day (INR). */
  net: number;
  /** Number of transactions on this day. */
  transactionCount: number;
}

/**
 * Summary statistics for a single spending category.
 * Used in "Top Categories" rankings on the dashboard.
 */
export interface CategorySummary {
  /** The category being summarized. */
  category: TransactionCategory;
  /** Total amount spent in this category (INR). */
  totalAmount: number;
  /** Number of transactions in this category. */
  transactionCount: number;
  /** Average transaction amount: `totalAmount / transactionCount` (INR). */
  averageAmount: number;
  /** This category's share of total spending as a percentage. */
  percentageOfTotal: number;
}

/**
 * Summary statistics for a single merchant/payee.
 * Used in "Top Merchants" rankings on the dashboard.
 */
export interface MerchantSummary {
  /** Merchant or payee name. */
  merchant: string;
  /** Total amount spent at this merchant (INR). */
  totalAmount: number;
  /** Number of transactions with this merchant. */
  transactionCount: number;
  /** Average transaction amount at this merchant (INR). */
  averageAmount: number;
  /** The most common category for transactions with this merchant. */
  primaryCategory: TransactionCategory;
}

// ============================================================================
// Filtering & Querying
// ============================================================================

/**
 * A start/end date pair used to constrain transaction queries
 * and analytics calculations to a specific time window.
 */
export interface DateRange {
  /** Inclusive start date of the range. */
  startDate: Date;
  /** Inclusive end date of the range. */
  endDate: Date;
}

/**
 * Client-side filter criteria for narrowing the transaction list.
 * All fields are optional; only specified filters are applied (AND logic).
 */
export interface TransactionFilter {
  /** Restrict to transactions within this date window. */
  dateRange?: DateRange;
  /** Include only these spending categories. */
  categories?: TransactionCategory[];
  /** Include only these transaction types (income, expense, etc.). */
  types?: TransactionType[];
  /** Include only these payment methods. */
  paymentMethods?: PaymentMethod[];
  /** Include only transactions from these merchants. */
  merchants?: string[];
  /** Minimum transaction amount (INR). */
  minAmount?: number;
  /** Maximum transaction amount (INR). */
  maxAmount?: number;
  /** Free-text search across description, merchant, and notes. */
  searchQuery?: string;
  /** Include only transactions having at least one of these tags. */
  tags?: string[];
}

/**
 * Budget allocation for a single spending category.
 * Tracks the configured limit against actual spending to determine budget health.
 */
export interface Budget {
  /** Unique budget identifier. */
  id: string;
  /** The spending category this budget controls. */
  category: TransactionCategory;
  /** Maximum allowed spending for the period (INR). */
  limit: number;
  /** Time period over which the budget resets. */
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Amount already spent against this budget (INR). */
  spent: number;
  /** Remaining budget: `limit - spent` (INR). */
  remaining: number;
  /** Percentage of budget consumed: `(spent / limit) * 100`. */
  percentageUsed: number;
  /** Health status: on-track (<70%), warning (70-90%), exceeded (>100%). */
  status: 'on-track' | 'warning' | 'exceeded';
}

/**
 * A user-defined savings goal with progress tracking.
 * Used on the Goals page to visualize progress toward financial targets.
 */
export interface SavingsGoal {
  /** Unique goal identifier. */
  id: string;
  /** User-defined name for the goal (e.g. "Emergency Fund", "New Car"). */
  name: string;
  /** Target savings amount (INR). */
  targetAmount: number;
  /** Amount saved so far toward this goal (INR). */
  currentAmount: number;
  /** Deadline by which the goal should be reached. */
  targetDate: Date;
  /** Completion percentage: `(currentAmount / targetAmount) * 100`. */
  percentageComplete: number;
  /** Monthly contribution needed to reach the goal on time (INR). */
  monthlyContribution: number;
  /** Whether the current savings pace will meet the target date. */
  onTrack: boolean;
}

/**
 * Comprehensive financial summary for a specified reporting period.
 * Aggregates income, expenses, savings, and transaction counts with category breakdowns.
 */
export interface FinancialSummary {
  /** Human-readable label for the period (e.g. "January 2026", "Q1 2026"). */
  period: string;
  /** Income aggregation with category-level detail. */
  income: {
    /** Total income in the period (INR). */
    total: number;
    /** Income broken down by source category. */
    byCategory: CategoryBreakdown[];
  };
  /** Expense aggregation with category-level detail. */
  expenses: {
    /** Total expenses in the period (INR). */
    total: number;
    /** Expenses broken down by spending category. */
    byCategory: CategoryBreakdown[];
  };
  /** Savings summary for the period. */
  savings: {
    /** Net savings amount (INR). */
    total: number;
    /** Savings rate as a percentage of income. */
    rate: number;
  };
  /** Transaction volume summary. */
  transactions: {
    /** Total number of transactions. */
    total: number;
    /** Transaction count broken down by type. */
    byType: Record<TransactionType, number>;
  };
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * User credentials for authentication.
 * The app uses a simple username/password scheme with JWT tokens.
 */
export interface User {
  /** Login username. */
  username: string;
  /** Hashed password (bcrypt). */
  password: string;
}

/**
 * Response returned by the authentication API endpoints.
 */
export interface AuthResponse {
  /** Whether the authentication attempt succeeded. */
  success: boolean;
  /** Human-readable status message (e.g. error reason). */
  message?: string;
  /** JWT token for subsequent authenticated requests (present on success). */
  token?: string;
  /** Authenticated user profile data (present on success). */
  user?: {
    /** MongoDB ObjectId of the user document. */
    id: string;
    /** Display name. */
    name: string;
    /** Email address. */
    email: string;
  };
}

// ============================================================================
// Google Sheets Sync
// ============================================================================

/**
 * Response from the Google Sheets sync API endpoint.
 * Returns the synced transactions along with metadata about the sync operation.
 */
export interface SheetSyncResponse {
  /** Whether the sync completed successfully. */
  success: boolean;
  /** Human-readable status or error message. */
  message?: string;
  /** Array of parsed and normalized transactions from the sheet. */
  transactions?: Transaction[];
  /** ISO timestamp of when the sync completed. */
  lastSync?: string;
  /** Total number of transactions synced. */
  count?: number;
}

/**
 * Query parameters for the transaction search/filter API.
 * Supports server-side filtering, pagination, and date range constraints.
 */
export interface TransactionQuery {
  /** Filter by spending category name. */
  category?: string;
  /** Filter by payment method name. */
  paymentMethod?: string;
  /** Inclusive start date in ISO format. */
  startDate?: string;
  /** Inclusive end date in ISO format. */
  endDate?: string;
  /** Minimum transaction amount (INR). */
  minAmount?: number;
  /** Maximum transaction amount (INR). */
  maxAmount?: number;
  /** Maximum number of results to return. */
  limit?: number;
  /** Number of results to skip (for pagination). */
  offset?: number;
}

// ============================================================================
// Weekly Metrics
// ============================================================================

/**
 * Aggregated financial metrics for a single ISO week.
 * Computed by `weekly-utils.ts` for the weekly analytics view.
 */
export interface WeeklyMetrics {
  /** ISO year (may differ from calendar year at year boundaries). */
  year: number;
  /** ISO week number (1-53). */
  weekNumber: number;
  /** Human-readable label like "Week 8, 2026". */
  weekLabel: string;
  /** Monday of the week. */
  weekStartDate: Date;
  /** Sunday of the week. */
  weekEndDate: Date;
  /** Total income received during this week (INR). */
  totalIncome: number;
  /** Total expenses during this week (INR). */
  totalExpenses: number;
  /** Net savings: `totalIncome - totalExpenses` (INR). */
  netSavings: number;
  /** Savings rate as a percentage of weekly income. */
  savingsRate: number;
  /** Total number of transactions in this week. */
  transactionCount: number;
  /** Number of income transactions in this week. */
  incomeTransactionCount: number;
  /** Number of expense transactions in this week. */
  expenseTransactionCount: number;
  /** The category with the highest total spending this week. */
  topCategory: {
    /** Category name. */
    name: string;
    /** Total amount spent in this category (INR). */
    amount: number;
  };
  /** Average daily spending: `totalExpenses / daysInWeek` (INR). */
  averageDailySpend: number;
  /** Number of days in this week with transactions (may be less than 7 for partial weeks). */
  daysInWeek: number;
}

/**
 * Lightweight identifier for a specific ISO week.
 * Used for navigation and selection in the weekly analytics view.
 */
export interface WeekIdentifier {
  /** ISO year. */
  year: number;
  /** ISO week number (1-53). */
  weekNumber: number;
  /** Display label (e.g. "Week 8, 2026"). */
  label: string;
}

// ============================================================================
// Investment Types
// ============================================================================

/**
 * Classification of investment asset types tracked in the portfolio.
 * India-specific investment vehicles like NPS, PPF, and FD are included
 * alongside global instruments.
 */
export enum InvestmentType {
  /** Systematic Investment Plan in a mutual fund. */
  SIP = 'SIP',
  /** Individual stock/equity holding. */
  STOCK = 'Stock',
  /** Lump-sum mutual fund investment. */
  MUTUAL_FUND = 'Mutual Fund',
  /** National Pension System (India government retirement scheme). */
  NPS = 'NPS',
  /** Public Provident Fund (India government savings scheme, 15-year lock-in). */
  PPF = 'PPF',
  /** Fixed Deposit with a bank. */
  FD = 'Fixed Deposit',
  /** Government or corporate bonds. */
  BOND = 'Bond',
  /** Gold (physical, digital, or sovereign gold bonds). */
  GOLD = 'Gold',
  /** Cryptocurrency holdings. */
  CRYPTO = 'Crypto',
  /** Investment type not fitting other categories. */
  OTHER = 'Other',
}

/**
 * Brokerage/platform providers for SIP investments.
 * Used to identify which platform auto-debits the SIP and for
 * detecting Groww transactions in bank statements.
 */
export enum SIPProvider {
  /** Groww investment platform. */
  GROWW = 'Groww',
  /** Zerodha / Coin. */
  ZERODHA = 'Zerodha',
  /** Paytm Money. */
  PAYTM_MONEY = 'Paytm Money',
  /** Upstox. */
  UPSTOX = 'Upstox',
  /** ET Money. */
  ET_MONEY = 'ET Money',
  /** Zerodha Coin (alternative label). */
  COIN = 'Coin',
  /** Direct bank SIP. */
  BANK = 'Bank',
  /** Other or unknown provider. */
  OTHER = 'Other',
}

/**
 * Indian stock exchange identifiers.
 */
export enum Exchange {
  /** National Stock Exchange of India. */
  NSE = 'NSE',
  /** Bombay Stock Exchange. */
  BSE = 'BSE',
}

/**
 * A Systematic Investment Plan (SIP) record.
 *
 * SIPs are recurring monthly investments into mutual funds, auto-debited
 * from the user's bank account on a fixed day. This interface tracks both
 * the configuration (amount, day, provider) and performance (returns, value).
 */
export interface SIP {
  /** Unique SIP identifier. */
  id: string;
  /** Owner user's ID. */
  userId: string;
  /** Display name for the SIP (e.g. "Axis Bluechip Fund"). */
  name: string;
  /** Asset type classification (usually InvestmentType.SIP). */
  type: InvestmentType;
  /** Brokerage platform executing the SIP. */
  provider: SIPProvider;
  /** Fixed monthly investment amount (INR). */
  monthlyAmount: number;
  /** Date when the SIP was first started. */
  startDate: Date;
  /** Day of month when auto-debit occurs (1-28). */
  dayOfMonth: number;
  /** Whether the SIP is set to auto-debit from the bank account. */
  autoDebit: boolean;
  /** Current market value of accumulated units (INR). */
  currentValue?: number;
  /** Total amount invested to date (INR). */
  totalInvested: number;
  /** Absolute returns: `currentValue - totalInvested` (INR). */
  totalReturns?: number;
  /** Returns as a percentage of total invested. */
  returnsPercentage?: number;
  /** Expected annual return rate for projection calculations (e.g. 12 means 12%). */
  expectedAnnualReturn?: number;
  /** Current status of the SIP. */
  status: 'active' | 'paused' | 'cancelled';
  /** Date of the most recent SIP installment. */
  lastInvestmentDate?: Date;
  /** Date of the next scheduled SIP installment. */
  nextInvestmentDate?: Date;
  /** Mutual fund folio number. */
  folioNumber?: string;
  /** User notes about this SIP. */
  notes?: string;
  /** Timestamp when this record was created. */
  createdAt: Date;
  /** Timestamp of the last update to this record. */
  updatedAt: Date;
}

/**
 * An individual stock/equity holding in the user's portfolio.
 *
 * Tracks purchase details, current market price, and calculated returns.
 * Stock prices can be refreshed via external market data APIs.
 */
export interface Stock {
  /** Unique stock holding identifier. */
  id: string;
  /** Owner user's ID. */
  userId: string;
  /** Stock ticker symbol (e.g. "RELIANCE", "TCS"). */
  symbol: string;
  /** Stock exchange where the stock is listed. */
  exchange: Exchange;
  /** Full company name. */
  companyName: string;
  /** Number of shares held. */
  quantity: number;
  /** Weighted average purchase price per share (INR). */
  averagePrice: number;
  /** Current market price per share (INR), updated via market data feeds. */
  currentPrice?: number;
  /** Date of the original purchase (or earliest purchase for averaged lots). */
  purchaseDate: Date;
  /** Total brokerage, STT, and other charges paid (INR). */
  charges: number;
  /** Total capital deployed: `quantity * averagePrice + charges` (INR). */
  totalInvested: number;
  /** Current market value: `quantity * currentPrice` (INR). */
  currentValue?: number;
  /** Absolute returns: `currentValue - totalInvested` (INR). */
  totalReturns?: number;
  /** Returns as a percentage of total invested. */
  returnsPercentage?: number;
  /** Expected annual return rate for projection calculations (e.g. 15 means 15%). */
  expectedAnnualReturn?: number;
  /** Today's price change in absolute terms (INR). */
  dayChange?: number;
  /** Today's price change as a percentage. */
  dayChangePercentage?: number;
  /** Brokerage name (e.g. "Zerodha", "Groww"). */
  broker?: string;
  /** User notes about this holding. */
  notes?: string;
  /** Timestamp when this record was created. */
  createdAt: Date;
  /** Timestamp of the last update to this record. */
  updatedAt: Date;
}

/**
 * A mutual fund holding (lump-sum, not SIP-linked).
 *
 * Tracks units held, NAV history, and performance metrics.
 * NAV data is fetched from MFAPI.in for Indian mutual funds.
 */
export interface MutualFund {
  /** Unique mutual fund holding identifier. */
  id: string;
  /** Owner user's ID. */
  userId: string;
  /** Full fund name (e.g. "Axis Bluechip Fund - Growth"). */
  fundName: string;
  /** AMFI scheme code used for NAV lookups via MFAPI.in. */
  fundCode: string;
  /** Fund category (e.g. "Large Cap", "ELSS", "Debt"). */
  category: string;
  /** Number of units held. */
  units: number;
  /** Weighted average NAV at which units were purchased. */
  averageNAV: number;
  /** Latest NAV from MFAPI.in. */
  currentNAV?: number;
  /** Date of the original purchase. */
  purchaseDate: Date;
  /** Total amount invested: `units * averageNAV` (INR). */
  totalInvested: number;
  /** Current market value: `units * currentNAV` (INR). */
  currentValue?: number;
  /** Absolute returns: `currentValue - totalInvested` (INR). */
  totalReturns?: number;
  /** Returns as a percentage of total invested. */
  returnsPercentage?: number;
  /** Whether this fund has a linked SIP. */
  sipLinked: boolean;
  /** ID of the linked SIP record, if any. */
  sipId?: string;
  /** Mutual fund folio number. */
  folioNumber?: string;
  /** Brokerage platform name. */
  broker?: string;
  /** User notes about this fund. */
  notes?: string;
  /** Timestamp when this record was created. */
  createdAt: Date;
  /** Timestamp of the last update to this record. */
  updatedAt: Date;
}

/**
 * High-level summary of the user's entire investment portfolio.
 * Displayed on the Investments page header and dashboard cards.
 */
export interface PortfolioSummary {
  /** Combined current market value of all investments (INR). */
  totalValue: number;
  /** Total capital deployed across all investments (INR). */
  totalInvested: number;
  /** Aggregate returns: `totalValue - totalInvested` (INR). */
  totalReturns: number;
  /** Aggregate returns as a percentage of total invested. */
  returnsPercentage: number;
  /** Value distribution across asset classes (INR). */
  assetAllocation: {
    /** Total current value of SIP investments (INR). */
    sips: number;
    /** Total current value of stock holdings (INR). */
    stocks: number;
    /** Total current value of mutual fund holdings (INR). */
    mutualFunds: number;
  };
  /** The single best-performing investment in the portfolio. */
  bestPerformer: {
    /** Investment name. */
    name: string;
    /** Asset type. */
    type: InvestmentType;
    /** Absolute returns (INR). */
    returns: number;
    /** Returns percentage. */
    returnsPercentage: number;
  };
  /** The single worst-performing investment in the portfolio. */
  worstPerformer: {
    /** Investment name. */
    name: string;
    /** Asset type. */
    type: InvestmentType;
    /** Absolute returns (INR, likely negative). */
    returns: number;
    /** Returns percentage (likely negative). */
    returnsPercentage: number;
  };
  /** Total portfolio value change today (INR). */
  dayChange: number;
  /** Portfolio value change today as a percentage. */
  dayChangePercentage: number;
}

/**
 * A single buy/sell/dividend event within an investment.
 * Used for XIRR calculation and transaction history display.
 */
export interface InvestmentTransaction {
  /** Unique transaction identifier. */
  id: string;
  /** ID of the parent investment (SIP, Stock, or MutualFund). */
  investmentId: string;
  /** Type of the parent investment. */
  investmentType: InvestmentType;
  /** Date the transaction occurred. */
  date: Date;
  /** Nature of the investment transaction. */
  type: 'buy' | 'sell' | 'sip' | 'dividend';
  /** Number of units/shares transacted (not applicable for dividends). */
  quantity?: number;
  /** Price per unit/share at the time of transaction (INR). */
  price: number;
  /** Total transaction amount: `quantity * price` (INR). */
  amount: number;
  /** Brokerage and other charges (INR). */
  charges: number;
  /** Optional notes about this transaction. */
  notes?: string;
}

/**
 * Input and result for an XIRR (Extended Internal Rate of Return) calculation.
 * XIRR accounts for irregular cash flow timing, providing a more accurate
 * annualized return than simple percentage calculations.
 */
export interface XIRRCalculation {
  /** Series of dated cash flows (negative for investments, positive for redemptions). */
  cashFlows: {
    /** Date of the cash flow. */
    date: Date;
    /** Amount in INR (negative = outflow/investment, positive = inflow/redemption). */
    amount: number;
  }[];
  /** Current market value of the investment, treated as a terminal positive cash flow. */
  currentValue: number;
  /** Calculated XIRR as a decimal (e.g. 0.12 = 12% annualized return). */
  xirr: number;
}

/**
 * Projected future value of an investment at a specific time horizon.
 * Used in the investment projection charts.
 */
export interface InvestmentProjection {
  /** Number of years into the future. */
  years: number;
  /** Cumulative amount that will have been invested by this point (INR). */
  investedAmount: number;
  /** Expected portfolio value at this horizon (INR). */
  expectedValue: number;
  /** Expected absolute returns: `expectedValue - investedAmount` (INR). */
  expectedReturns: number;
  /** Expected returns as a percentage. */
  returnsPercentage: number;
}

/**
 * Complete projection dataset for the investment growth chart.
 * Includes current snapshot, projections at 3/4/5 year horizons,
 * and year-by-year chart data points.
 */
export interface InvestmentProjectionData {
  /** Current total market value of all investments (INR). */
  currentValue: number;
  /** Current total amount invested (INR). */
  totalInvested: number;
  /** Projections at key time horizons. */
  projections: {
    /** 3-year projection. */
    year3: InvestmentProjection;
    /** 4-year projection. */
    year4: InvestmentProjection;
    /** 5-year projection. */
    year5: InvestmentProjection;
  };
  /** Year-by-year data points for rendering the projection line chart. */
  chartData: {
    /** Year number (0 = now, 1 = next year, etc.). */
    year: number;
    /** Cumulative invested amount at this point (INR). */
    invested: number;
    /** Projected portfolio value at this point (INR). */
    projected: number;
  }[];
}

// ============================================================================
// Needs/Wants/Investments (NWI) Classification
// ============================================================================

/**
 * The four bucket types in the NWI budgeting framework.
 *
 * NWI extends the classic 50/30/20 rule by splitting spending into:
 * - **Needs**: Essential expenses (rent, groceries, utilities, healthcare)
 * - **Wants**: Discretionary spending (dining, entertainment, shopping)
 * - **Investments**: Money allocated to wealth-building (SIPs, stocks, MFs)
 * - **Savings**: Emergency fund and short-term savings
 */
export type NWIBucketType = 'needs' | 'wants' | 'investments' | 'savings';

/**
 * User-configurable NWI budget allocation.
 *
 * Defines what percentage of income should go to each bucket and which
 * transaction categories belong to each bucket. Users can customize
 * both the target percentages and category assignments.
 */
export interface NWIConfig {
  /** Owner user's ID. */
  userId: string;
  /** Needs bucket: target percentage and assigned categories. */
  needs: { percentage: number; categories: TransactionCategory[] };
  /** Wants bucket: target percentage and assigned categories. */
  wants: { percentage: number; categories: TransactionCategory[] };
  /** Investments bucket: target percentage and assigned categories. */
  investments: { percentage: number; categories: TransactionCategory[] };
  /** Savings bucket: target percentage and assigned categories. */
  savings: { percentage: number; categories: TransactionCategory[] };
  /** ISO timestamp of the last configuration update. */
  updatedAt?: string;
}

/**
 * Computed metrics for a single NWI bucket (Needs, Wants, Investments, or Savings).
 * Compares actual spending against the target allocation.
 */
export interface NWIBucket {
  /** Human-readable bucket label (e.g. "Needs", "Wants"). */
  label: string;
  /** Target percentage of income for this bucket. */
  targetPercentage: number;
  /** Actual percentage of income spent in this bucket. */
  actualPercentage: number;
  /** Target amount based on income and target percentage (INR). */
  targetAmount: number;
  /** Actual amount spent in this bucket (INR). */
  actualAmount: number;
  /** Difference: `targetAmount - actualAmount` (positive = under budget). */
  difference: number;
  /** Per-category breakdown within this bucket. */
  categoryBreakdown: CategoryBreakdown[];
}

/**
 * Complete NWI split result showing all four buckets against total income.
 * Computed by `nwi.ts#calculateNWISplit()`.
 */
export interface NWISplit {
  /** Total income used as the denominator for percentage calculations (INR). */
  totalIncome: number;
  /** Needs bucket metrics. */
  needs: NWIBucket;
  /** Wants bucket metrics. */
  wants: NWIBucket;
  /** Investments bucket metrics. */
  investments: NWIBucket;
  /** Savings bucket metrics. */
  savings: NWIBucket;
}

// ============================================================================
// Financial Health Metrics
// ============================================================================

/**
 * Comprehensive financial health assessment metrics.
 *
 * Calculated by `financial-health.ts` to produce an overall "financial wellness score"
 * broken down into emergency fund adequacy, expense velocity trends,
 * NWI adherence, investment rate, and net worth trajectory.
 */
export interface FinancialHealthMetrics {
  /** Number of months of expenses covered by current bank balance. */
  emergencyFundMonths: number;
  /** Target emergency fund coverage in months (default: 6). */
  emergencyFundTarget: number;
  /** Month-over-month expense velocity analysis. */
  expenseVelocity: ExpenseVelocity;
  /** Overall financial freedom score (0-100). */
  financialFreedomScore: number;
  /** Component scores that make up the overall financial freedom score. */
  scoreBreakdown: {
    /** Score component for savings rate (0-100). */
    savingsRate: number;
    /** Score component for emergency fund adequacy (0-100). */
    emergencyFund: number;
    /** Score component for NWI target adherence (0-100). */
    nwiAdherence: number;
    /** Score component for investment allocation rate (0-100). */
    investmentRate: number;
  };
  /** Monthly net worth data points for the net worth trajectory chart. */
  netWorthTimeline: NetWorthPoint[];
  /** Analysis of the user's income patterns and stability. */
  incomeProfile: IncomeProfile;
}

/**
 * Expense velocity analysis comparing current vs. previous spending pace.
 * Used to detect whether expenses are accelerating, decelerating, or stable.
 */
export interface ExpenseVelocity {
  /** Average monthly expenses in the current period (INR). */
  currentMonthlyAvg: number;
  /** Average monthly expenses in the previous period (INR). */
  previousMonthlyAvg: number;
  /** Percentage change: `((current - previous) / previous) * 100`. */
  changePercent: number;
  /** Qualitative trend direction based on changePercent thresholds. */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * A single data point in the net worth timeline chart.
 * Combines bank balance and investment value for total net worth.
 */
export interface NetWorthPoint {
  /** Month identifier in "YYYY-MM" format. */
  month: string;
  /** Bank account balance at month-end (INR). */
  bankBalance: number;
  /** Total investment portfolio value at month-end (INR). */
  investmentValue: number;
  /** Total net worth: `bankBalance + investmentValue` (INR). */
  totalNetWorth: number;
}

/**
 * Analysis of the user's income patterns for financial planning.
 * Distinguishes between stable salaried income and variable freelance/business income.
 */
export interface IncomeProfile {
  /** Average monthly income over the analysis period (INR). */
  avgMonthlyIncome: number;
  /** Income stability score from 0 to 1 (inverse of coefficient of variation). 1 = perfectly stable. */
  incomeStability: number;
  /** Whether income is classified as variable (stability < 0.7). */
  isVariable: boolean;
  /** ISO date string of the most recent income transaction, or null if no income found. */
  lastIncomeDate: string | null;
}

// ============================================================================
// Growth Projections & FIRE Calculator
// ============================================================================

/**
 * FIRE (Financial Independence, Retire Early) calculation results.
 *
 * Based on the 4% safe withdrawal rate rule: the "FIRE number" is
 * 25x annual expenses. Projections use current savings rate and
 * expected investment returns to estimate years to financial independence.
 */
export interface FIRECalculation {
  /** Target net worth for financial independence: `annualExpenses * 25` (INR). */
  fireNumber: number;
  /** Current annual expenses used as the basis for the FIRE number (INR). */
  annualExpenses: number;
  /** Current total net worth (bank + investments) (INR). */
  currentNetWorth: number;
  /** Progress toward FIRE: `(currentNetWorth / fireNumber) * 100`. */
  progressPercent: number;
  /** Estimated years until FIRE number is reached. */
  yearsToFIRE: number;
  /** Monthly investment required to reach FIRE on schedule (INR). */
  monthlyRequired: number;
  /** Year-by-year projection data for the FIRE progress chart. */
  projectionData: { year: number; netWorth: number; fireTarget: number }[];
}

/**
 * Comprehensive growth projections combining SIP, emergency fund,
 * net worth, FIRE, and portfolio projections.
 * Displayed on the Goals page.
 */
export interface GrowthProjection {
  /** Per-SIP future value projections at 3, 5, and 10 year horizons. */
  sipProjections: {
    /** SIP name. */
    name: string;
    /** Current accumulated value (INR). */
    current: number;
    /** Projected value in 3 years (INR). */
    projected3y: number;
    /** Projected value in 5 years (INR). */
    projected5y: number;
    /** Projected value in 10 years (INR). */
    projected10y: number;
  }[];
  /** Emergency fund progress toward the 6-month target. */
  emergencyFundProgress: {
    /** Current emergency fund coverage in months. */
    currentMonths: number;
    /** Target coverage in months (typically 6). */
    targetMonths: number;
    /** Estimated months until the target is reached. */
    monthsToTarget: number;
  };
  /** Year-by-year net worth projection chart data. */
  netWorthProjection: { year: number; invested: number; projected: number }[];
  /** FIRE calculation results. */
  fire: FIRECalculation;
  /** Year-by-year portfolio projection broken down by asset class. */
  portfolioProjection: {
    /** Year offset from now. */
    year: number;
    /** Projected stock portfolio value (INR). */
    stocks: number;
    /** Projected mutual fund value (INR). */
    mutualFunds: number;
    /** Projected SIP value (INR). */
    sips: number;
    /** Total projected portfolio value (INR). */
    total: number;
  }[];
}

// ============================================================================
// Savings Goals (Extended)
// ============================================================================

/**
 * Persistent configuration for a user-defined savings goal.
 *
 * Goals can optionally auto-track contributions by matching transactions
 * against linked categories or keywords in descriptions. Stored in MongoDB
 * and managed via the Goals API.
 */
export interface SavingsGoalConfig {
  /** Unique goal identifier (MongoDB ObjectId string). */
  id: string;
  /** Owner user's ID. */
  userId: string;
  /** User-defined name (e.g. "Emergency Fund", "Europe Trip"). */
  name: string;
  /** Target savings amount (INR). */
  targetAmount: number;
  /** Amount saved so far (INR). */
  currentAmount: number;
  /** Deadline in ISO date format. */
  targetDate: string;
  /** Planned monthly contribution toward this goal (INR). */
  monthlyContribution: number;
  /** Whether to automatically detect contributions from matching transactions. */
  autoTrack: boolean;
  /** Goal category label (e.g. "Emergency Fund", "Car", "Vacation"). */
  category?: string;
  /** Transaction categories that count as contributions when auto-tracking. */
  linkedCategories?: string[];
  /** Keywords to match in transaction descriptions for auto-tracking. */
  linkedKeywords?: string[];
  /** IDs of transactions already confirmed/linked to this goal (to avoid re-suggesting). */
  linkedTransactionIds?: string[];
  /** ISO timestamp when the goal was created. */
  createdAt: string;
  /** ISO timestamp of the last update. */
  updatedAt: string;
}

/**
 * A transaction that was auto-linked to a savings goal based on
 * category or keyword matching.
 */
export interface LinkedTransaction {
  /** Transaction ID. */
  id: string;
  /** Transaction date in ISO format. */
  date: string;
  /** Transaction amount (INR). */
  amount: number;
  /** Transaction description. */
  description: string;
  /** Reason this transaction was linked (e.g. "Category: Savings" or "Keyword: PPF"). */
  matchReason: string;
}

/**
 * Enriched savings goal with computed progress metrics.
 * Extends `SavingsGoalConfig` with real-time calculations and linked transaction data.
 */
export interface SavingsGoalProgress extends SavingsGoalConfig {
  /** Completion percentage: `(currentAmount / targetAmount) * 100`. */
  percentageComplete: number;
  /** Whether the current pace of savings will meet the target date. */
  onTrack: boolean;
  /** Monthly contribution required to reach the target on time (INR). */
  requiredMonthly: number;
  /** Projected date when the goal will be reached at the current pace, or null if unreachable. */
  projectedCompletionDate: string | null;
  /** Number of months remaining until the target date. */
  monthsRemaining: number;
  /** Total amount auto-linked from matching transactions (INR). */
  autoLinkedAmount?: number;
  /** Transactions that were auto-linked to this goal. */
  linkedTransactions?: LinkedTransaction[];
}

// ============================================================================
// Bucket List
// ============================================================================

/**
 * Category classification for bucket list aspirational purchases.
 * Determines the icon and color scheme in the Bucket List UI.
 */
export type BucketListCategory =
  | 'electronics'
  | 'travel'
  | 'vehicle'
  | 'home'
  | 'education'
  | 'experience'
  | 'fashion'
  | 'health'
  | 'other';

/**
 * Priority level for bucket list items, affecting sort order and
 * monthly allocation suggestions.
 */
export type BucketListPriority = 'high' | 'medium' | 'low';

/**
 * Progress status of a bucket list item through its lifecycle.
 */
export type BucketListStatus = 'wishlist' | 'saving' | 'completed';

/**
 * A single price observation for a bucket list item.
 * Collected via the Perplexity Sonar API from Indian retailers.
 */
export interface PriceSnapshot {
  /** Price in INR at the time of the check. */
  price: number;
  /** Retailer or marketplace name (e.g. "Amazon.in", "Flipkart"). */
  source: string;
  /** Direct URL to the product listing page. */
  url?: string;
  /** ISO timestamp when the price was checked. */
  checkedAt: string;
}

/**
 * A deal or discount alert found during price lookups.
 * Surfaced to the user when a significant discount is available.
 */
export interface DealAlert {
  /** Short description of the deal. */
  title: string;
  /** Current discounted price (INR). */
  price: number;
  /** Original price before the discount (INR). */
  originalPrice?: number;
  /** Discount percentage: `((original - price) / original) * 100`. */
  discountPercent?: number;
  /** Retailer or marketplace offering the deal. */
  source: string;
  /** Direct URL to the deal page. */
  url?: string;
  /** ISO timestamp when the deal was discovered. */
  foundAt: string;
}

/**
 * A single item on the user's aspirational "bucket list" of things to save for.
 *
 * Each item tracks a target price, monthly savings allocation, price history
 * from automated lookups, deal alerts, and optional AI-generated savings strategies.
 */
export interface BucketListItem {
  /** Unique item identifier (MongoDB ObjectId string). */
  id: string;
  /** Owner user's ID. */
  userId: string;
  /** Item name (e.g. "MacBook Pro", "Bali Trip", "Royal Enfield"). */
  name: string;
  /** Optional detailed description of the desired item/experience. */
  description?: string;
  /** Item category for grouping and icon selection. */
  category: BucketListCategory;
  /** Savings priority affecting allocation suggestions. */
  priority: BucketListPriority;
  /** Current lifecycle status. */
  status: BucketListStatus;
  /** Target price or cost estimate (INR). */
  targetAmount: number;
  /** Amount saved toward this item so far (INR). */
  savedAmount: number;
  /** Monthly savings allocation for this item (INR). */
  monthlyAllocation: number;
  /** Optional target date to complete saving, in ISO format. */
  targetDate?: string;
  /** Display order within the bucket list (lower = higher position). */
  sortOrder: number;
  /** Historical price observations from automated lookups. */
  priceHistory: PriceSnapshot[];
  /** Active deal alerts for this item. */
  dealAlerts: DealAlert[];
  /** URL to a product image for display in the UI. */
  imageUrl?: string;
  /** User-uploaded cover image URL (takes precedence over auto imageUrl). */
  coverImageUrl?: string;
  /** AI-generated savings strategy text (from Claude via OpenRouter). */
  aiStrategy?: string;
  /** ISO timestamp when the AI strategy was last generated. */
  aiStrategyGeneratedAt?: string;
  /** ISO timestamp when this item was created. */
  createdAt: string;
  /** ISO timestamp of the last update to this item. */
  updatedAt: string;
}

/**
 * Aggregate summary of the user's entire bucket list.
 * Displayed in the Bucket List page header.
 */
export interface BucketListSummary {
  /** Total number of bucket list items. */
  totalItems: number;
  /** Number of items with status "completed". */
  completedItems: number;
  /** Sum of all target amounts across all items (INR). */
  totalTargetAmount: number;
  /** Sum of all saved amounts across all items (INR). */
  totalSavedAmount: number;
  /** Overall completion: `(totalSavedAmount / totalTargetAmount) * 100`. */
  overallProgress: number;
  /** Sum of all monthly allocations across active (non-completed) items (INR). */
  totalMonthlyAllocation: number;
}

/**
 * Structured AI-generated savings strategy for a bucket list item.
 *
 * Replaces the previous markdown-based strategy format with a typed JSON
 * structure that can be rendered as rich UI components (milestones, progress
 * timeline, saving tips cards, price optimization highlights).
 *
 * The AI prompt now requests this exact schema, and the result is stored
 * as a JSON string in `BucketListItem.aiStrategy`. The strategy-view
 * component detects JSON vs legacy markdown and renders accordingly.
 */
export interface AiStrategyData {
  /** Monthly savings plan with amount, duration, and start date. */
  monthlyPlan: {
    /** Recommended monthly savings amount (INR). */
    amount: number;
    /** Human-readable duration (e.g. "5 months"). */
    duration: string;
    /** Human-readable start date (e.g. "Mar 2026"). */
    startDate: string;
  };
  /** Four milestone checkpoints at 25%, 50%, 75%, and 100% of the target. */
  milestones: Array<{
    /** Percentage of the target (25, 50, 75, or 100). */
    percent: number;
    /** Absolute amount at this milestone (INR). */
    amount: number;
    /** Actionable tip to help reach this milestone. */
    tip: string;
  }>;
  /** Practical saving tips with estimated potential savings. */
  savingTips: Array<{
    /** Short title for the tip. */
    title: string;
    /** Detailed description of how to apply the tip. */
    description: string;
    /** Estimated amount the user could save by following this tip (INR). */
    potentialSaving: number;
  }>;
  /** Recommendations for getting the best price on the target item. */
  priceOptimization: {
    /** Best time window to make the purchase (e.g. "End of March (Holi sales)"). */
    bestTimeToBuy: string;
    /** Recommended platform or retailer (e.g. "Amazon.in"). */
    bestPlatform: string;
    /** Expected discount range (e.g. "10-15%"). */
    estimatedDiscount: string;
  };
  /** Overall risk assessment for this savings plan. */
  riskLevel: 'low' | 'medium' | 'high';
  /** AI's confidence in the feasibility of this plan. */
  confidence: 'low' | 'medium' | 'high';
  /** One-liner summary of the entire strategy. */
  summary: string;
}

/**
 * Parsed and structured result from a Perplexity Sonar price lookup.
 * Contains price observations, deals, source citations, and a summary.
 */
export interface PerplexityPriceResult {
  /** Price observations from various Indian retailers. */
  prices: PriceSnapshot[];
  /** Deals and discounts discovered during the search. */
  deals: DealAlert[];
  /** Source URLs cited by the Perplexity Sonar model. */
  citations: string[];
  /** Brief human-readable summary of the price range and best deal. */
  summary: string;
}
