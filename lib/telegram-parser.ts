/**
 * Natural-language expense parser for Telegram messages.
 *
 * Supports patterns like:
 *   "Coffee 250"       -> expense, Dining, 250
 *   "250 Coffee"       -> expense, Dining, 250
 *   "Uber 350 transport" -> expense, Transport, 350
 *   "Salary 50000 income" -> income, 50000
 *   "paid 1200 for food"  -> expense, Dining, 1200
 */

/** Structured result from parsing a natural-language Telegram expense message. */
export interface ParsedExpense {
  /** Cleaned description with filler words removed and first letter capitalized. */
  description: string;
  /** Extracted amount in INR. */
  amount: number;
  /** Detected transaction type based on income keyword presence. */
  type: 'income' | 'expense';
  /** Inferred expense category (e.g. "Food & Dining", "Transport"), if a keyword matched. */
  category?: string;
  /** Detected payment method (e.g. "UPI", "Cash", "Credit Card"), if a keyword matched. */
  paymentMethod?: string;
  /** Confidence in the parse: 0.6 base, 0.8 for keyword category match, 0.9 for explicit category. */
  confidence: number;
}

// ─── Category inference maps ────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'coffee', 'tea', 'food', 'lunch', 'dinner', 'breakfast', 'snack',
    'swiggy', 'zomato', 'restaurant', 'cafe', 'biryani', 'pizza',
    'burger', 'dosa', 'thali', 'mess', 'canteen', 'chai', 'juice',
    'bakery', 'dominos', 'mcdonalds', 'starbucks', 'kfc',
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'metro', 'bus', 'auto', 'rickshaw',
    'cab', 'taxi', 'petrol', 'diesel', 'fuel', 'parking', 'toll',
    'train', 'flight', 'ferry',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'clothes',
    'shoes', 'electronics', 'phone', 'laptop', 'meesho', 'nykaa',
  ],
  'Bills & Utilities': [
    'electricity', 'water', 'gas', 'internet', 'wifi', 'broadband',
    'mobile', 'recharge', 'rent', 'maintenance', 'bill', 'jio',
    'airtel', 'vi', 'bsnl',
  ],
  'Entertainment': [
    'movie', 'netflix', 'hotstar', 'prime', 'spotify', 'youtube',
    'game', 'concert', 'show', 'theatre', 'cinema', 'pvr', 'inox',
  ],
  'Healthcare': [
    'doctor', 'hospital', 'medicine', 'pharmacy', 'medical', 'health',
    'consultation', 'lab', 'test', 'dental', 'eye', 'clinic',
  ],
  'Education': [
    'course', 'book', 'udemy', 'coursera', 'tuition', 'coaching',
    'class', 'school', 'college', 'exam', 'fee',
  ],
  'Fitness': [
    'gym', 'yoga', 'sport', 'swim', 'fitness', 'cult', 'workout',
    'protein', 'supplement',
  ],
  'Travel': [
    'hotel', 'airbnb', 'oyo', 'trip', 'vacation', 'travel',
    'booking', 'resort', 'makemytrip', 'goibibo',
  ],
  'Others': [
    'misc', 'other', 'miscellaneous',
  ],
};

const INCOME_KEYWORDS = [
  'salary', 'income', 'freelance', 'bonus', 'refund', 'cashback',
  'dividend', 'interest', 'received', 'credited', 'earned',
];

const PAYMENT_KEYWORDS: Record<string, string[]> = {
  'UPI': ['upi', 'gpay', 'phonepe', 'paytm'],
  'Credit Card': ['credit card', 'cc'],
  'Debit Card': ['debit card', 'dc'],
  'Cash': ['cash'],
  'Net Banking': ['neft', 'imps', 'bank transfer', 'net banking'],
};

// ─── Parser ─────────────────────────────────────────────────────────

/**
 * Parse a natural-language Telegram message into structured expense data.
 *
 * Supported patterns:
 * - "Coffee 250" -- description first, amount second
 * - "250 Coffee" -- amount first, description second
 * - "Uber 350 transport" -- explicit category hint at end
 * - "Salary 50000 income" -- income keyword detection
 * - "paid 1200 for food" -- filler word removal
 *
 * Rejects amounts > 10 lakh or with 10+ digits. Returns `null` if no
 * amount is found in the text.
 *
 * @param text - Raw Telegram message text.
 * @returns ParsedExpense or `null` if no amount could be extracted.
 */
export function parseExpenseMessage(text: string): ParsedExpense | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Extract amount — look for numbers (with optional comma separators)
  const amountMatch = trimmed.match(/[\d,]+(?:\.\d{1,2})?/);
  if (!amountMatch) return null;

  const rawAmount = amountMatch[0].replace(/,/g, '');
  // Reject amounts with 10+ digits (before decimal) or > 10,00,000 (10 lakh)
  if (rawAmount.replace(/\.\d+$/, '').length >= 10) return null;
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0 || amount > 1_000_000) return null;

  // Remove the amount from text to get description tokens
  const withoutAmount = trimmed.replace(amountMatch[0], '').trim();
  // Remove filler words
  const descriptionRaw = withoutAmount
    .replace(/\b(paid|spent|for|on|rs|inr|rupees)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const description = descriptionRaw || 'Expense';

  // Detect income vs expense
  const isIncome = INCOME_KEYWORDS.some((kw) => lower.includes(kw));
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

  // Infer category from keywords
  let category: string | undefined;
  let confidence = 0.6; // base confidence

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      category = cat;
      confidence = 0.8;
      break;
    }
  }

  // Check for explicit category mention at end (e.g. "Uber 350 transport")
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.includes(lastWord)) {
      category = cat;
      confidence = 0.9;
      break;
    }
  }

  // Detect payment method
  let paymentMethod: string | undefined;
  for (const [method, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      paymentMethod = method;
      break;
    }
  }

  return {
    description: description.charAt(0).toUpperCase() + description.slice(1),
    amount,
    type,
    category,
    paymentMethod,
    confidence,
  };
}
