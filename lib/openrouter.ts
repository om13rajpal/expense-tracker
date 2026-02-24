/**
 * OpenRouter API client for AI-powered financial insights.
 *
 * Uses OpenRouter as a unified gateway to access Claude (Anthropic) and other
 * LLM models for spending analysis, tax tips, budget recommendations, and
 * investment insights. Includes context-building utilities that convert raw
 * financial data into concise Markdown summaries for token-efficient LLM prompts.
 *
 * @module lib/openrouter
 */

/** Base URL for the OpenRouter chat completions API. */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * A single message in an OpenRouter chat conversation.
 */
export interface OpenRouterMessage {
  /** Role of the message sender. */
  role: 'system' | 'user' | 'assistant';
  /** Text content of the message. */
  content: string;
}

/**
 * Raw response from the OpenRouter chat completions API.
 */
export interface OpenRouterResponse {
  /** Unique response identifier. */
  id: string;
  /** Array of completion choices (typically one). */
  choices: {
    /** The assistant's response message. */
    message: {
      /** Always "assistant" for responses. */
      role: string;
      /** Generated text content. */
      content: string;
    };
    /** Reason generation stopped (e.g. "stop", "length"). */
    finish_reason: string;
  }[];
  /** Token usage statistics for billing and monitoring. */
  usage?: {
    /** Number of tokens in the input prompt. */
    prompt_tokens: number;
    /** Number of tokens in the generated response. */
    completion_tokens: number;
    /** Total tokens consumed. */
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to OpenRouter and return the assistant's response.
 *
 * Includes a 30-second timeout via AbortController. Defaults to Claude Sonnet 4.5
 * with moderate temperature (0.3) for factual financial analysis.
 *
 * @param messages - The conversation messages (system prompt + user query).
 * @param options - Optional model configuration overrides.
 * @param options.model - OpenRouter model ID (default: "anthropic/claude-sonnet-4.5").
 * @param options.maxTokens - Maximum tokens in the response (default: 3000).
 * @param options.temperature - Sampling temperature (default: 0.3).
 * @returns The assistant's response text content.
 * @throws {Error} If `OPENROUTER_API_KEY` is not configured.
 * @throws {Error} If the request times out after 30 seconds.
 * @throws {Error} If the API returns a non-200 status code.
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = options?.model || 'anthropic/claude-sonnet-4.5';
  const maxTokens = options?.maxTokens || 3000;
  const temperature = options?.temperature ?? 0.3;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://finova.local',
        'X-Title': 'Finova AI',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI analysis timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenRouter');
  }

  return data.choices[0].message.content;
}

/**
 * Build a Markdown-formatted financial context summary from transaction data.
 *
 * Summarizes income, expenses, savings, category breakdowns, large one-time
 * expenses, and monthly trends into a concise format suitable for LLM prompts.
 * Keeps token count manageable by aggregating rather than sending raw transactions.
 *
 * @param params - Aggregated financial data to summarize.
 * @param params.totalIncome - Total income in INR.
 * @param params.totalExpenses - Total expenses in INR.
 * @param params.savingsRate - Savings rate as a percentage.
 * @param params.topCategories - Top expense categories with amounts and percentages.
 * @param params.monthlyTrends - Recent monthly income/expense/savings trends.
 * @param params.dailyAverage - Average daily spending in INR.
 * @param params.recurringExpenses - Total recurring expense amount in INR.
 * @param params.oneTimeExpenses - Optional large one-time expenses to highlight.
 * @param params.accountBalance - Optional current bank account balance in INR.
 * @param params.openingBalance - Optional opening balance in INR.
 * @returns A Markdown string ready for injection into an LLM system prompt.
 */
