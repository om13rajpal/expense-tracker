/**
 * Receipt photo processing via OpenRouter (Claude Sonnet vision).
 * Downloads the Telegram file and sends it for OCR/extraction.
 */

export interface ReceiptData {
  merchant: string;
  amount: number;
  items: string[];
  date?: string;
  category?: string;
  confidence: number;
}

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
