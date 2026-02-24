/**
 * Spotlight calculator provider: evaluates EMI, SIP, and math expressions.
 *
 * Parses the user's query for calculator patterns (e.g. "emi 10L 8.5% 20y",
 * "sip 5000 12% 10y", "5000 + 3000") and returns formatted results with
 * INR-formatted values.
 *
 * @module lib/spotlight/providers/calculator-provider
 */

import type { SpotlightProvider, SpotlightResult } from "../types"
import { parseCalculator } from "../data/parsers"
import { calculate } from "@/lib/command-palette/calculator"
import { formatINR, formatCompact } from "@/lib/format"
import { IconCalculator, IconChartLine, IconEqual } from "@tabler/icons-react"

export const calculatorProvider: SpotlightProvider = {
  category: "calculator",

  search(query: string): SpotlightResult[] {
    const parsed = parseCalculator(query)
    if (!parsed) return []

    const calcResult = calculate({
      type: parsed.type,
      expression: parsed.expression,
      principal: parsed.principal,
      rate: parsed.rate,
      tenure: parsed.tenure,
      monthly: parsed.monthly,
      expectedReturn: parsed.expectedReturn,
      years: parsed.years,
      mathExpression: parsed.mathExpression,
    })

    if (calcResult.type === "error") return []

    if (calcResult.type === "emi") {
      const { monthlyEMI, totalAmount, totalInterest } = calcResult.data
      return [{
        id: "calc-emi",
        category: "calculator",
        title: `EMI: ${formatINR(Math.round(monthlyEMI))}/mo`,
        subtitle: `Total: ${formatCompact(Math.round(totalAmount))} · Interest: ${formatCompact(Math.round(totalInterest))}`,
        icon: IconCalculator,
        score: 95,
        expression: parsed.expression,
      }]
    }

    if (calcResult.type === "sip") {
      const { futureValue, wealthGained } = calcResult.data
      return [{
        id: "calc-sip",
        category: "calculator",
        title: `SIP Value: ${formatINR(Math.round(futureValue))}`,
        subtitle: `Wealth gained: ${formatCompact(Math.round(wealthGained))}`,
        icon: IconChartLine,
        score: 95,
        expression: parsed.expression,
      }]
    }

    // Math
    const { result, expression } = calcResult.data
    return [{
      id: "calc-math",
      category: "calculator",
      title: `= ${formatINR(result)}`,
      subtitle: expression,
      icon: IconEqual,
      score: 95,
      expression,
    }]
  },
}
