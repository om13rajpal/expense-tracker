/**
 * Application-wide constants for the Finova personal finance platform.
 *
 * Defines color palettes, icon mappings, display names, and configuration
 * values for transaction categories, payment methods, and transaction types.
 * Used by chart components, data tables, and UI elements across the app.
 *
 * Color values are hex strings compatible with Recharts and CSS.
 * Icon names correspond to Lucide React icon components.
 *
 * @module lib/constants
 */

import { TransactionCategory, PaymentMethod, TransactionType } from './types';

/**
 * Hex color codes for each transaction category, used in pie charts,
 * bar charts, and category badges. Colors are grouped by category type:
 * green for income, blue for essentials, purple/pink for lifestyle,
 * orange for financial, and gray for other.
 */
export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  // Income categories - Green shades
  [TransactionCategory.SALARY]: '#10b981',
  [TransactionCategory.FREELANCE]: '#34d399',
  [TransactionCategory.BUSINESS]: '#6ee7b7',
  [TransactionCategory.INVESTMENT_INCOME]: '#a7f3d0',
  [TransactionCategory.OTHER_INCOME]: '#d1fae5',

  // Essential expenses - Blue shades
  [TransactionCategory.RENT]: '#3b82f6',
  [TransactionCategory.UTILITIES]: '#60a5fa',
  [TransactionCategory.GROCERIES]: '#93c5fd',
  [TransactionCategory.HEALTHCARE]: '#bfdbfe',
  [TransactionCategory.INSURANCE]: '#dbeafe',
  [TransactionCategory.TRANSPORT]: '#2563eb',
  [TransactionCategory.FUEL]: '#1d4ed8',

  // Lifestyle - Purple/Pink shades
  [TransactionCategory.DINING]: '#a855f7',
  [TransactionCategory.ENTERTAINMENT]: '#c084fc',
  [TransactionCategory.SHOPPING]: '#e879f9',
  [TransactionCategory.TRAVEL]: '#f0abfc',
  [TransactionCategory.EDUCATION]: '#f5d0fe',
  [TransactionCategory.FITNESS]: '#9333ea',
  [TransactionCategory.PERSONAL_CARE]: '#d946ef',

  // Financial - Orange shades
  [TransactionCategory.SAVINGS]: '#f59e0b',
  [TransactionCategory.INVESTMENT]: '#fb923c',
  [TransactionCategory.LOAN_PAYMENT]: '#fdba74',
  [TransactionCategory.CREDIT_CARD]: '#fed7aa',
  [TransactionCategory.TAX]: '#ffedd5',

  // Other - Gray shades
  [TransactionCategory.SUBSCRIPTION]: '#6b7280',
  [TransactionCategory.GIFTS]: '#9ca3af',
  [TransactionCategory.CHARITY]: '#d1d5db',
  [TransactionCategory.MISCELLANEOUS]: '#e5e7eb',
  [TransactionCategory.UNCATEGORIZED]: '#f3f4f6',
};

/**
 * Hex color codes for each payment method, used in payment distribution charts.
 */
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '#22c55e',
  [PaymentMethod.DEBIT_CARD]: '#3b82f6',
  [PaymentMethod.CREDIT_CARD]: '#ef4444',
  [PaymentMethod.UPI]: '#8b5cf6',
  [PaymentMethod.NEFT]: '#06b6d4',
  [PaymentMethod.IMPS]: '#14b8a6',
  [PaymentMethod.NET_BANKING]: '#f59e0b',
  [PaymentMethod.WALLET]: '#ec4899',
  [PaymentMethod.CHEQUE]: '#6b7280',
  [PaymentMethod.OTHER]: '#94a3b8',
};

/**
 * Hex color codes for each transaction type (income=green, expense=red, etc.).
 */
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: '#10b981',
  [TransactionType.EXPENSE]: '#ef4444',
  [TransactionType.TRANSFER]: '#3b82f6',
  [TransactionType.INVESTMENT]: '#f59e0b',
  [TransactionType.REFUND]: '#8b5cf6',
};

/**
 * Lucide icon component names for each transaction category.
 * Resolved at runtime by importing from the `lucide-react` package.
 */
