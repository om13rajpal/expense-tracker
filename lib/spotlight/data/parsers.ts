/**
 * Natural language parsers for the Spotlight command palette.
 *
 * Parses user input into structured expense entries, financial calculator
 * operations (EMI, SIP, math), and AI query detection. Supports Indian
 * amount notation (K, L/Lakh, Cr/Crore) and fuzzy brand name correction.
 *
 * @module lib/spotlight/data/parsers
 */

import { CATEGORY_MAP, PAYMENT_METHOD_MAP, FUZZY_MAP } from "./categories"

/**
 * A parsed expense extracted from natural language input.
 */
export interface ParsedExpense {
  amount: number
  description: string
  category: string
  paymentMethod: string
}

/**
 * A parsed calculator expression (EMI, SIP, or math).
 */
export interface ParsedCalculator {
  type: "emi" | "sip" | "math"
  expression: string
  principal?: number
  rate?: number
  tenure?: number
  monthly?: number
  expectedReturn?: number
  years?: number
  mathExpression?: string
}

/**
 * Apply fuzzy spelling correction to a single word using the FUZZY_MAP lookup table.
 *
 * @param word - A single word to correct.
 * @returns The corrected word, or the original lowercased word if no correction found.
 */
export function fuzzyCorrect(word: string): string {
  const lower = word.toLowerCase()
  return FUZZY_MAP[lower] || lower
}

/**
 * Apply fuzzy spelling correction to all words in an input string.
 *
 * @param input - The full user input text.
 * @returns The input with each word individually corrected.
 */
export function fuzzyCorrectInput(input: string): string {
  return input.split(/\s+/).map(fuzzyCorrect).join(" ")
}

/**
 * Parse a string into a numeric amount, supporting Indian notation.
 *
 * Handles suffixes: K/thousand (x1,000), L/Lakh (x1,00,000), Cr/Crore (x1,00,00,000).
 *
 * @param str - Amount string like "5000", "1.5L", "2Cr", "50k".
 * @returns The parsed number, or null if unparseable.
 */
export function parseIndianAmount(str: string): number | null {
  const match = str.match(/^([\d.]+)\s*(l|lakh|lakhs|cr|crore|crores|k|thousand)$/i)
  if (!match) {
    const num = parseFloat(str)
    return isNaN(num) ? null : num
  }
  const num = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  if (unit === "l" || unit === "lakh" || unit === "lakhs") return num * 100_000
  if (unit === "cr" || unit === "crore" || unit === "crores") return num * 10_000_000
  if (unit === "k" || unit === "thousand") return num * 1_000
  return num
}

/**
 * Infer the expense category from descriptive text using keyword matching.
 *
 * Applies fuzzy correction first, then scans for category keywords.
 *
 * @param text - Description text to categorize.
 * @returns The inferred category name, or "Uncategorized" if no match.
 */
export function inferCategory(text: string): string {
  const lower = fuzzyCorrectInput(text.toLowerCase())
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category
  }
  return "Uncategorized"
}

/**
 * Infer the payment method from descriptive text using keyword matching.
 *
 * @param text - Description text that may mention a payment method.
 * @returns The inferred payment method name, or "Other" if no match.
 */
export function inferPaymentMethod(text: string): string {
  const lower = text.toLowerCase()
  for (const [keyword, method] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (lower.includes(keyword)) return method
  }
  return "Other"
}

/**
 * Regex patterns for parsing natural language expense entries.
 * Supports formats like "spent 500 on food", "paid 1k for uber",
 * "coffee 150", and "200 at restaurant".
 */
const EXPENSE_PATTERNS = [
  /^spent\s+([\d,.]+[kKlLcC]?[rR]?)\s+(?:on|for|at)\s+(.+)/i,
  /^paid\s+([\d,.]+[kKlLcC]?[rR]?)\s+(?:for|to|at)\s+(.+)/i,
  /^([a-zA-Z][a-zA-Z\s]*?)\s+([\d,.]+[kKlLcC]?[rR]?)\s*(.*)$/i,
  /^([\d,.]+[kKlLcC]?[rR]?)\s+(?:on\s+|for\s+|at\s+)?([a-zA-Z].+)$/i,
]

/**
 * Parse a natural language expense string into a structured expense object.
 *
 * Tries multiple regex patterns to extract amount and description, then infers
 * the category and payment method from keywords. Returns null if no pattern matches.
 *
 * @param input - Natural language input like "spent 500 on swiggy" or "uber 250 upi".
 * @returns A `ParsedExpense` with amount, description, category, and payment method, or null.
 */
