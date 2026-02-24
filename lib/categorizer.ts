/**
 * Auto-categorization engine for transactions.
 *
 * Classifies transactions into {@link TransactionCategory} values by matching
 * merchant names and descriptions against a comprehensive pattern database
 * of Indian merchants, payment platforms, and service providers.
 *
 * Features:
 * - Fuzzy matching via Jaro-Winkler similarity to handle bank-mangled names
 * - Bank prefix stripping (UPI-, NEFT-, IMPS-, POS, etc.)
 * - Priority ordering: longer/more-specific patterns match first
 * - User-defined categorization rules (from MongoDB) override built-in patterns
 * - AI-powered batch categorization via OpenRouter/Claude for unresolved transactions
 * - Similar-merchant detection for "apply to similar" re-categorization
 *
 * @module lib/categorizer
 */

import { TransactionCategory } from './types';
import { chatCompletion } from './openrouter';

// ============================================================================
// Text Normalization Utilities
// ============================================================================

/**
 * Normalize text by removing all whitespace for fuzzy comparison.
 * Banks often mangle merchant names by inserting spaces or truncating,
 * e.g. "ZEPTONO W" -> "zeptonow", "HungerBo x" -> "hungerbox"
 */
export function stripSpaces(text: string): string {
  return text.replace(/\s+/g, '');
}

/**
 * Common prefixes added by banks/payment processors that should be
 * stripped before matching. These appear at the start of transaction
 * descriptions in Indian bank statements.
 */
const BANK_PREFIXES = [
  'UPI-', 'UPI/', 'UPI ',
  'NEFT-', 'NEFT/', 'NEFT ',
  'IMPS-', 'IMPS/', 'IMPS ',
  'POS ', 'POS-', 'POS/',
  'ATM-', 'ATM/', 'ATM ',
  'BIL/', 'BIL-', 'BIL ',
  'MMT/', 'MMT-',
  'ECOM/', 'ECOM-',
  'IB/', 'IB-',
  'MB/', 'MB-',
  'ACH/',
  'SI-', // Standing instruction
];

/**
 * Strip common bank prefixes, trailing reference numbers, city codes,
 * and UPI suffixes from a transaction description to extract the
 * actual merchant name.
 *
 * Examples:
 *   "UPI-SWIGGY LTD BAN-123456789" -> "swiggy ltd ban"
 *   "POS ZEPTONOW BANGALORE" -> "zeptonow bangalore"
 *   "BIL/TATA POWER/REF12345" -> "tata power"
 */
