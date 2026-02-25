/**
 * Email notification utilities for the Finova bill-splitting feature.
 *
 * Uses the Resend SDK to send transactional emails for split expense
 * notifications and payment reminders. All emails use inline CSS with
 * the Finova brand color (#10b981 / emerald-500).
 *
 * Requires `RESEND_API_KEY` environment variable to be set.
 *
 * @module lib/email
 */

import { Resend } from 'resend'

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(key)
}

/** Sender address used for all Finova split notification emails. */
const FROM_ADDRESS = 'Finova <onboarding@resend.dev>'

/**
 * Send an email notification when a new split expense is created.
 *
 * Notifies the recipient about their share in the expense, optionally
 * including a UPI ID for convenient payment.
 *
 * @param params.to - Recipient email address.
 * @param params.fromName - Display name of the person who created the split.
 * @param params.description - Description of the shared expense.
 * @param params.amount - The recipient's share amount in INR.
 * @param params.totalAmount - Total expense amount in INR.
 * @param params.upiId - Optional UPI ID for payment convenience.
 * @returns An object with `success: true` on delivery, or `success: false` with an error message.
 */
export async function sendSplitNotification(params: {
  to: string
  fromName: string
  description: string
  amount: number
  totalAmount: number
  upiId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, fromName, description, amount, totalAmount, upiId } = params

    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

    const formattedTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(totalAmount)

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Finova</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Split Expense Notification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#111827;font-size:15px;line-height:1.6;">
                <strong>${fromName}</strong> split <strong>${description}</strong> with you.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your Share</p>
                    <p style="margin:0;color:#059669;font-size:28px;font-weight:700;">${formattedAmount}</p>
                    <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">out of ${formattedTotal} total</p>
                  </td>
                </tr>
              </table>
              ${upiId ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Pay via UPI</p>
                    <p style="margin:0;color:#111827;font-size:14px;font-weight:600;font-family:monospace;">${upiId}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                You can settle this amount directly with ${fromName}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">Sent via Finova</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `${fromName} split "${description}" with you - ${formattedAmount}`,
      html,
    })

    if (error) {
      console.error('Resend send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('sendSplitNotification error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send an email reminder about outstanding balances for multiple expenses.
 *
 * Lists all outstanding expenses in a clean table format, with the total
 * owed amount prominently displayed. Used when the user manually triggers
 * a reminder for a specific contact.
 *
 * @param params.to - Recipient email address.
 * @param params.fromName - Display name of the person sending the reminder.
 * @param params.totalOwed - Total outstanding amount owed across all expenses.
 * @param params.expenses - Array of individual outstanding expenses with description, amount, and date.
 * @returns An object with `success: true` on delivery, or `success: false` with an error message.
 */
export async function sendSplitReminder(params: {
  to: string
  fromName: string
  totalOwed: number
  expenses: Array<{ description: string; amount: number; date: string }>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, fromName, totalOwed, expenses } = params

    const formattedTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(totalOwed)

    const expenseRows = expenses
      .map(
        (exp) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px;">${exp.description}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px;text-align:right;font-weight:600;white-space:nowrap;">
            ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(exp.amount)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;text-align:right;white-space:nowrap;">
            ${new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </td>
        </tr>`
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Finova</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Payment Reminder</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#111827;font-size:15px;line-height:1.6;">
                Hi! <strong>${fromName}</strong> is sending you a friendly reminder about outstanding expenses.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Total Outstanding</p>
                    <p style="margin:0;color:#dc2626;font-size:28px;font-weight:700;">${formattedTotal}</p>
                  </td>
                </tr>
              </table>
              ${expenses.length > 0 ? `
              <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:600;">Expense Breakdown</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#f9fafb;">
                  <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Expense</th>
                  <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Amount</th>
                  <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Date</th>
                </tr>
                ${expenseRows}
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">Sent via Finova</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Reminder: You owe ${formattedTotal} to ${fromName}`,
      html,
    })

    if (error) {
      console.error('Resend send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('sendSplitReminder error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
