/**
 * Receipt photo processing via OpenRouter (Claude Sonnet vision).
 *
 * Downloads a receipt image from a Telegram file URL, converts it to
 * base64, and sends it to the Claude Sonnet vision model for OCR
 * extraction. Returns structured receipt data including merchant name,
 * total amount, line items, date, and an auto-assigned expense category.
 *
 * @module lib/telegram-receipt
 */

/** Structured data extracted from a receipt image via AI vision. */
export interface ReceiptData {
  /** Store or restaurant name. */
  merchant: string;
  /** Total amount in INR. */
  amount: number;
  /** Individual line items on the receipt. */
  items: string[];
  /** Date from the receipt (YYYY-MM-DD), if visible. */
  date?: string;
  /** Auto-assigned expense category (e.g. "Food & Dining", "Shopping"). */
  category?: string;
  /** Extraction confidence: 0.85 if amount detected, 0.4 if partial, 0.2 on parse failure. */
  confidence: number;
}

/**
 * Process a receipt image by downloading it and sending to Claude Sonnet for OCR.
 *
 * @param fileUrl - Public URL of the receipt image (from Telegram file API).
 * @returns Structured ReceiptData with extracted merchant, amount, items, date, and category.
 * @throws Error if OPENROUTER_API_KEY is not configured.
 */
export async function processReceiptImage(fileUrl: string): Promise<ReceiptData> {
  // Download the image as base64
  const imgRes = await fetch(fileUrl);
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: `Analyze this receipt image and extract the following in JSON format:
{
  "merchant": "store/restaurant name",
  "amount": total amount as a number (in INR if possible),
  "items": ["item1", "item2"],
  "date": "YYYY-MM-DD if visible, otherwise null",
  "category": one of "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Healthcare", "Education", "Fitness", "Travel", "Others"
}

Return ONLY the JSON, no explanation.`,
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Parse the JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      merchant: 'Unknown',
      amount: 0,
      items: [],
      confidence: 0.2,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      merchant: parsed.merchant || 'Unknown',
      amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      date: parsed.date || undefined,
      category: parsed.category || undefined,
      confidence: parsed.amount ? 0.85 : 0.4,
    };
  } catch {
    return {
      merchant: 'Unknown',
      amount: 0,
      items: [],
      confidence: 0.2,
    };
  }
}
