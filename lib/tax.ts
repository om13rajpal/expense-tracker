/**
 * Indian Income Tax Calculation Engine - FY 2025-26 (AY 2026-27)
 *
 * Supports both Old and New tax regimes with full deduction handling,
 * HRA exemption, Section 87A rebate, marginal relief, and 4% cess.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaxConfig {
  grossAnnualIncome: number
  otherIncome: {
    fdInterest: number
    capitalGainsSTCG: number
    capitalGainsLTCG: number
    rentalIncome: number
    otherSources: number
  }
  deductions80C: {
    ppf: number
    elss: number
    lic: number
    epf: number
    tuitionFees: number
    homeLoanPrincipal: number
    nsc: number
    others: number
  }
  deductions80D: {
    selfHealthInsurance: number
    parentsHealthInsurance: number
    parentsAreSenior: boolean
  }
  section80TTA: number
  section24HomeLoan: number
  section80E: number
  section80CCD1B: number
  hra: {
    basicSalary: number
    hraReceived: number
    rentPaid: number
    isMetroCity: boolean
  }
  preferredRegime: "old" | "new" | "auto"
}

export interface TaxBreakdown {
  regime: "old" | "new"
  grossIncome: number
  totalOtherIncome: number
  grossTotalIncome: number
  standardDeduction: number
  hraExemption: number
  total80C: number
  capped80C: number
  total80D: number
  section80TTA: number
  section24: number
  section80E: number
  section80CCD1B: number
  totalDeductions: number
  taxableIncome: number
  taxBeforeRebate: number
  rebate87A: number
  taxAfterRebate: number
  surcharge: number
  cess: number
  totalTax: number
  effectiveRate: number
  slabBreakdown: { slab: string; rate: string; tax: number }[]
}

export interface TaxComparison {
  old: TaxBreakdown
  new: TaxBreakdown
  recommended: "old" | "new"
  savings: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OLD_STANDARD_DEDUCTION = 50_000
const NEW_STANDARD_DEDUCTION = 75_000
const SECTION_80C_LIMIT = 150_000
const SECTION_80TTA_LIMIT = 10_000
const SECTION_24_LIMIT = 200_000
const SECTION_80CCD1B_LIMIT = 50_000
const SELF_HEALTH_INSURANCE_LIMIT = 25_000
const SELF_HEALTH_INSURANCE_SENIOR_LIMIT = 50_000
const PARENTS_HEALTH_INSURANCE_LIMIT = 25_000
const PARENTS_HEALTH_INSURANCE_SENIOR_LIMIT = 50_000

// Old regime slabs
const OLD_SLABS = [
  { from: 0, to: 250_000, rate: 0 },
  { from: 250_000, to: 500_000, rate: 0.05 },
  { from: 500_000, to: 1_000_000, rate: 0.20 },
  { from: 1_000_000, to: Infinity, rate: 0.30 },
]

// New regime slabs (FY 2025-26)
const NEW_SLABS = [
  { from: 0, to: 400_000, rate: 0 },
  { from: 400_000, to: 800_000, rate: 0.05 },
  { from: 800_000, to: 1_200_000, rate: 0.10 },
  { from: 1_200_000, to: 1_600_000, rate: 0.15 },
  { from: 1_600_000, to: 2_000_000, rate: 0.20 },
  { from: 2_000_000, to: 2_400_000, rate: 0.25 },
  { from: 2_400_000, to: Infinity, rate: 0.30 },
]

const OLD_SLAB_LABELS = [
  "Up to 2.5L",
  "2.5L - 5L",
  "5L - 10L",
  "Above 10L",
]

const NEW_SLAB_LABELS = [
  "Up to 4L",
  "4L - 8L",
  "8L - 12L",
  "12L - 16L",
  "16L - 20L",
  "20L - 24L",
  "Above 24L",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateSlabTax(
  income: number,
  slabs: typeof OLD_SLABS,
  labels: string[]
): { tax: number; breakdown: { slab: string; rate: string; tax: number }[] } {
  let remaining = income
  let totalTax = 0
  const breakdown: { slab: string; rate: string; tax: number }[] = []

  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i]
    const slabWidth = slab.to === Infinity ? remaining : slab.to - slab.from
    const taxable = Math.min(remaining, slabWidth)
    const tax = Math.round(taxable * slab.rate)

    breakdown.push({
      slab: labels[i],
      rate: `${(slab.rate * 100).toFixed(0)}%`,
      tax,
    })

    totalTax += tax
    remaining -= taxable
    if (remaining <= 0) break
  }

  return { tax: totalTax, breakdown }
}

function calculateHRAExemption(hra: TaxConfig["hra"]): number {
  if (hra.rentPaid <= 0 || hra.basicSalary <= 0) return 0

  const hraReceived = hra.hraReceived
  const rentMinusPercent = hra.rentPaid - 0.10 * hra.basicSalary
  const metroPercent = hra.isMetroCity ? 0.50 : 0.40
  const salaryPercent = metroPercent * hra.basicSalary

  return Math.max(0, Math.round(Math.min(hraReceived, rentMinusPercent, salaryPercent)))
}

function calculateSurcharge(tax: number, totalIncome: number): number {
  // Surcharge rates for FY 2025-26
  if (totalIncome <= 5_000_000) return 0
  if (totalIncome <= 10_000_000) return Math.round(tax * 0.10)
  if (totalIncome <= 20_000_000) return Math.round(tax * 0.15)
  if (totalIncome <= 50_000_000) return Math.round(tax * 0.25)
  return Math.round(tax * 0.37)
}

function calculateNewRegimeSurcharge(tax: number, totalIncome: number): number {
  // New regime caps surcharge at 25% for income > 2Cr
  if (totalIncome <= 5_000_000) return 0
  if (totalIncome <= 10_000_000) return Math.round(tax * 0.10)
  if (totalIncome <= 20_000_000) return Math.round(tax * 0.15)
  return Math.round(tax * 0.25)
}

// ---------------------------------------------------------------------------
// Core Calculation
// ---------------------------------------------------------------------------

function calculateOldRegime(config: TaxConfig): TaxBreakdown {
  // Gross income
  const otherIncome =
    config.otherIncome.fdInterest +
    config.otherIncome.capitalGainsSTCG +
    config.otherIncome.capitalGainsLTCG +
    config.otherIncome.rentalIncome +
    config.otherIncome.otherSources

  const grossTotalIncome = config.grossAnnualIncome + otherIncome

  // Deductions
  const standardDeduction = Math.min(OLD_STANDARD_DEDUCTION, config.grossAnnualIncome)

  const hraExemption = calculateHRAExemption(config.hra)

  const total80C =
    config.deductions80C.ppf +
    config.deductions80C.elss +
    config.deductions80C.lic +
    config.deductions80C.epf +
    config.deductions80C.tuitionFees +
    config.deductions80C.homeLoanPrincipal +
    config.deductions80C.nsc +
    config.deductions80C.others
  const capped80C = Math.min(total80C, SECTION_80C_LIMIT)

  const selfLimit = SELF_HEALTH_INSURANCE_LIMIT // Assuming non-senior for self
  const parentsLimit = config.deductions80D.parentsAreSenior
    ? PARENTS_HEALTH_INSURANCE_SENIOR_LIMIT
    : PARENTS_HEALTH_INSURANCE_LIMIT
  const total80D =
    Math.min(config.deductions80D.selfHealthInsurance, selfLimit) +
    Math.min(config.deductions80D.parentsHealthInsurance, parentsLimit)

  const section80TTA = Math.min(config.section80TTA, SECTION_80TTA_LIMIT)
  const section24 = Math.min(config.section24HomeLoan, SECTION_24_LIMIT)
  const section80E = config.section80E // No upper limit
  const section80CCD1B = Math.min(config.section80CCD1B, SECTION_80CCD1B_LIMIT)

  const totalDeductions =
    standardDeduction + hraExemption + capped80C + total80D + section80TTA + section24 + section80E + section80CCD1B

  const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions)

  // Slab tax
  const { tax: taxBeforeRebate, breakdown: slabBreakdown } = calculateSlabTax(
    taxableIncome,
    OLD_SLABS,
    OLD_SLAB_LABELS
  )

  // Section 87A rebate: Full rebate if taxable income <= 5L
  const rebate87A = taxableIncome <= 500_000 ? taxBeforeRebate : 0
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate87A)

  // Surcharge (on income above 50L for most people this is 0)
  const surcharge = calculateSurcharge(taxAfterRebate, taxableIncome)

  // Cess: 4% on (tax + surcharge)
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04)
  const totalTax = taxAfterRebate + surcharge + cess

  const effectiveRate = grossTotalIncome > 0 ? (totalTax / grossTotalIncome) * 100 : 0

  return {
    regime: "old",
    grossIncome: config.grossAnnualIncome,
    totalOtherIncome: otherIncome,
    grossTotalIncome,
    standardDeduction,
    hraExemption,
    total80C,
    capped80C,
    total80D,
    section80TTA,
    section24,
    section80E,
    section80CCD1B,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate,
    rebate87A,
    taxAfterRebate,
    surcharge,
    cess,
    totalTax,
    effectiveRate,
    slabBreakdown,
  }
}

function calculateNewRegime(config: TaxConfig): TaxBreakdown {
  // Gross income
  const otherIncome =
    config.otherIncome.fdInterest +
    config.otherIncome.capitalGainsSTCG +
    config.otherIncome.capitalGainsLTCG +
    config.otherIncome.rentalIncome +
    config.otherIncome.otherSources

  const grossTotalIncome = config.grossAnnualIncome + otherIncome

  // New regime: Only standard deduction allowed
  const standardDeduction = Math.min(NEW_STANDARD_DEDUCTION, config.grossAnnualIncome)
  const totalDeductions = standardDeduction

  const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions)

  // Slab tax
  const { tax: taxBeforeRebate, breakdown: slabBreakdown } = calculateSlabTax(
    taxableIncome,
    NEW_SLABS,
    NEW_SLAB_LABELS
  )

  // Section 87A rebate: Full rebate if taxable income <= 7L
  // Marginal relief: if income is between 7L and ~7.27L, tax is capped at (income - 7L)
  let rebate87A = 0
  let taxAfterRebate = taxBeforeRebate

  if (taxableIncome <= 700_000) {
    rebate87A = taxBeforeRebate
    taxAfterRebate = 0
  } else if (taxableIncome <= 727_500) {
    // Marginal relief: tax should not exceed (taxableIncome - 7,00,000)
    const marginalIncome = taxableIncome - 700_000
    if (taxBeforeRebate > marginalIncome) {
      rebate87A = taxBeforeRebate - marginalIncome
      taxAfterRebate = marginalIncome
    }
  }

  // Surcharge
  const surcharge = calculateNewRegimeSurcharge(taxAfterRebate, taxableIncome)

  // Cess: 4%
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04)
  const totalTax = taxAfterRebate + surcharge + cess

  const effectiveRate = grossTotalIncome > 0 ? (totalTax / grossTotalIncome) * 100 : 0

  return {
    regime: "new",
    grossIncome: config.grossAnnualIncome,
    totalOtherIncome: otherIncome,
    grossTotalIncome,
    standardDeduction,
    hraExemption: 0,
    total80C: 0,
    capped80C: 0,
    total80D: 0,
    section80TTA: 0,
    section24: 0,
    section80E: 0,
    section80CCD1B: 0,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate,
    rebate87A,
    taxAfterRebate,
    surcharge,
    cess,
    totalTax,
    effectiveRate,
    slabBreakdown,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateTax(config: TaxConfig): TaxComparison {
  const oldResult = calculateOldRegime(config)
  const newResult = calculateNewRegime(config)

  const recommended = oldResult.totalTax <= newResult.totalTax ? "old" : "new"
  const savings = Math.abs(oldResult.totalTax - newResult.totalTax)

  return { old: oldResult, new: newResult, recommended, savings }
}

export function getDefaultTaxConfig(): TaxConfig {
  return {
    grossAnnualIncome: 0,
    otherIncome: {
      fdInterest: 0,
      capitalGainsSTCG: 0,
      capitalGainsLTCG: 0,
      rentalIncome: 0,
      otherSources: 0,
    },
    deductions80C: {
      ppf: 0,
      elss: 0,
      lic: 0,
      epf: 0,
      tuitionFees: 0,
      homeLoanPrincipal: 0,
      nsc: 0,
      others: 0,
    },
    deductions80D: {
      selfHealthInsurance: 0,
      parentsHealthInsurance: 0,
      parentsAreSenior: false,
    },
    section80TTA: 0,
    section24HomeLoan: 0,
    section80E: 0,
    section80CCD1B: 0,
    hra: {
      basicSalary: 0,
      hraReceived: 0,
      rentPaid: 0,
      isMetroCity: false,
    },
    preferredRegime: "auto",
  }
}
