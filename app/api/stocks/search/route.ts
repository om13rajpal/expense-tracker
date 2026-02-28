import { NextRequest, NextResponse } from "next/server"

import { corsHeaders, handleOptions, withAuth } from "@/lib/middleware"

interface YahooQuote {
  symbol: string
  shortname?: string
  longname?: string
  exchange?: string
  exchDisp?: string
  quoteType?: string
}

const INDIAN_EXCHANGES = new Set(["NSI", "BSI", "NSE", "BSE"])

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const q = new URL(req.url).searchParams.get("q")?.trim()
      if (!q || q.length < 2) {
        return NextResponse.json(
          { success: true, results: [] },
          { headers: corsHeaders() }
        )
      }

      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })

      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: "Yahoo Finance search failed" },
          { status: 502, headers: corsHeaders() }
        )
      }

      const data = await res.json()
      const quotes: YahooQuote[] = data?.quotes || []

      const results = quotes
        .filter((q) => q.quoteType === "EQUITY" && q.exchange && INDIAN_EXCHANGES.has(q.exchange))
        .map((q) => {
          const symbol = q.symbol.replace(/\.(NS|BO)$/, "")
          const exchange = q.exchange === "BSI" || q.exchange === "BSE" ? "BSE" : "NSE"
          return {
            symbol,
            name: q.longname || q.shortname || symbol,
            exchange,
          }
        })

      return NextResponse.json(
        { success: true, results },
        { headers: corsHeaders() }
      )
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Stock search failed" },
        { status: 500, headers: corsHeaders() }
      )
    }
  })(request)
}

export async function OPTIONS() {
  return handleOptions()
}