export function cleanBankText(text: string): string {
  let cleaned = text.trim();

  // Strip known bank prefixes (case-insensitive)
  const upper = cleaned.toUpperCase();
  for (const prefix of BANK_PREFIXES) {
    if (upper.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  // Remove trailing reference/transaction numbers (sequences of 6+ digits)
  cleaned = cleaned.replace(/[\s\-/]*\d{6,}[\s]*$/g, '');

  // Remove trailing UPI ID patterns like "merchant@upi" or "name@ybl"
  cleaned = cleaned.replace(/[\s\-]*[\w.]+@[\w]+$/i, '');

  // Remove common suffixes: city codes (3-letter all caps at end), "LTD", "PVT", "INDIA"
  cleaned = cleaned.replace(
    /\s+(PVT|LTD|PRIVATE|LIMITED|INDIA|TECHNOLOGIES|TECH|DIGITAL|PAYMENT[S]?|SOLUTION[S]?|SERVICE[S]?|ENTERPRISE[S]?)\b/gi,
    ''
  );

  // Remove trailing city names (common Indian cities at end after spaces/dashes)
  cleaned = cleaned.replace(
    /[\s\-]+(BAN|BANG|BANGALORE|BENGALURU|MUM|MUMBAI|DEL|DELHI|HYD|HYDERABAD|CHE|CHENNAI|PUN|PUNE|KOL|KOLKATA|GUR|GURGAON|GURUGRAM|NOI|NOIDA|JAI|JAIPUR|AHM|AHMEDABAD|LUC|LUCKNOW|CHD|CHANDIGARH)[\s]*$/gi,
    ''
  );

  return cleaned.trim().toLowerCase();
}

// ============================================================================
// String Similarity — Jaro-Winkler
// ============================================================================

/**
 * Jaro similarity between two strings (0 to 1).
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Jaro-Winkler similarity — boosts the score for strings sharing a common prefix.
 * Returns a value between 0 and 1, where 1 is an exact match.
 */
function jaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);

  // Compute common prefix length (max 4 chars contribute to the boost)
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * The minimum Jaro-Winkler similarity score to consider two strings
 * a fuzzy match when substring matching fails.
 */
const SIMILARITY_THRESHOLD = 0.88;

// ============================================================================
// Fuzzy Matching
// ============================================================================

/**
 * Fuzzy match: checks if the pattern appears as a substring
 * after stripping all spaces from both the text and the pattern.
 *
 * If substring matching fails, falls back to Jaro-Winkler similarity
 * comparison on the cleaned (bank-prefix-stripped) version of the text
 * against the pattern, using a configurable threshold.
 *
 * Exported so it can be reused in other modules (e.g., transaction page
 * similar-transaction matching).
 */
export function fuzzyMatch(text: string, pattern: string): boolean {
  const normalizedText = stripSpaces(text.toLowerCase());
  const normalizedPattern = stripSpaces(pattern.toLowerCase());

  // 1. Direct substring match (space-stripped)
  if (normalizedText.includes(normalizedPattern)) {
    return true;
  }

  // 2. Try matching against bank-cleaned text (strip prefixes, ref numbers, etc.)
  const cleanedText = stripSpaces(cleanBankText(text));
  if (cleanedText.includes(normalizedPattern)) {
    return true;
  }

  // 3. Jaro-Winkler similarity fallback for truncated/mangled names
  // Only apply for patterns of reasonable length (>= 4 chars) to avoid
  // false positives on short patterns like "bus", "gas", etc.
  if (normalizedPattern.length >= 4) {
    // Check similarity against sliding windows of the text
    // This handles cases where the merchant name is embedded in longer text
    const windowLen = normalizedPattern.length;
    const source = cleanedText.length > 0 ? cleanedText : normalizedText;

    if (source.length <= windowLen + 4) {
      // Short text — compare directly
      if (jaroWinklerSimilarity(source, normalizedPattern) >= SIMILARITY_THRESHOLD) {
        return true;
      }
    } else {
      // Slide a window across the text and check each segment
      for (let i = 0; i <= source.length - windowLen; i++) {
        const window = source.slice(i, i + windowLen);
        if (jaroWinklerSimilarity(window, normalizedPattern) >= SIMILARITY_THRESHOLD) {
          return true;
        }
      }
    }
  }

  return false;
}

// ============================================================================
// Category Patterns — ordered by specificity (longer patterns first
// within each category, and multi-word patterns checked before
// single-word patterns).
// ============================================================================

/**
 * Pattern entry: the pattern string and its "specificity" weight.
 * Longer/more-specific patterns get higher weight so they're checked first
 * across all categories via the sorted match list.
 */
interface PatternEntry {
  category: TransactionCategory;
  pattern: string;
  /** Length-based specificity — longer patterns are more specific */
  specificity: number;
}

/**
 * Merchant patterns for category matching.
 * Each category has an array of keywords/patterns to match against.
 */
const CATEGORY_PATTERNS: Record<TransactionCategory, string[]> = {
  // Income patterns
  [TransactionCategory.SALARY]: [
    'salary',
    'payroll',
    'wage',
    'monthly income',
    'compensation',
  ],
  [TransactionCategory.FREELANCE]: [
    'freelance',
    'upwork',
    'fiverr',
    'consulting',
    'contract payment',
  ],
  [TransactionCategory.BUSINESS]: [
    'business income',
    'revenue',
    'sales',
    'client payment',
  ],
  [TransactionCategory.INVESTMENT_INCOME]: [
    'dividend received',
    'dividend credit',
    'interest earned',
    'interest credit',
    'capital gains',
    'mutual fund redemption',
    'stock sale proceeds',
  ],
  [TransactionCategory.OTHER_INCOME]: [
    'bonus',
    'gift received',
    'cashback received',
    'cashback credit',
    'refund received',
    'refund credit',
    'transfer received',
    'reimbursement',
    'reward points',
    'reward credit',
    'prize money',
    'maturity proceeds',
    'pension credit',
    'annuity payment',
  ],

  // Essential expenses
  [TransactionCategory.RENT]: [
    'rent',
    'lease',
    'housing',
    'apartment',
    'landlord',
  ],
  [TransactionCategory.UTILITIES]: [
    'electricity',
    'water bill',
    'internet',
    'broadband',
    'phone bill',
    'mobile recharge',
    'airtel',
    'jio',
    'vodafone',
    'bsnl',
    'tata power',
    'adani electricity',
    'adani gas',
    'bescom',
    'mahanagar gas',
    'indraprastha gas',
    'hathway',
    'act fibernet',
    'spectranet',
    'tata sky',
    'dish tv',
    'd2h',
    'gas bill',
    'water supply',
    'electricity bill',
  ],
  [TransactionCategory.GROCERIES]: [
    'swiggy instamart',
    'blinkit grocery',
    'bigbasket',
    'jiomart',
    'nature basket',
    "nature's basket",
    'star bazaar',
    'grocery',
    'supermarket',
    'big bazaar',
    'dmart',
    'reliance fresh',
    'reliance smart',
    'more supermarket',
    'spencers retail',
    'vegetables',
    'fruits market',
    'kirana',
    'zepto',
    'blinkit',
    'instamart',
    'dunzo grocery',
    'milkbasket',
    'country delight',
    'grofers',
    'licious',
    'freshtohome',
    'easyday',
    'spar hypermarket',
  ],
  [TransactionCategory.HEALTHCARE]: [
    'hospital',
    'doctor',
    'pharmacy',
    'medical',
    'clinic',
    'apollo pharmacy',
    'apollo hospital',
    'fortis',
    'max healthcare',
    'medicine',
    'health',
    'practo',
    'pharmeasy',
    'netmeds',
    '1mg',
    'tata 1mg',
    'healthians',
    'thyrocare',
    'medplus',
    'medlife',
    'diagnostic',
    'lab test',
    'pathology',
    'dentist',
    'dental',
  ],
  [TransactionCategory.INSURANCE]: [
    'insurance',
    'insurance premium',
    'premium payment',
    'lic',
    'hdfc life',
    'icici prudential',
    'policy',
    'star health',
    'max bupa',
    'bajaj allianz',
    'tata aia',
    'sbi life',
    'kotak life',
    'digit insurance',
    'acko',
    'policy bazaar',
    'policybazaar',
  ],
  [TransactionCategory.TRANSPORT]: [
    'uber cab',
    'uber india',
    'uber trip',
    'ola cab',
    'ola money',
    'ola ride',
    'rapido bike',
    'rapido auto',
    'rapido ride',
    'taxi fare',
    'taxi ride',
    'metro card',
    'metro recharge',
    'metro rail',
    'dmrc',
    'bmrc',
    'bus ticket',
    'bus pass',
    'auto rickshaw',
    'rickshaw',
    'parking fee',
    'parking charge',
    'blusmart',
    'namma yatri',
    'meru cabs',
    'irctc rail',
  ],
  [TransactionCategory.FUEL]: [
    'petrol',
    'diesel',
    'fuel station',
    'fuel pump',
    'gas station',
    'bharat petroleum',
    'indian oil iocl',
    'hindustan petroleum',
    'shell petrol',
    'bpcl fuel',
    'iocl fuel',
    'hpcl fuel',
    'reliance petroleum',
    'filling station',
    'petrol pump',
  ],

  // Lifestyle
  [TransactionCategory.DINING]: [
    'restaurant',
    'cafe',
    'swiggy',
    'zomato',
    'food delivery',
    'food order',
    'food court',
    'dining',
    'pizza',
    'burger',
    'mcdonald',
    'kfc',
    'dominos',
    'starbucks',
    'cafe coffee day',
    'hungerbox',
    'hunger box',
    'wrap chip',
    'chaayos',
    'chai point',
    'barista',
    'haldirams',
    'barbeque nation',
    'box8',
    'faasos',
    'eatfit',
    'behrouz',
    'biryani',
    'subway',
    'pizza hut',
    'burger king',
    'taco bell',
    'wendy',
    'freshmenu',
    'rebel foods',
    'eatsure',
    'magicpin',
    'dineout',
  ],
  [TransactionCategory.ENTERTAINMENT]: [
    'youtube premium',
    'disney+ hotstar',
    'disney hotstar',
    'amazon prime',
    'apple.com/bill',
    'apple com bill',
    'movie',
    'cinema',
    'pvr',
    'inox',
    'netflix',
    'hotstar',
    'spotify',
    'concert',
    'event ticket',
    'event booking',
    'bookmyshow',
    'zee5',
    'sonyliv',
    'sony liv',
    'jiocinema',
    'jio cinema',
    'mubi',
    'voot',
    'aha video',
    'lionsgate',
    'audible',
    'kindle unlimited',
  ],
  [TransactionCategory.SHOPPING]: [
    'reliance digital',
    'amazon',
    'flipkart',
    'myntra',
    'ajio',
    'shopping',
    'clothing',
    'electronics',
    'zudio',
    'nykaa',
    'meesho',
    'snapdeal',
    'tata cliq',
    'tatacliq',
    'croma',
    'vijay sales',
    'decathlon',
    'ikea',
    'pepperfry',
    'urban ladder',
    'lenskart',
    'titan',
    'tanishq',
    'lifestyle',
    'shoppers stop',
    'central mall',
    'westside',
    'h&m',
    'zara',
    'uniqlo',
    'miniso',
    'muji',
    'bewakoof',
    'souled store',
  ],
  [TransactionCategory.TRAVEL]: [
    'makemytrip',
    'goibibo',
    'cleartrip',
    'train ticket',
    'train booking',
    'flight',
    'flight booking',
    'hotel booking',
    'hotel room',
    'hotel stay',
    'travel',
    'vacation',
    'booking.com',
    'airbnb',
    'oyo',
    'treebo',
    'fabhotel',
    'yatra',
    'ixigo',
    'easemytrip',
    'redbus',
    'abhibus',
    'air india',
    'indigo',
    'spicejet',
    'vistara',
    'akasa',
  ],
  [TransactionCategory.EDUCATION]: [
    'school',
    'college',
    'university',
    'course',
    'tuition',
    'books',
    'udemy',
    'coursera',
    'education',
    'thapar',
    'institute',
    'college fees',
    'unacademy',
    'byju',
    'byjus',
    'vedantu',
    'skillshare',
    'linkedin learning',
    'pluralsight',
    'edx',
    'khan academy',
    'upgrad',
    'simplilearn',
    'scaler',
    'coding ninjas',
    'leetcode',
  ],
  [TransactionCategory.FITNESS]: [
    'gym',
    'fitness',
    'yoga',
    'sports',
    'cult.fit',
    'cultfit',
    'cult fit',
    'healthify',
    'trainer',
    'gold gym',
    'anytime fitness',
    'crossfit',
    'swimming',
    'badminton',
    'playo',
    'hudle',
  ],
  [TransactionCategory.PERSONAL_CARE]: [
    'salon',
    'spa',
    'barber',
    'beauty',
    'cosmetics',
    'grooming',
    'urban company',
    'urbanclap',
    'urban clap',
    'parlour',
    'parlor',
    'haircut',
    'massage',
  ],

  // Financial
  [TransactionCategory.SAVINGS]: [
    'savings account',
    'savings deposit',
    'bank deposit',
    'fd',
    'fixed deposit',
    'recurring deposit',
  ],
  [TransactionCategory.INVESTMENT]: [
    'investment',
    'mutual fund',
    'sip investment',
    'sip payment',
    'sip debit',
    'stocks',
    'shares',
    'zerodha',
    'groww',
    'growsy',
    'upstox',
    'coin by zerodha',
    'kuvera',
    'paytm money',
    'angel one',
    'angel broking',
    '5paisa',
    'motilal oswal',
    'icicidirect',
    'icici direct',
    'hdfc securities',
    'kotak securities',
    'smallcase',
    'et money',
    'scripbox',
    'niyo',
    'mf utility',
    'mf central',
    'coin zerodha',
    'demat',
  ],
  [TransactionCategory.LOAN_PAYMENT]: [
    'loan',
    'emi payment',
    'loan emi',
    'emi debit',
    'mortgage',
    'home loan',
    'car loan',
    'personal loan',
  ],
  [TransactionCategory.CREDIT_CARD]: [
    'credit card',
    'cc payment',
    'card bill',
  ],
  [TransactionCategory.TAX]: [
    'income tax',
    'tax payment',
    'tax deducted',
    'gst',
    'tds',
    'advance tax',
  ],

  // Other
  [TransactionCategory.SUBSCRIPTION]: [
    'subscription',
    'membership',
    'annual fee',
    'monthly plan',
    'chatgpt',
    'openai',
    'notion',
    'github',
    'canva',
    'adobe',
    'microsoft 365',
    'microsoft365',
    'google one',
    'google storage',
    'icloud',
    'icloud+',
    'dropbox',
    'evernote',
    'todoist',
    'figma',
    'slack',
    'zoom',
    'grammarly',
    'medium',
    'substack',
  ],
  [TransactionCategory.GIFTS]: [
    'gift purchase',
    'gift card',
    'gift voucher',
    'present',
    'flowers',
  ],
  [TransactionCategory.CHARITY]: [
    'donation',
    'charity',
    'ngo',
    'temple',
    'church',
    'mosque',
  ],
  [TransactionCategory.MISCELLANEOUS]: [
    'miscellaneous',
    'misc',
    'unclassified',
  ],
  [TransactionCategory.UNCATEGORIZED]: [],
};

// ============================================================================
// Build a sorted pattern list for priority matching
// ============================================================================

/**
 * Flatten all category patterns into a single sorted list.
 * Longer (more specific) patterns are checked first, so
 * "swiggy instamart" (Groceries) matches before "swiggy" (Dining).
 */
let sortedPatterns: PatternEntry[] | null = null;

function getSortedPatterns(): PatternEntry[] {
  if (sortedPatterns) return sortedPatterns;

  const entries: PatternEntry[] = [];
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      entries.push({
        category: category as TransactionCategory,
        pattern,
        specificity: stripSpaces(pattern).length,
      });
    }
  }

  // Sort descending by specificity (longest patterns first)
  entries.sort((a, b) => b.specificity - a.specificity);
  sortedPatterns = entries;
  return entries;
}

