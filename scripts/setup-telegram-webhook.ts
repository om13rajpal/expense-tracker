/**
 * Setup Telegram Webhook
 *
 * Registers the webhook URL with Telegram Bot API.
 * Usage: npx tsx scripts/setup-telegram-webhook.ts
 *
 * Reads from .env:
 *   TELEGRAM_BOT_TOKEN - Bot token from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET - Random string for request verification
 *   NEXT_PUBLIC_APP_URL or APP_URL - Your deployed app URL
 */
import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN in environment');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('Missing TELEGRAM_WEBHOOK_SECRET in environment');
  process.exit(1);
}

if (!APP_URL) {
  console.error('Missing NEXT_PUBLIC_APP_URL or APP_URL in environment');
  process.exit(1);
}

const webhookUrl = `${APP_URL}/api/telegram/webhook`;

async function main() {
  console.log(`Setting webhook to: ${webhookUrl}`);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await res.json();

  if (data.ok) {
    console.log('Webhook set successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.error('Failed to set webhook:');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Verify by getting webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log('\nWebhook info:', JSON.stringify(info.result, null, 2));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