export function parseExpense(input: string): ParsedExpense | null {
  const trimmed = fuzzyCorrectInput(input.trim())

  for (const pattern of EXPENSE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (!match) continue

    let amountStr: string
    let descPart: string
    let rest = ""

    if (pattern === EXPENSE_PATTERNS[0] || pattern === EXPENSE_PATTERNS[1]) {
      amountStr = match[1]
      descPart = match[2]
    } else if (pattern === EXPENSE_PATTERNS[2]) {
      descPart = match[1]
      amountStr = match[2]
      rest = match[3] || ""
    } else {
      amountStr = match[1]
      descPart = match[2]
    }

    const amount = parseIndianAmount(amountStr.replace(/,/g, ""))
    if (!amount || amount <= 0) continue

    const fullText = `${descPart} ${rest}`.trim()
    const category = inferCategory(fullText)
    const paymentMethod = inferPaymentMethod(fullText)

    let description = fullText
    for (const kw of Object.keys(PAYMENT_METHOD_MAP)) {
      description = description.replace(new RegExp(`\\b${kw}\\b`, "gi"), "").trim()
    }

    return { amount, description, category, paymentMethod }
  }

  return null
}

const EMI_PATTERN = /^emi\s+([\d.]+[kKlLcC]?[rR]?)\s+([\d.]+)%?\s+([\d.]+)\s*(?:yr|years?|y)/i
const SIP_PATTERN = /^sip\s+([\d.]+[kKlLcC]?[rR]?)\s+([\d.]+)%?\s+([\d.]+)\s*(?:yr|years?|y)/i
const MATH_PATTERN = /^[\d\s+\-*/().,%]+$/

/**
 * Parse a calculator expression from user input (EMI, SIP, or math).
 *
 * Supported formats:
 * - EMI: "emi 10L 8.5% 20y" (principal, rate, tenure)
 * - SIP: "sip 5000 12% 10y" (monthly, return, years)
 * - Math: "5000 + 3000 * 2" (arithmetic expression)
 *
 * @param input - Calculator expression to parse.
 * @returns A `ParsedCalculator` object, or null if the input doesn't match any pattern.
 */
export function parseCalculator(input: string): ParsedCalculator | null {
  const trimmed = input.trim()

  const emiMatch = trimmed.match(EMI_PATTERN)
  if (emiMatch) {
    const principal = parseIndianAmount(emiMatch[1])
    const rate = parseFloat(emiMatch[2])
    const tenure = parseFloat(emiMatch[3])
    if (principal && !isNaN(rate) && !isNaN(tenure)) {
      return { type: "emi", expression: trimmed, principal, rate, tenure }
    }
  }

  const sipMatch = trimmed.match(SIP_PATTERN)
  if (sipMatch) {
    const monthly = parseIndianAmount(sipMatch[1])
    const expectedReturn = parseFloat(sipMatch[2])
    const years = parseFloat(sipMatch[3])
    if (monthly && !isNaN(expectedReturn) && !isNaN(years)) {
      return { type: "sip", expression: trimmed, monthly, expectedReturn, years }
    }
  }

  if (MATH_PATTERN.test(trimmed) && /[\d].*[+\-*/].*[\d]/.test(trimmed)) {
    return { type: "math", expression: trimmed, mathExpression: trimmed }
  }

  return null
}

/**
 * Determine if user input should be routed to the AI assistant.
 *
 * Returns true for questions (ending with "?"), explicit AI triggers
 * ("ask ai ..."), interrogative openings ("how", "what", "why", etc.),
 * analytical commands ("compare", "analyze", "suggest"), and inputs
 * with 5+ words (likely natural language queries rather than commands).
 *
 * @param input - The user's raw input text.
 * @returns `true` if the input should be treated as an AI query.
 */
export function isAIQuery(input: string): boolean {
  const lower = input.toLowerCase().trim()
  if (lower.endsWith("?")) return true
  if (lower.startsWith("ask ai") || lower.startsWith("ask agent")) return true
  if (lower.startsWith("how much") || lower.startsWith("how many") || lower.startsWith("how do")) return true
  if (lower.startsWith("what") || lower.startsWith("why") || lower.startsWith("when")) return true
  if (lower.startsWith("compare") || lower.startsWith("analyze") || lower.startsWith("explain")) return true
  if (lower.startsWith("suggest") || lower.startsWith("recommend")) return true
  if (lower.startsWith("tell me") || lower.startsWith("can you") || lower.startsWith("should i")) return true
  if (lower.startsWith("help me") || lower.startsWith("is it") || lower.startsWith("am i")) return true
  if (lower.startsWith("where did") || lower.startsWith("where do") || lower.startsWith("who")) return true
  if (lower.split(/\s+/).length >= 5) return true
  return false
}
