/**
 * Tavily web search API client for fetching real-time Indian market context.
 *
 * Used by the AI investment insights pipeline to augment LLM analysis with
 * current market data. Searches are restricted to trusted Indian financial
 * news domains (MoneyControl, Economic Times, LiveMint, etc.) and structured
 * into Market Overview, Stock News, and Economic Indicators sections.
 *
 * @module lib/ai-search
 */

/** Base URL for the Tavily search API. */
const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Whitelist of trusted Indian financial news domains.
 * Search results are restricted to these domains for quality and relevance.
 */
const ALLOWED_DOMAINS = [
  'moneycontrol.com',
  'economictimes.indiatimes.com',
  'livemint.com',
  'valueresearchonline.com',
  'tickertape.in',
  'screener.in',
];

/** A single search result from the Tavily API. */
interface TavilyResult {
  /** Title of the search result page. */
  title: string;
  /** URL of the source page. */
  url: string;
  /** Extracted content snippet from the page. */
  content: string;
  /** Relevance score assigned by Tavily. */
  score: number;
}

/** Raw response from the Tavily search API. */
interface TavilyResponse {
  /** Array of search result objects. */
  results: TavilyResult[];
}

/** Aggregated search result with formatted context for LLM consumption. */
interface SearchResult {
  /** The search queries that were executed. */
  queries: string[];
  /** Total number of snippets retrieved across all queries. */
  snippetCount: number;
  /** Markdown-formatted context string ready for injection into LLM prompts. */
  context: string;
}

/**
 * Execute a single search query against the Tavily API.
 *
 * Restricted to the `ALLOWED_DOMAINS` whitelist and uses "basic" search depth.
 * Returns an empty array if the API key is missing or the request fails.
 *
 * @param query - The search query string.
 * @param maxResults - Maximum number of results to return (default: 3).
 * @returns Array of `TavilyResult` objects, or empty on failure.
 */
async function tavilySearch(query: string, maxResults = 3): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_domains: ALLOWED_DOMAINS,
        search_depth: 'basic',
      }),
    });

    if (!response.ok) return [];

    const data: TavilyResponse = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Truncate a text snippet to a maximum character length, breaking at a word boundary.
 *
 * @param text - The text to truncate.
 * @param maxChars - Maximum number of characters (default: 150).
 * @returns The truncated text with "..." appended if shortened.
 */
function truncateSnippet(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Search for real-time Indian market context to augment AI investment analysis.
 *
 * Executes three parallel Tavily searches:
 * 1. General market overview (Nifty, Sensex outlook)
 * 2. News for the user's top stock holdings (up to 5 symbols)
 * 3. Macroeconomic indicators (RBI rate, inflation, GDP)
 *
 * Results are formatted as Markdown sections suitable for injection into
 * LLM system prompts. Returns empty context if `TAVILY_API_KEY` is not set.
 *
 * @param stockSymbols - Array of stock ticker symbols the user holds (e.g. ["RELIANCE", "TCS"]).
 * @param mutualFundNames - Array of mutual fund names (currently unused, reserved for future queries).
 * @returns A `SearchResult` with the queries executed, snippet count, and formatted context.
 */
export async function searchMarketContext(
  stockSymbols: string[],
  mutualFundNames: string[]
): Promise<SearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { queries: [], snippetCount: 0, context: '' };
  }

  const queries: string[] = [];
  const snippets: string[] = [];

  // Build search queries
  const marketQuery = 'Indian stock market Nifty Sensex outlook today';
  queries.push(marketQuery);

  const topStocks = stockSymbols.slice(0, 5);
  let stockQuery = '';
  if (topStocks.length > 0) {
    stockQuery = `${topStocks.join(' ')} stock news India NSE`;
    queries.push(stockQuery);
  }

  const macroQuery = 'RBI interest rate India inflation GDP economic indicators';
  queries.push(macroQuery);

  // Run all searches in parallel
  const searchPromises = [
    tavilySearch(marketQuery, 3),
    stockQuery ? tavilySearch(stockQuery, 3) : Promise.resolve([]),
    tavilySearch(macroQuery, 3),
  ];

  const [marketResults, stockResults, macroResults] = await Promise.all(searchPromises);

  if (marketResults.length > 0) {
    snippets.push('### Market Overview');
    for (const r of marketResults) {
      snippets.push(`- ${truncateSnippet(r.content)}`);
    }
  }

  if (stockResults.length > 0) {
    snippets.push('### Stock News');
    for (const r of stockResults) {
      snippets.push(`- ${truncateSnippet(r.content)}`);
    }
  }

  if (macroResults.length > 0) {
    snippets.push('### Economic Indicators');
    for (const r of macroResults) {
      snippets.push(`- ${truncateSnippet(r.content)}`);
    }
  }

  const totalSnippets = marketResults.length + stockResults.length + macroResults.length;

  return {
    queries,
    snippetCount: totalSnippets,
    context: totalSnippets > 0
      ? `## Real-Time Market Data (from web search)\n${snippets.join('\n')}`
      : '',
  };
}