/**
 * Invalidate the sorted patterns cache when custom patterns are added.
 */
function invalidatePatternCache(): void {
  sortedPatterns = null;
}

// ============================================================================
// Categorization Functions
// ============================================================================

/**
 * Rule interface matching what's stored in MongoDB categorization_rules.
 */
export interface CategorizationRule {
  pattern: string;
  matchField: 'merchant' | 'description' | 'any';
  category: string;
  caseSensitive: boolean;
  enabled: boolean;
}

/**
 * Categorizes a transaction based on merchant name and description.
 * Uses fuzzy matching with priority ordering (longer patterns first)
 * to handle bank-mangled merchant names.
 *
 * @param merchant - Merchant name from transaction
 * @param description - Transaction description
 * @returns Detected category or UNCATEGORIZED
 */
export function categorizeTransaction(
  merchant: string,
  description: string
): TransactionCategory {
  const searchText = `${merchant} ${description}`;

  // Match against sorted patterns (longest/most-specific first)
  const patterns = getSortedPatterns();
  for (const entry of patterns) {
    if (fuzzyMatch(searchText, entry.pattern)) {
      return entry.category;
    }
  }

  // Default to uncategorized if no match found
  return TransactionCategory.UNCATEGORIZED;
}

/**
 * Categorizes a transaction, applying user-defined rules first.
 * User rules always take priority over built-in patterns.
 *
 * @param merchant - Merchant name from transaction
 * @param description - Transaction description
 * @param rules - User-defined categorization rules (from MongoDB)
 * @returns Detected category or UNCATEGORIZED
 */
