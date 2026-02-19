import { CATEGORY_MAP, PAYMENT_METHOD_MAP, FUZZY_MAP } from "./categories"

export interface ParsedExpense {
  amount: number
  description: string
  category: string
  paymentMethod: string
}

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

export function fuzzyCorrect(word: string): string {
  const lower = word.toLowerCase()
  return FUZZY_MAP[lower] || lower
}

export function fuzzyCorrectInput(input: string): string {
  return input.split(/\s+/).map(fuzzyCorrect).join(" ")
}

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

export function inferCategory(text: string): string {
  const lower = fuzzyCorrectInput(text.toLowerCase())
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category
  }
  return "Uncategorized"
}

export function inferPaymentMethod(text: string): string {
  const lower = text.toLowerCase()
  for (const [keyword, method] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (lower.includes(keyword)) return method
  }
  return "Other"
}

const EXPENSE_PATTERNS = [
  /^spent\s+([\d,.]+[kKlLcC]?[rR]?)\s+(?:on|for|at)\s+(.+)/i,
  /^paid\s+([\d,.]+[kKlLcC]?[rR]?)\s+(?:for|to|at)\s+(.+)/i,
  /^([a-zA-Z][a-zA-Z\s]*?)\s+([\d,.]+[kKlLcC]?[rR]?)\s*(.*)$/i,
  /^([\d,.]+[kKlLcC]?[rR]?)\s+(?:on\s+|for\s+|at\s+)?([a-zA-Z].+)$/i,
]

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
