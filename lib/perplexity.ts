/**
 * Perplexity Sonar API client for real-time price lookups.
 * Uses the Sonar model for grounded, citation-backed product pricing.
 * @module lib/perplexity
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  citations?: string[];
}

/**
 * Send a search-augmented completion request to Perplexity Sonar.
 * Returns the assistant message content along with any citations.
 */
export async function perplexitySearch(
  messages: PerplexityMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const model = options?.model || 'sonar';
  const maxTokens = options?.maxTokens || 1500;
  const temperature = options?.temperature ?? 0.1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
      throw new Error('Price lookup timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Perplexity');
  }

  return {
    content: data.choices[0].message.content,
    citations: data.citations || [],
  };
}

/**
 * Search for current product prices across Indian retailers.
 * Returns raw content and citations from a Perplexity Sonar query
 * that asks for structured JSON pricing data.
 */
export async function searchProductPrice(itemName: string): Promise<{
  content: string;
  citations: string[];
}> {
  return perplexitySearch([
    {
      role: 'system',
      content: `You are a price research assistant for Indian consumers. Search for the current best prices in INR for the requested product/experience across Indian retailers (Amazon.in, Flipkart, Croma, Reliance Digital, Myntra, MakeMyTrip, etc.).

Return a JSON object with this structure:
{
  "prices": [{ "price": number, "source": "retailer name", "url": "product URL if available" }],
  "deals": [{ "title": "deal description", "price": number, "originalPrice": number, "discountPercent": number, "source": "retailer", "url": "URL if available" }],
  "summary": "Brief 1-2 sentence summary of the price range and best deal"
}

Only return the JSON, no other text. Prices must be in INR.`,
    },
    {
      role: 'user',
      content: `Find current prices in India for: ${itemName}`,
    },
  ]);
}