export function categorizeWithRules(
  merchant: string,
  description: string,
  rules: CategorizationRule[]
): string {
  // Step 1: User-defined rules (highest priority, first match wins)
  for (const rule of rules) {
    if (!rule.enabled) continue;

    let textToSearch = '';
    if (rule.matchField === 'merchant') textToSearch = merchant;
    else if (rule.matchField === 'description') textToSearch = description;
    else textToSearch = `${merchant} ${description}`;

    const haystack = rule.caseSensitive ? textToSearch : textToSearch.toLowerCase();
    const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

    if (haystack.includes(needle)) {
      return rule.category;
    }
  }

  // Step 2: Built-in pattern matching
  return categorizeTransaction(merchant, description);
}

/**
 * Bulk categorize multiple transactions
 * @param transactions - Array of transaction data
 * @returns Array of categories matching input order
 */
export function bulkCategorize(
  transactions: Array<{ merchant: string; description: string }>
): TransactionCategory[] {
  return transactions.map(({ merchant, description }) =>
    categorizeTransaction(merchant, description)
  );
}

/**
 * Get suggested categories for a merchant/description
 * Returns top 3 most likely categories with confidence scores
 * @param merchant - Merchant name
 * @param description - Transaction description
 * @returns Array of category suggestions with scores
 */
