/**
 * Financial calculator for the Spotlight command palette.
 *
 * Supports three calculation types:
 * - **EMI**: Equated Monthly Installment for loans using standard amortization formula
 * - **SIP**: Systematic Investment Plan future value using compound interest
 * - **Math**: Arithmetic expression evaluation with safety sanitization
 *
 * @module lib/command-palette/calculator
 */

/**
 * Input data for a calculator operation.
 */
export interface CalculatorData {
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

/** Result of an EMI (Equated Monthly Installment) calculation. */
export interface EMIResult {
  monthlyEMI: number
  totalAmount: number
  totalInterest: number
  principal: number
  rate: number
  tenureYears: number
}

/** Result of a SIP (Systematic Investment Plan) future value calculation. */
export interface SIPResult {
  futureValue: number
  totalInvested: number
  wealthGained: number
  monthlyAmount: number
  expectedReturn: number
  years: number
}

/** Result of a simple arithmetic expression evaluation. */
export interface MathResult {
  result: number
  expression: string
}

/** Discriminated union of calculator results or an error. */
export type CalculatorResult =
  | { type: "emi"; data: EMIResult }
  | { type: "sip"; data: SIPResult }
  | { type: "math"; data: MathResult }
  | { type: "error"; message: string }

/**
 * Calculate the Equated Monthly Installment (EMI) for a loan.
 *
 * Uses the standard amortization formula:
 * `EMI = P * r * (1+r)^n / ((1+r)^n - 1)`
 * where P = principal, r = monthly rate, n = total months.
 *
 * @param principal - Loan principal amount in INR.
 * @param annualRate - Annual interest rate (e.g. 8.5 for 8.5%).
 * @param tenureYears - Loan tenure in years.
 * @returns An `EMIResult` with monthly EMI, total payment, and total interest.
 */
export function calculateEMI(principal: number, annualRate: number, tenureYears: number): EMIResult {
  const monthlyRate = annualRate / 12 / 100
  const months = tenureYears * 12

  if (monthlyRate === 0) {
    const monthlyEMI = principal / months
    return { monthlyEMI, totalAmount: principal, totalInterest: 0, principal, rate: annualRate, tenureYears }
  }

  const monthlyEMI =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)

  const totalAmount = monthlyEMI * months
  const totalInterest = totalAmount - principal

  return { monthlyEMI, totalAmount, totalInterest, principal, rate: annualRate, tenureYears }
}

/**
 * Calculate the future value of a SIP (Systematic Investment Plan).
 *
 * Uses the compound interest annuity formula:
 * `FV = P * ((1+r)^n - 1) / r * (1+r)`
 * where P = monthly investment, r = monthly return rate, n = total months.
 *
 * @param monthly - Monthly SIP investment amount in INR.
 * @param annualReturn - Expected annual return rate (e.g. 12 for 12%).
 * @param years - Investment horizon in years.
 * @returns A `SIPResult` with future value, total invested, and wealth gained.
 */
export function calculateSIP(monthly: number, annualReturn: number, years: number): SIPResult {
  const monthlyRate = annualReturn / 12 / 100
  const months = years * 12

  if (monthlyRate === 0) {
    const totalInvested = monthly * months
    return { futureValue: totalInvested, totalInvested, wealthGained: 0, monthlyAmount: monthly, expectedReturn: annualReturn, years }
  }

  const futureValue =
    monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)

  const totalInvested = monthly * months
  const wealthGained = futureValue - totalInvested

  return { futureValue, totalInvested, wealthGained, monthlyAmount: monthly, expectedReturn: annualReturn, years }
}

/**
 * Safely evaluate a simple arithmetic expression.
 *
 * Sanitizes input to only allow digits, operators, parentheses, dots, and spaces.
 * Uses `Function` constructor for evaluation in a sandboxed scope.
 *
 * @param expression - The math expression to evaluate (e.g. "5000 + 3000 * 2").
 * @returns The numeric result.
 * @throws {Error} If the expression contains invalid characters or produces a non-finite result.
 */
function evaluateMath(expression: string): number {
  // Sanitize: only allow digits, operators, parentheses, dots, spaces, commas, percent
  const sanitized = expression.replace(/,/g, "").replace(/%/g, "/100")
  if (!/^[\d\s+\-*/().]+$/.test(sanitized)) {
    throw new Error("Invalid expression")
  }
  // Use Function constructor for safe math evaluation (no access to scope)
  const fn = new Function(`"use strict"; return (${sanitized})`)
  const result = fn()
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Invalid result")
  }
  return result
}

/**
 * Route a calculator request to the appropriate calculation function.
 *
 * @param data - Calculator input with type discriminator and parameters.
 * @returns A `CalculatorResult` with the typed result or an error message.
 */
export function calculate(data: CalculatorData): CalculatorResult {
  try {
    switch (data.type) {
      case "emi": {
        if (!data.principal || !data.rate || !data.tenure) {
          return { type: "error", message: "Missing EMI parameters" }
        }
        return { type: "emi", data: calculateEMI(data.principal, data.rate, data.tenure) }
      }
      case "sip": {
        if (!data.monthly || !data.expectedReturn || !data.years) {
          return { type: "error", message: "Missing SIP parameters" }
        }
        return { type: "sip", data: calculateSIP(data.monthly, data.expectedReturn, data.years) }
      }
      case "math": {
        if (!data.mathExpression) {
          return { type: "error", message: "No expression provided" }
        }
        const result = evaluateMath(data.mathExpression)
        return { type: "math", data: { result, expression: data.mathExpression } }
      }
      default:
        return { type: "error", message: "Unknown calculation type" }
    }
  } catch {
    return { type: "error", message: "Could not evaluate expression" }
  }
}
