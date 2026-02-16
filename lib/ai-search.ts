const TAVILY_API_URL = 'https://api.tavily.com/search';

const ALLOWED_DOMAINS = [
  'moneycontrol.com',
  'economictimes.indiatimes.com',
  'livemint.com',
  'valueresearchonline.com',
  'tickertape.in',
  'screener.in',
];

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

interface SearchResult {
  queries: string[];
  snippetCount: number;
  context: string;
}

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

function truncateSnippet(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

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