export function getSuggestedCategories(
  merchant: string,
  description: string
): Array<{ category: TransactionCategory; confidence: number }> {
  const searchText = `${merchant} ${description}`;
  const suggestions: Array<{ category: TransactionCategory; confidence: number }> = [];

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    const totalMatches = patterns.length;

    if (totalMatches === 0) continue;

    for (const pattern of patterns) {
      if (fuzzyMatch(searchText, pattern)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = matchCount / totalMatches;
      suggestions.push({
        category: category as TransactionCategory,
        confidence: Math.min(confidence * 100, 100),
      });
    }
  }

  // Sort by confidence and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Add custom pattern for a category
 * Useful for user-specific merchant patterns
 * @param category - Category to add pattern to
 * @param pattern - Pattern to add
 */
export function addCustomPattern(
  category: TransactionCategory,
  pattern: string
): void {
  if (!CATEGORY_PATTERNS[category].includes(pattern)) {
    CATEGORY_PATTERNS[category].push(pattern);
    invalidatePatternCache();
  }
}

/**
 * Get all patterns for a category
 * @param category - Category to get patterns for
 * @returns Array of patterns
 */
export function getCategoryPatterns(
  category: TransactionCategory
): string[] {
  return [...CATEGORY_PATTERNS[category]];
}

/**
 * Check if a merchant matches a specific category
 * @param merchant - Merchant name
 * @param category - Category to check
 * @returns True if merchant matches category patterns
 */
export function merchantMatchesCategory(
  merchant: string,
  category: TransactionCategory
): boolean {
  const patterns = CATEGORY_PATTERNS[category];

  return patterns.some(pattern => fuzzyMatch(merchant, pattern));
}

// ============================================================================
// Similar Transaction Matching (for use in transaction page)
// ============================================================================

/**
 * Checks whether two merchant/description strings refer to the same merchant,
 * using the same fuzzy matching logic used by the categorizer.
 *
 * This is intended for the "apply to similar transactions" feature:
 * when a user re-categorizes one transaction, find others from the same merchant.
 *
 * @param text1 - First merchant or description text
 * @param text2 - Second merchant or description text
 * @param minLength - Minimum length of the shorter text to attempt matching (default 3)
 * @returns True if the two texts appear to refer to the same merchant
 */
export function isSimilarMerchant(text1: string, text2: string, minLength = 3): boolean {
  const clean1 = stripSpaces(cleanBankText(text1));
  const clean2 = stripSpaces(cleanBankText(text2));

  // Guard against very short strings that would match everything
  if (clean1.length < minLength || clean2.length < minLength) {
    return false;
  }

  // 1. Direct substring match (either direction)
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return true;
  }

  // 2. Space-stripped substring match on raw text
  const stripped1 = stripSpaces(text1.toLowerCase());
  const stripped2 = stripSpaces(text2.toLowerCase());

  if (stripped1.length >= minLength && stripped2.length >= minLength) {
    if (stripped1.includes(stripped2) || stripped2.includes(stripped1)) {
      return true;
    }
  }

  // 3. Jaro-Winkler similarity on the cleaned versions
  const shorter = clean1.length <= clean2.length ? clean1 : clean2;
  const longer = clean1.length <= clean2.length ? clean2 : clean1;

  if (shorter.length >= 4) {
    // Check full-string similarity
    if (jaroWinklerSimilarity(clean1, clean2) >= SIMILARITY_THRESHOLD) {
      return true;
    }

    // Also check if the shorter is a high-similarity substring of the longer
    if (longer.length > shorter.length + 4) {
      for (let i = 0; i <= longer.length - shorter.length; i++) {
        const window = longer.slice(i, i + shorter.length);
        if (jaroWinklerSimilarity(window, shorter) >= SIMILARITY_THRESHOLD) {
          return true;
        }
      }
    }
  }

  return false;
}