export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  // Income
  [TransactionCategory.SALARY]: 'Briefcase',
  [TransactionCategory.FREELANCE]: 'Laptop',
  [TransactionCategory.BUSINESS]: 'Building2',
  [TransactionCategory.INVESTMENT_INCOME]: 'TrendingUp',
  [TransactionCategory.OTHER_INCOME]: 'Coins',

  // Essential
  [TransactionCategory.RENT]: 'Home',
  [TransactionCategory.UTILITIES]: 'Zap',
  [TransactionCategory.GROCERIES]: 'ShoppingCart',
  [TransactionCategory.HEALTHCARE]: 'Heart',
  [TransactionCategory.INSURANCE]: 'Shield',
  [TransactionCategory.TRANSPORT]: 'Car',
  [TransactionCategory.FUEL]: 'Fuel',

  // Lifestyle
  [TransactionCategory.DINING]: 'UtensilsCrossed',
  [TransactionCategory.ENTERTAINMENT]: 'Film',
  [TransactionCategory.SHOPPING]: 'ShoppingBag',
  [TransactionCategory.TRAVEL]: 'Plane',
  [TransactionCategory.EDUCATION]: 'GraduationCap',
  [TransactionCategory.FITNESS]: 'Dumbbell',
  [TransactionCategory.PERSONAL_CARE]: 'Sparkles',

  // Financial
  [TransactionCategory.SAVINGS]: 'PiggyBank',
  [TransactionCategory.INVESTMENT]: 'LineChart',
  [TransactionCategory.LOAN_PAYMENT]: 'CreditCard',
  [TransactionCategory.CREDIT_CARD]: 'CreditCard',
  [TransactionCategory.TAX]: 'FileText',

  // Other
  [TransactionCategory.SUBSCRIPTION]: 'Repeat',
  [TransactionCategory.GIFTS]: 'Gift',
  [TransactionCategory.CHARITY]: 'HandHeart',
  [TransactionCategory.MISCELLANEOUS]: 'MoreHorizontal',
  [TransactionCategory.UNCATEGORIZED]: 'HelpCircle',
};

/**
 * Lucide icon component names for each payment method.
 */
export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Banknote',
  [PaymentMethod.DEBIT_CARD]: 'CreditCard',
  [PaymentMethod.CREDIT_CARD]: 'CreditCard',
  [PaymentMethod.UPI]: 'Smartphone',
  [PaymentMethod.NEFT]: 'ArrowRightLeft',
  [PaymentMethod.IMPS]: 'Zap',
  [PaymentMethod.NET_BANKING]: 'Globe',
  [PaymentMethod.WALLET]: 'Wallet',
  [PaymentMethod.CHEQUE]: 'FileText',
  [PaymentMethod.OTHER]: 'MoreHorizontal',
};

/**
 * Lucide icon component names for each transaction type.
 */
export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'ArrowDownCircle',
  [TransactionType.EXPENSE]: 'ArrowUpCircle',
  [TransactionType.TRANSFER]: 'ArrowLeftRight',
  [TransactionType.INVESTMENT]: 'TrendingUp',
  [TransactionType.REFUND]: 'RotateCcw',
};

/**
 * User-friendly display names for each transaction category.
 * Used in UI labels, dropdown menus, and report headings.
 */
export const CATEGORY_DISPLAY_NAMES: Record<TransactionCategory, string> = {
  [TransactionCategory.SALARY]: 'Salary & Wages',
  [TransactionCategory.FREELANCE]: 'Freelance Work',
  [TransactionCategory.BUSINESS]: 'Business Income',
  [TransactionCategory.INVESTMENT_INCOME]: 'Investment Returns',
  [TransactionCategory.OTHER_INCOME]: 'Other Income',

  [TransactionCategory.RENT]: 'Rent & Housing',
  [TransactionCategory.UTILITIES]: 'Utilities & Bills',
  [TransactionCategory.GROCERIES]: 'Groceries & Food',
  [TransactionCategory.HEALTHCARE]: 'Healthcare & Medical',
  [TransactionCategory.INSURANCE]: 'Insurance',
  [TransactionCategory.TRANSPORT]: 'Transportation',
  [TransactionCategory.FUEL]: 'Fuel & Gas',

  [TransactionCategory.DINING]: 'Dining & Restaurants',
  [TransactionCategory.ENTERTAINMENT]: 'Entertainment',
  [TransactionCategory.SHOPPING]: 'Shopping & Retail',
  [TransactionCategory.TRAVEL]: 'Travel & Vacation',
  [TransactionCategory.EDUCATION]: 'Education & Learning',
  [TransactionCategory.FITNESS]: 'Fitness & Sports',
  [TransactionCategory.PERSONAL_CARE]: 'Personal Care',

  [TransactionCategory.SAVINGS]: 'Savings',
  [TransactionCategory.INVESTMENT]: 'Investments',
  [TransactionCategory.LOAN_PAYMENT]: 'Loan Payments',
  [TransactionCategory.CREDIT_CARD]: 'Credit Card Bills',
  [TransactionCategory.TAX]: 'Taxes',

  [TransactionCategory.SUBSCRIPTION]: 'Subscriptions',
  [TransactionCategory.GIFTS]: 'Gifts & Donations',
  [TransactionCategory.CHARITY]: 'Charity',
  [TransactionCategory.MISCELLANEOUS]: 'Miscellaneous',
  [TransactionCategory.UNCATEGORIZED]: 'Uncategorized',
};

/**
 * Logical grouping of transaction categories by purpose.
 * Used for NWI classification defaults and category filter UI sections.
 */