export function buildFinancialContext(params: {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  monthlyTrends: { month: string; income: number; expenses: number; savings: number }[];
  dailyAverage: number;
  recurringExpenses: number;
  oneTimeExpenses?: { description: string; amount: number }[];
  accountBalance?: number;
  openingBalance?: number;
}): string {
  const lines: string[] = [
    `## Financial Overview (INR)`,
    `- Total Income: ${formatINR(params.totalIncome)}`,
    `- Total Expenses: ${formatINR(params.totalExpenses)}`,
    `- Net Savings: ${formatINR(params.totalIncome - params.totalExpenses)}`,
    `- Savings Rate: ${params.savingsRate.toFixed(1)}%`,
    `- Daily Average Spend: ${formatINR(params.dailyAverage)}`,
    `- Recurring Expenses: ${formatINR(params.recurringExpenses)}`,
  ];

  if (params.accountBalance !== undefined) {
    lines.push(`- Current Balance: ${formatINR(params.accountBalance)}`);
  }
  if (params.openingBalance !== undefined) {
    lines.push(`- Opening Balance: ${formatINR(params.openingBalance)}`);
  }

  lines.push('', '## Top Expense Categories');
  for (const cat of params.topCategories.slice(0, 8)) {
    lines.push(`- ${cat.category}: ${formatINR(cat.amount)} (${cat.percentage.toFixed(1)}%)`);
  }

  if (params.oneTimeExpenses && params.oneTimeExpenses.length > 0) {
    lines.push('', '## Large One-Time Expenses');
    for (const exp of params.oneTimeExpenses) {
      lines.push(`- ${exp.description}: ${formatINR(exp.amount)}`);
    }
  }

  lines.push('', '## Monthly Trends (recent)');
  for (const m of params.monthlyTrends.slice(-6)) {
    lines.push(
      `- ${m.month}: Income ${formatINR(m.income)}, Expenses ${formatINR(m.expenses)}, Savings ${formatINR(m.savings)}`
    );
  }

  return lines.join('\n');
}

/**
 * Build a Markdown-formatted investment portfolio context for LLM analysis.
 *
 * Summarizes SIPs, stock holdings, and mutual fund positions into a concise
 * format for the investment insights prompt.
 *
 * @param params - Portfolio data to summarize.
 * @param params.sips - Active SIPs with name, monthly amount, provider, and status.
 * @param params.stocks - Stock holdings with symbol, shares, average cost, and current price.
 * @param params.mutualFunds - Mutual fund holdings with invested amount, current value, and returns.
 * @param params.totalInvested - Total capital deployed across all investments (INR).
 * @param params.totalCurrentValue - Total current market value of all investments (INR).
 * @returns A Markdown string ready for injection into an LLM system prompt.
 */
export function buildInvestmentContext(params: {
  sips: { name: string; monthly: number; provider: string; status: string }[];
  stocks: { symbol: string; shares: number; avgCost: number; currentPrice?: number }[];
  mutualFunds: { name: string; invested: number; current: number; returns: number }[];
  totalInvested: number;
  totalCurrentValue: number;
}): string {
  const lines: string[] = [
    '## Investment Portfolio (INR)',
    `- Total Invested: ${formatINR(params.totalInvested)}`,
    `- Current Value: ${formatINR(params.totalCurrentValue)}`,
    `- Total Returns: ${formatINR(params.totalCurrentValue - params.totalInvested)} (${params.totalInvested > 0 ? (((params.totalCurrentValue - params.totalInvested) / params.totalInvested) * 100).toFixed(1) : 0}%)`,
  ];

  if (params.sips.length > 0) {
    lines.push('', '## Active SIPs');
    for (const sip of params.sips) {
      lines.push(`- ${sip.name} (${sip.provider}): ${formatINR(sip.monthly)}/month [${sip.status}]`);
    }
  }

  if (params.stocks.length > 0) {
    lines.push('', '## Stock Holdings');
    for (const stock of params.stocks) {
      const currentVal = stock.currentPrice ? stock.currentPrice * stock.shares : undefined;
      lines.push(
        `- ${stock.symbol}: ${stock.shares} shares @ avg ${formatINR(stock.avgCost)}${currentVal ? `, current ${formatINR(currentVal)}` : ''}`
      );
    }
  }

  if (params.mutualFunds.length > 0) {
    lines.push('', '## Mutual Funds');
    for (const mf of params.mutualFunds) {
      lines.push(
        `- ${mf.name}: Invested ${formatINR(mf.invested)}, Current ${formatINR(mf.current)}, Returns ${formatINR(mf.returns)}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Format a number as a simple Indian Rupee string with Indian grouping.
 * Local helper that avoids importing from format.ts (avoids circular deps).
 *
 * @param amount - The amount in INR.
 * @returns Formatted string like "Rs.1,25,000".
 */
function formatINR(amount: number): string {
  return `Rs.${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
