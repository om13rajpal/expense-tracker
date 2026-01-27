export type SipEntry = {
  _id?: string
  name: string
  provider: string
  monthlyAmount: number
  startDate: string
  expectedAnnualReturn?: number
  status: "active" | "paused" | "cancelled"
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type StockHolding = {
  _id?: string
  symbol: string
  exchange: string
  shares: number
  averageCost: number
  expectedAnnualReturn?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type StockQuote = {
  symbol: string
  current: number
  change: number
  changePercent: number
}

export type MutualFundHolding = {
  _id?: string
  schemeName: string
  amc?: string
  category?: string
  subCategory?: string
  folioNumber?: string
  source?: string
  units: number
  investedValue: number
  currentValue: number
  returns: number
  xirr?: string | null
  createdAt?: string
  updatedAt?: string
}

export type MutualFundTransaction = {
  _id?: string
  schemeName: string
  transactionType: string
  units: number
  nav: number
  amount: number
  date: string
  createdAt?: string
  updatedAt?: string
}

export type StockTransaction = {
  _id?: string
  stockName: string
  symbol: string
  isin: string
  type: "BUY" | "SELL"
  quantity: number
  value: number
  exchange: string
  executionDate: string
  orderStatus: string
  createdAt?: string
  updatedAt?: string
}
