import { NextRequest, NextResponse } from "next/server"

import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"
import { getMongoDb } from "@/lib/mongodb"

type FinnhubQuote = {
  c: number
  d: number
  dp: number
}

function toFinnhubSymbol(symbol: string, exchange: string): string {
  const ex = exchange.toUpperCase()
  if (ex === "NSE") return `${symbol}.NS`
  if (ex === "BSE") return `${symbol}.BO`
  return symbol
}

function toGoogleFinanceId(symbol: string, exchange: string): string {
  const ex = exchange.toUpperCase()
  if (ex === "NSE" || ex === "BSE") return `${symbol}:${ex}`
  if (ex === "NASDAQ") return `${symbol}:NASDAQ`
  if (ex === "NYSE") return `${symbol}:NYSE`
  return `${symbol}:NSE`
}

/**
 * Fetch quote from Google Finance (works for Indian stocks)
 * Parses data-last-price and Previous close from the HTML
 */
async function fetchGoogleFinanceQuote(
  symbol: string,
  exchange: string
): Promise<{ current: number; change: number; changePercent: number } | null> {
  try {
    const gfId = toGoogleFinanceId(symbol, exchange)
    const url = `https://www.google.com/finance/quote/${gfId}`
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    if (!response.ok) return null

    const html = await response.text()

    // Extract last price
    const lastPriceMatch = html.match(/data-last-price="([^"]+)"/)
    if (!lastPriceMatch) return null
    const current = parseFloat(lastPriceMatch[1])
    if (!current || !Number.isFinite(current)) return null

    // Extract previous close from the page
    let prevClose = 0
    const prevCloseIdx = html.indexOf("Previous close")
    if (prevCloseIdx !== -1) {
      const afterPrev = html.substring(prevCloseIdx, prevCloseIdx + 500)
      const p6Match = afterPrev.match(/class="P6K39c"[^>]*>₹?([\d,]+\.?\d*)/)
      if (p6Match) {
        prevClose = parseFloat(p6Match[1].replace(/,/g, ""))
      }
    }

    const change = prevClose > 0 ? current - prevClose : 0
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

    return {
      current: Math.round(current * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    }
  } catch {
    return null
  }
}

/**
 * Fetch quote from Finnhub (works for US stocks, may work for Indian with paid plan)
 */
async function fetchFinnhubQuote(
  symbol: string,
  exchange: string,
  apiKey: string
): Promise<{ current: number; change: number; changePercent: number } | null> {
  try {
    const finnhubSymbol = toFinnhubSymbol(symbol, exchange)
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`
    )
    if (!response.ok) return null

    const data = (await response.json()) as FinnhubQuote
    const current = Number(data.c || 0)
    const change = Number(data.d || 0)
    const changePercent = Number(data.dp || 0)

    if (current === 0 && change === 0) return null

    return { current, change, changePercent }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const apiKey = process.env.FINNHUB_API_KEY || ""

      const { searchParams } = new URL(req.url)
      const symbolsParam = searchParams.get("symbols")
      if (!symbolsParam) {
        return NextResponse.json(
          { success: false, message: "Missing symbols." },
          { status: 400, headers: corsHeaders() }
        )
      }

      const requestedSymbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean)

      // Look up exchange info from the user's stored stocks
      const db = await getMongoDb()
      const userStocks = await db
        .collection("stocks")
        .find({ userId: user.userId, symbol: { $in: requestedSymbols } })
        .project({ symbol: 1, exchange: 1 })
        .toArray()

      const exchangeMap: Record<string, string> = {}
      userStocks.forEach((stock) => {
        exchangeMap[stock.symbol as string] = (stock.exchange as string) || "NSE"
      })

      const results: Record<string, { current: number; change: number; changePercent: number }> = {}

      // Fetch all quotes in parallel
      const quotePromises = requestedSymbols.map(async (symbol) => {
        const exchange = exchangeMap[symbol] || "NSE"
        const isIndian = exchange === "NSE" || exchange === "BSE"

        let quote: { current: number; change: number; changePercent: number } | null = null

        if (isIndian) {
          // For Indian stocks: try Google Finance first, then Finnhub fallback
          quote = await fetchGoogleFinanceQuote(symbol, exchange)
          if (!quote && apiKey) {
            quote = await fetchFinnhubQuote(symbol, exchange, apiKey)
            // Try alternate Indian exchange
            if (!quote) {
              const altExchange = exchange === "NSE" ? "BSE" : "NSE"
              quote = await fetchFinnhubQuote(symbol, altExchange, apiKey)
            }
          }
          // Try alternate exchange on Google Finance too
          if (!quote) {
            const altExchange = exchange === "NSE" ? "BSE" : "NSE"
            quote = await fetchGoogleFinanceQuote(symbol, altExchange)
          }
        } else {
          // For US stocks: Finnhub first, Google Finance fallback
          if (apiKey) {
            quote = await fetchFinnhubQuote(symbol, exchange, apiKey)
          }
          if (!quote) {
            quote = await fetchGoogleFinanceQuote(symbol, exchange)
          }
        }

        results[symbol] = quote || { current: 0, change: 0, changePercent: 0 }
      })

      await Promise.all(quotePromises)

      return NextResponse.json(
        { success: true, quotes: results },
        { status: 200, headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch quotes." },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