export const CATEGORY_GROUPS = {
  income: [
    TransactionCategory.SALARY,
    TransactionCategory.FREELANCE,
    TransactionCategory.BUSINESS,
    TransactionCategory.INVESTMENT_INCOME,
    TransactionCategory.OTHER_INCOME,
  ],
  essential: [
    TransactionCategory.RENT,
    TransactionCategory.UTILITIES,
    TransactionCategory.GROCERIES,
    TransactionCategory.HEALTHCARE,
    TransactionCategory.INSURANCE,
    TransactionCategory.TRANSPORT,
    TransactionCategory.FUEL,
  ],
  lifestyle: [
    TransactionCategory.DINING,
    TransactionCategory.ENTERTAINMENT,
    TransactionCategory.SHOPPING,
    TransactionCategory.TRAVEL,
    TransactionCategory.EDUCATION,
    TransactionCategory.FITNESS,
    TransactionCategory.PERSONAL_CARE,
  ],
  financial: [
    TransactionCategory.SAVINGS,
    TransactionCategory.INVESTMENT,
    TransactionCategory.LOAN_PAYMENT,
    TransactionCategory.CREDIT_CARD,
    TransactionCategory.TAX,
  ],
  other: [
    TransactionCategory.SUBSCRIPTION,
    TransactionCategory.GIFTS,
    TransactionCategory.CHARITY,
    TransactionCategory.MISCELLANEOUS,
    TransactionCategory.UNCATEGORIZED,
  ],
};

/** Indian Rupee currency symbol for UI display. */
export const CURRENCY_SYMBOL = '₹';

/** ISO 4217 currency code for Indian Rupees. */
export const CURRENCY_CODE = 'INR';

/** BCP 47 locale tag for Indian English formatting (en-IN). */
export const LOCALE = 'en-IN';

/**
 * Common date format patterns used throughout the application.
 * These are descriptive labels; actual formatting uses `Intl.DateTimeFormat`.
 */
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  MEDIUM: 'DD MMM YYYY',
  LONG: 'DD MMMM YYYY',
  ISO: 'YYYY-MM-DD',
  MONTH_YEAR: 'MMMM YYYY',
} as const;

/**
 * General-purpose color palette for charts with more categories than specific mappings.
 * 10 distinct colors cycling through blue, green, amber, red, purple, pink, teal, orange, cyan, lime.
 */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

/**
 * Budget utilization thresholds for determining budget health status.
 * Values represent the fraction of budget consumed.
 */
export const BUDGET_THRESHOLDS = {
  ON_TRACK: 0.7,    // <= 70% of budget used
  WARNING: 0.9,     // 70-90% of budget used
  EXCEEDED: 1.0,    // >= 100% of budget used
} as const;

/**
 * Selectable time period options for the analytics date range picker.
 * Numeric values represent days; string values indicate special calculation modes.
 */
export const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
] as const;

/**
 * Default limits for list displays and chart data points.
 */
export const DEFAULT_LIMITS = {
  TOP_CATEGORIES: 5,
  TOP_MERCHANTS: 10,
  RECENT_TRANSACTIONS: 20,
  CHART_DATA_POINTS: 12,
} as const;

/**
 * Column header names for CSV export/import of transaction data.
 */
export const CSV_HEADERS = [
  'date',
  'description',
  'merchant',
  'category',
  'amount',
  'type',
  'paymentMethod',
  'account',
  'status',
  'tags',
  'notes',
  'location',
  'receiptUrl',
  'recurring',
  'relatedTransactionId',
] as const;

/**
 * Look up the hex color code for a given transaction category.
 *
 * @param category - The transaction category.
 * @returns Hex color string, falling back to the Uncategorized color.
 */
export function getCategoryColor(category: TransactionCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS[TransactionCategory.UNCATEGORIZED];
}

/**
 * Look up the Lucide icon name for a given transaction category.
 *
 * @param category - The transaction category.
 * @returns Lucide icon name string, falling back to the Uncategorized icon.
 */
export function getCategoryIcon(category: TransactionCategory): string {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS[TransactionCategory.UNCATEGORIZED];
}

/**
 * Look up the user-friendly display name for a given transaction category.
 *
 * @param category - The transaction category.
 * @returns Human-readable category name, falling back to the raw enum value.
 */
export function getCategoryDisplayName(category: TransactionCategory): string {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

/**
 * Look up the hex color code for a given payment method.
 *
 * @param method - The payment method.
 * @returns Hex color string, falling back to the "Other" payment method color.
 */
export function getPaymentMethodColor(method: PaymentMethod): string {
  return PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS[PaymentMethod.OTHER];
}

/**
 * Look up the Lucide icon name for a given payment method.
 *
 * @param method - The payment method.
 * @returns Lucide icon name string, falling back to the "Other" payment method icon.
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  return PAYMENT_METHOD_ICONS[method] || PAYMENT_METHOD_ICONS[PaymentMethod.OTHER];
}

/**
 * Look up the hex color code for a given transaction type.
 *
 * @param type - The transaction type.
 * @returns Hex color string.
 */
export function getTransactionTypeColor(type: TransactionType): string {
  return TRANSACTION_TYPE_COLORS[type];
}

/**
 * Look up the Lucide icon name for a given transaction type.
 *
 * @param type - The transaction type.
 * @returns Lucide icon name string.
 */
export function getTransactionTypeIcon(type: TransactionType): string {
  return TRANSACTION_TYPE_ICONS[type];
}
