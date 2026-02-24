/**
 * Perplexity Sonar API client for real-time product price lookups.
 *
 * Uses the Perplexity Sonar model for grounded, citation-backed product pricing
 * across Indian retailers (Amazon.in, Flipkart, Croma, etc.). Primarily used
 * by the Bucket List feature to fetch current prices and deal alerts for
 * aspirational purchase items.
 *
 * @module lib/perplexity
 */

/** Base URL for the Perplexity chat completions API. */
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * A single message in a Perplexity Sonar conversation.
 * Follows the standard chat completion message format.
 */
export interface PerplexityMessage {
  /** The role of the message sender in the conversation. */
  role: 'system' | 'user' | 'assistant';
  /** The text content of the message. */
  content: string;
}

/**
 * Raw response from the Perplexity Sonar chat completions API.
 * Includes the model's response choices and optional source citations.
 */
export interface PerplexityResponse {
  /** Unique identifier for this API response. */
  id: string;
  /** Array of completion choices (typically one). */
  choices: {
    /** The assistant's response message. */
    message: {
      /** Always "assistant" for response messages. */
      role: string;
      /** The generated text content. */
      content: string;
    };
    /** Reason the generation stopped (e.g. "stop", "length"). */
    finish_reason: string;
  }[];
  /** Source URLs cited by the Sonar model to ground its response (unique to Perplexity). */
  citations?: string[];
}

/**
 * Send a search-augmented chat completion request to Perplexity Sonar.
 *
 * The Sonar model combines LLM generation with real-time web search,
 * returning grounded responses with source citations. Includes a 15-second
 * timeout via AbortController to prevent hanging requests.
 *
 * @param messages - The conversation messages (system prompt + user query).
 * @param options - Optional model configuration overrides.
 * @param options.model - Perplexity model name (default: "sonar").
 * @param options.maxTokens - Maximum tokens in the response (default: 1500).
 * @param options.temperature - Sampling temperature for response randomness (default: 0.1).
 * @returns An object containing the assistant's text content and an array of citation URLs.
 * @throws {Error} If `PERPLEXITY_API_KEY` is not configured.
 * @throws {Error} If the request times out after 15 seconds.
 * @throws {Error} If the API returns a non-200 status code.
 * @throws {Error} If the response contains no choices.
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
 * Search for current product prices across Indian retailers using Perplexity Sonar.
 *
 * Sends a structured prompt asking for JSON-formatted pricing data including
 * retailer prices, active deals/discounts, a summary, and a product image URL.
 * The response is designed to be parsed into `PriceSnapshot[]` and `DealAlert[]`
 * objects for the Bucket List feature.
 *
 * Targeted retailers include Amazon.in, Flipkart, Croma, Reliance Digital,
 * Myntra, MakeMyTrip, and others relevant to the product category.
 *
 * @param itemName - The product or experience to search for (e.g. "MacBook Pro M3", "Bali trip for 2").
 * @returns An object containing the raw JSON content string and source citation URLs.
 * @throws {Error} Propagated from `perplexitySearch()` on API failures or timeouts.
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
  "summary": "Brief 1-2 sentence summary of the price range and best deal",
  "imageUrl": "Direct URL to a product image (jpg/png/webp) from a retailer or official source. Must be a valid, publicly accessible image URL."
}

Only return the JSON, no other text. Prices must be in INR. The imageUrl should be the primary product/item image from one of the retailer listings or official product page.`,
    },
    {
      role: 'user',
      content: `Find current prices in India for: ${itemName}`,
    },
  ]);
}
