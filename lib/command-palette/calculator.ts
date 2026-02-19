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

export interface EMIResult {
  monthlyEMI: number
  totalAmount: number
  totalInterest: number
  principal: number
  rate: number
  tenureYears: number
}

export interface SIPResult {
  futureValue: number
  totalInvested: number
  wealthGained: number
  monthlyAmount: number
  expectedReturn: number
  years: number
}

export interface MathResult {
  result: number
  expression: string
}

export type CalculatorResult =
  | { type: "emi"; data: EMIResult }
  | { type: "sip"; data: SIPResult }
  | { type: "math"; data: MathResult }
  | { type: "error"; message: string }

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
