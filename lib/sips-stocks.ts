/**
 * Investment type definitions for SIPs, stocks, and mutual funds.
 *
 * These types mirror the MongoDB document shapes used by the investments
 * page and the AI pipeline to track the user's portfolio holdings,
 * transaction history, and real-time quotes.
 *
 * @module lib/sips-stocks
 */

/** A Systematic Investment Plan (SIP) entry tracked by the user. */
export type SipEntry = {
  /** MongoDB document ID. */
  _id?: string
  /** Fund or scheme name (e.g. "Parag Parikh Flexi Cap Fund"). */
  name: string
  /** AMC or platform provider (e.g. "Groww", "Zerodha Coin"). */
  provider: string
  /** Monthly SIP installment amount in INR. */
  monthlyAmount: number
  /** ISO date string when the SIP was started. */
  startDate: string
  /** Expected annual return percentage (e.g. 12 for 12%). */
  expectedAnnualReturn?: number
  /** Current SIP status. */
  status: "active" | "paused" | "cancelled"
  /** User notes. */
  notes?: string
  /** ISO timestamp of document creation. */
  createdAt?: string
  /** ISO timestamp of last update. */
  updatedAt?: string
}

/** A stock holding in the user's portfolio. */
export type StockHolding = {
  /** MongoDB document ID. */
  _id?: string
  /** Ticker symbol (e.g. "RELIANCE", "TCS"). */
  symbol: string
  /** Exchange identifier (e.g. "NSE", "BSE"). */
  exchange: string
  /** Number of shares held. */
  shares: number
  /** Average purchase price per share in INR. */
  averageCost: number
  /** Expected annual return percentage. */
  expectedAnnualReturn?: number
  /** User notes. */
  notes?: string
  /** ISO timestamp of document creation. */
  createdAt?: string
  /** ISO timestamp of last update. */
  updatedAt?: string
}

/** Real-time stock price quote from a market data provider. */
export type StockQuote = {
  /** Ticker symbol. */
  symbol: string
  /** Current market price in INR. */
  current: number
  /** Absolute price change from previous close in INR. */
  change: number
  /** Percentage price change from previous close. */
  changePercent: number
}

/** A mutual fund holding in the user's portfolio. */
export type MutualFundHolding = {
  /** MongoDB document ID. */
  _id?: string
  /** Full AMFI scheme name. */
  schemeName: string
  /** Asset Management Company name. */
  amc?: string
  /** Fund category (e.g. "Equity", "Debt", "Hybrid"). */
  category?: string
  /** Fund sub-category (e.g. "Flexi Cap", "Small Cap"). */
  subCategory?: string
  /** Folio number for this holding. */
  folioNumber?: string
  /** Import source (e.g. "groww", "manual"). */
  source?: string
  /** Number of units held. */
  units: number
  /** Total amount invested in INR (cost basis). */
  investedValue: number
  /** Current market value of the holding in INR. */
  currentValue: number
  /** Absolute returns in INR (currentValue - investedValue). */
  returns: number
  /** Annualized XIRR as a string percentage, or null if not calculable. */
  xirr?: string | null
  /** ISO timestamp of document creation. */
  createdAt?: string
  /** ISO timestamp of last update. */
  updatedAt?: string
}

/** A single mutual fund purchase/redemption transaction (e.g. from Groww import). */
export type MutualFundTransaction = {
  /** MongoDB document ID. */
  _id?: string
  /** Full AMFI scheme name. */
  schemeName: string
  /** Transaction type (e.g. "PURCHASE", "REDEMPTION", "SIP"). */
  transactionType: string
  /** Number of units transacted. */
  units: number
  /** NAV at the time of transaction. */
  nav: number
  /** Transaction amount in INR. */
  amount: number
  /** ISO date string of the transaction. */
  date: string
  /** ISO timestamp of document creation. */
  createdAt?: string
  /** ISO timestamp of last update. */
  updatedAt?: string
}

/** A single stock buy/sell transaction (e.g. from Groww import). */
export type StockTransaction = {
  /** MongoDB document ID. */
  _id?: string
  /** Company name. */
  stockName: string
  /** Ticker symbol. */
  symbol: string
  /** ISIN code for the security. */
  isin: string
  /** Whether this was a buy or sell order. */
  type: "BUY" | "SELL"
  /** Number of shares traded. */
  quantity: number
  /** Total trade value in INR. */
  value: number
  /** Exchange where the order was executed (e.g. "NSE", "BSE"). */
  exchange: string
  /** ISO date string when the order was executed. */
  executionDate: string
  /** Broker order status (e.g. "EXECUTED", "CANCELLED"). */
  orderStatus: string
  /** ISO timestamp of document creation. */
  createdAt?: string
  /** ISO timestamp of last update. */
  updatedAt?: string
}