// ============================================================================
// AI-Powered Categorization (batch via OpenRouter / Claude)
// ============================================================================

const VALID_CATEGORIES = Object.values(TransactionCategory);

const AI_CATEGORIZE_SYSTEM_PROMPT = `You are a transaction categorization engine for an Indian personal finance app. Your job is to assign the most accurate category to each transaction.

VALID CATEGORIES (use EXACTLY one of these strings):
${VALID_CATEGORIES.map((c) => `- "${c}"`).join('\n')}

CONTEXT:
- These are Indian bank/UPI transactions. Merchant names may be mangled by banks (truncated, extra spaces, UPI suffixes).
- Common prefixes like "UPI-", "NEFT-", "IMPS-", "POS " should be ignored when identifying the merchant.
- UPI IDs (e.g. merchant@ybl, name@oksbi) often reveal the merchant name.
- Consider the transaction type (income vs expense) when choosing categories. Income transactions should use income categories (Salary, Freelance, Business, Investment Income, Other Income).

RESPONSE FORMAT (strict):
Return ONLY a valid JSON array. No markdown, no code fences, no extra text.
Each element must be:
{ "id": "<transaction id>", "category": "<exact category string from list above>", "confidence": <number 0-100> }

RULES:
- confidence: 90-100 for clear matches, 70-89 for likely matches, below 70 for guesses.
- If truly unidentifiable, use "Uncategorized" with low confidence.
- Never invent categories outside the valid list.`;

