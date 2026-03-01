/**
 * Zero-cost pattern-based intent classifier for Telegram messages.
 *
 * Priority-ordered matching with sub-millisecond execution. No API calls.
 * Questions (starting with question words or ending with ?) are routed to
 * ASK_AI rather than report/summary/budget intents.
 *
 * @module lib/telegram-intent
 */

export type Intent =
  | 'GREETING'
  | 'SHOW_MENU'
  | 'LOG_INCOME'
  | 'LOG_EXPENSE'
  | 'CHECK_BUDGET'
  | 'VIEW_SUMMARY'
  | 'VIEW_REPORT'
  | 'CHECK_GOALS'
  | 'CHECK_INVESTMENTS'
  | 'ASK_AI'
  | 'UNKNOWN';

export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
}

const GREETING_WORDS = new Set([
  'hi', 'hello', 'hey', 'hola', 'yo', 'sup', 'namaste', 'hii', 'hiii',
]);

const MENU_WORDS = new Set([
  'menu', 'help', 'options', 'start', 'commands', 'home',
]);

const INCOME_SIGNALS = new Set([
  'salary', 'received', 'credited', 'bonus', 'freelance', 'income',
  'dividend', 'interest', 'refund', 'cashback', 'earned', 'got paid',
]);

const BUDGET_WORDS = ['budget'];
const SUMMARY_WORDS = ['today', 'summary', 'daily', 'todays'];
const SUMMARY_PHRASES = ['how much today', 'what did i spend', 'today\'s summary', 'daily summary'];
const REPORT_WORDS = ['report', 'monthly', 'this month'];
const GOAL_WORDS = ['goal', 'goals', 'savings goal', 'target', 'saving'];
const INVEST_WORDS = ['investment', 'investments', 'portfolio', 'stocks', 'stock', 'mutual fund', 'mutual funds', 'sip', 'sips'];
const QUESTION_STARTERS = new Set([
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'can', 'could',
  'should', 'would', 'is', 'are', 'do', 'does', 'did', 'will',
]);
const AI_SIGNALS = ['analyze', 'analyse', 'suggest', 'recommend', 'advice', 'advise', 'tips', 'explain'];

const HAS_AMOUNT = /\d[\d,]*(?:\.\d{1,2})?/;

/**
 * Classify a plain-text Telegram message into an intent.
 *
 * @param text - Raw message text (already confirmed non-slash-command).
 * @returns Classified intent with confidence score (0-1).
 */
export function classifyIntent(text: string): ClassifiedIntent {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;
  const firstWord = words[0];
  const endsWithQuestion = trimmed.endsWith('?');
  const isQuestion = endsWithQuestion || QUESTION_STARTERS.has(firstWord);

  // 1. GREETING — short message with greeting word only
  if (wordCount <= 3 && words.some(w => GREETING_WORDS.has(w))) {
    return { intent: 'GREETING', confidence: 0.95 };
  }

  // 2. SHOW_MENU — menu/help/options keywords
  if (wordCount <= 3 && words.some(w => MENU_WORDS.has(w))) {
    return { intent: 'SHOW_MENU', confidence: 0.95 };
  }

  // 3. LOG_INCOME — has amount + income signal
  if (HAS_AMOUNT.test(lower) && Array.from(INCOME_SIGNALS).some(s => lower.includes(s))) {
    return { intent: 'LOG_INCOME', confidence: 0.9 };
  }

  // 4. LOG_EXPENSE — has amount + short descriptive text (amount+word or word+amount)
  //    But only if not a question
  if (!isQuestion && HAS_AMOUNT.test(lower) && wordCount <= 5) {
    return { intent: 'LOG_EXPENSE', confidence: 0.85 };
  }

  // 5. CHECK_BUDGET — "budget" keyword (not a question)
  if (!isQuestion && BUDGET_WORDS.some(w => lower.includes(w))) {
    return { intent: 'CHECK_BUDGET', confidence: 0.85 };
  }

  // 6. VIEW_SUMMARY — "today", "summary", exact phrases
  if (!isQuestion && (SUMMARY_PHRASES.some(p => lower.includes(p)) || SUMMARY_WORDS.some(w => lower.includes(w)))) {
    return { intent: 'VIEW_SUMMARY', confidence: 0.85 };
  }

  // 7. VIEW_REPORT — "report", "monthly", "this month" (not a question)
  if (!isQuestion && REPORT_WORDS.some(w => lower.includes(w))) {
    return { intent: 'VIEW_REPORT', confidence: 0.85 };
  }

  // 8. CHECK_GOALS — "goal", "savings", "target"
  if (!isQuestion && GOAL_WORDS.some(w => lower.includes(w))) {
    return { intent: 'CHECK_GOALS', confidence: 0.85 };
  }

  // 9. CHECK_INVESTMENTS — investment keywords
  if (!isQuestion && INVEST_WORDS.some(w => lower.includes(w))) {
    return { intent: 'CHECK_INVESTMENTS', confidence: 0.85 };
  }

  // 10. ASK_AI — question-shaped or AI signal words
  if (isQuestion || AI_SIGNALS.some(s => lower.includes(s))) {
    return { intent: 'ASK_AI', confidence: 0.8 };
  }

  // 11. LOG_EXPENSE fallback — any amount present in short text
  if (HAS_AMOUNT.test(lower) && wordCount <= 6) {
    return { intent: 'LOG_EXPENSE', confidence: 0.6 };
  }

  // 12. UNKNOWN
  return { intent: 'UNKNOWN', confidence: 0 };
}
