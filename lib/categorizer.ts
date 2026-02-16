/**
 * Auto-categorization engine for transactions
 * Uses merchant names and keywords to classify transactions automatically
 * Includes fuzzy matching to handle bank-mangled merchant names
 */

import { TransactionCategory } from './types';

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
    'dividend',
    'interest',
    'capital gains',
    'mutual fund',
    'stock sale',
  ],
  [TransactionCategory.OTHER_INCOME]: [
    'bonus',
    'gift received',
    'cashback',
    'refund',
    'poonam',
    'jasvin',
    'mohit',
    'chhavi',
    'aaryan',
    'google',
    'transfer received',
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
    'spencers',
    'fresh',
    'vegetables',
    'fruits',
    'kirana',
    'zepto',
    'blinkit',
    'instamart',
    'dunzo',
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
    'premium',
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
    'uber',
    'ola',
    'rapido',
    'taxi',
    'metro',
    'bus',
    'auto',
    'rickshaw',
    'parking',
    'blusmart',
    'namma yatri',
    'meru cabs',
    'meru',
    'irctc',
  ],
  [TransactionCategory.FUEL]: [
    'petrol',
    'diesel',
    'fuel',
    'gas station',
    'bharat petroleum',
    'indian oil',
    'hp',
    'hindustan petroleum',
    'shell',
    'bpcl',
    'iocl',
    'hpcl',
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
    'food',
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
    'food delivery',
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
    'event',
    'bookmyshow',
    'apple',
    'apple me',
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
    'retail',
    'mall',
    'store',
    'clothing',
    'electronics',
    'zudio',
    'rebel',
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
    'central',
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
    'train',
    'flight',
    'hotel',
    'travel',
    'vacation',
    'booking.com',
    'booking',
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
    'deposit',
    'fd',
    'fixed deposit',
    'recurring deposit',
  ],
  [TransactionCategory.INVESTMENT]: [
    'investment',
    'mutual fund',
    'sip',
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
    'emi',
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
    'tax',
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
    'gift',
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
    'other',
    'monu',
    'ramesh',
    'binder',
    'ishan',
    'punit',
    'amit ku',
    'jatinder',
    'shashwa',
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