/**
 * Send a batch of transactions to Claude AI for categorization.
 * Returns category assignments with confidence scores.
 *
 * @param transactions - Batch of transactions to categorize (max 50)
 * @param validCategories - List of valid category strings
 * @returns Array of { id, category, confidence } for each transaction
 */
export async function aiCategorizeBatch(
  transactions: Array<{
    id: string;
    merchant: string;
    description: string;
    amount: number;
    type: string;
    date: string;
  }>,
  validCategories: string[]
): Promise<Array<{ id: string; category: string; confidence: number }>> {
  if (transactions.length === 0) return [];

  const userMessage = `Categorize these ${transactions.length} transactions:\n\n${JSON.stringify(
    transactions.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
    })),
    null,
    2
  )}`;

  const raw = await chatCompletion(
    [
      { role: 'system', content: AI_CATEGORIZE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 4000, temperature: 0.1 }
  );

  // Strip code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Extract JSON array from response
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart === -1 || arrEnd === -1) {
    throw new Error('AI response did not contain a JSON array');
  }

  const parsed: unknown[] = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));

  const validSet = new Set(validCategories);

  return parsed
    .filter(
      (item): item is { id: string; category: string; confidence: number } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).category === 'string' &&
        typeof (item as Record<string, unknown>).confidence === 'number'
    )
    .map((item) => ({
      id: item.id,
      category: validSet.has(item.category) ? item.category : 'Uncategorized',
      confidence: item.confidence,
    }));
}
