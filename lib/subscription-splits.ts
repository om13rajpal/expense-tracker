import { getMongoDb } from './mongodb'
import { ObjectId } from 'mongodb'
import { sendSubscriptionShareNotification, sendSubscriptionRenewalReminder } from './email'
import { sendMessage } from './telegram'

export interface SharedMember {
  name: string
  email?: string
  phone?: string
  telegramChatId?: number
  share: number
  status: 'pending' | 'paid' | 'overdue'
  lastPaidDate?: string
}

/**
 * Create a splits group for a shared subscription.
 * Inserts a document into splits_groups and updates the subscription with the splitGroupId.
 */
export async function createSplitsGroupForSubscription(
  userId: string,
  subscriptionId: string,
  subscriptionName: string,
  members: SharedMember[]
): Promise<string> {
  const db = await getMongoDb()
  const now = new Date().toISOString()

  const groupDoc = {
    userId,
    name: `${subscriptionName} - Shared`,
    subscriptionId,
    members: members.map((m) => ({
      name: m.name,
      email: m.email || '',
      phone: m.phone || '',
      telegramChatId: m.telegramChatId || null,
      share: m.share,
      status: m.status || 'pending',
      lastPaidDate: m.lastPaidDate || null,
    })),
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.collection('splits_groups').insertOne(groupDoc)
  const groupId = result.insertedId.toString()

  // Link the group back to the subscription
  await db.collection('subscriptions').updateOne(
    { _id: new ObjectId(subscriptionId), userId },
    { $set: { splitGroupId: groupId, updatedAt: now } }
  )

  return groupId
}

/**
 * Create a split expense record for the current billing cycle of a shared subscription.
 * Called when a subscription renewal happens (manually or via auto-detect).
 */
export async function createRecurringSplitExpense(
  userId: string,
  subscription: {
    _id: string
    name: string
    amount: number
    sharedWith: SharedMember[]
    userShare: number
    paidByUser: boolean
  }
): Promise<string> {
  const db = await getMongoDb()
  const now = new Date().toISOString()

  // Build splits array: user + all shared members
  const splits: { person: string; amount: number }[] = []

  if (subscription.paidByUser) {
    splits.push({ person: 'You', amount: subscription.userShare })
  }

  for (const member of subscription.sharedWith) {
    splits.push({ person: member.name, amount: member.share })
  }

  const paidBy = subscription.paidByUser ? 'You' : subscription.sharedWith[0]?.name || 'Unknown'

  const doc = {
    userId,
    groupId: null,
    description: `${subscription.name} - Subscription`,
    amount: subscription.amount,
    paidBy,
    splitType: 'exact',
    splits,
    date: now,
    category: 'Subscription',
    source: 'subscription',
    subscriptionId: subscription._id,
    createdAt: now,
  }

  const result = await db.collection('splits_expenses').insertOne(doc)
  return result.insertedId.toString()
}

/**
 * Notify all members of a shared subscription via email and/or Telegram.
 */
export async function notifySubscriptionMembers(
  userId: string,
  subscription: {
    name: string
    amount: number
    frequency: string
    nextExpected: string
    sharedWith: SharedMember[]
  },
  notificationType: 'new_share' | 'renewal_reminder' | 'payment_due'
): Promise<{ emailsSent: number; telegramSent: number }> {
  const db = await getMongoDb()
  let emailsSent = 0
  let telegramSent = 0

  // Get the user's name for the "from" field
  const userDoc = await db.collection('users').findOne({ userId })
  const fromName = userDoc?.name || 'Your friend'

  for (const member of subscription.sharedWith) {
    // Email notification
    if (member.email) {
      try {
        let result: { success: boolean }
        if (notificationType === 'new_share') {
          result = await sendSubscriptionShareNotification({
            to: member.email,
            fromName,
            subscriptionName: subscription.name,
            shareAmount: member.share,
            totalAmount: subscription.amount,
            frequency: subscription.frequency,
            nextExpected: subscription.nextExpected,
          })
        } else {
          result = await sendSubscriptionRenewalReminder({
            to: member.email,
            fromName,
            subscriptionName: subscription.name,
            shareAmount: member.share,
            renewalDate: subscription.nextExpected,
          })
        }
        if (result.success) emailsSent++
      } catch (err) {
        console.error(`Failed to email ${member.email}:`, err)
      }
    }

    // Telegram notification
    if (member.telegramChatId) {
      try {
        const formattedShare = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(member.share)

        let text = ''
        if (notificationType === 'new_share') {
          text = `*Shared Subscription*\n\n${fromName} added you to *${subscription.name}*.\n\nYour share: ${formattedShare}\nFrequency: ${subscription.frequency}\nNext due: ${subscription.nextExpected}`
        } else if (notificationType === 'renewal_reminder') {
          text = `*Renewal Reminder*\n\n*${subscription.name}* is renewing on ${subscription.nextExpected}.\n\nYour share: ${formattedShare}\nPlease settle with ${fromName}.`
        } else {
          text = `*Payment Due*\n\n*${subscription.name}* payment is due.\n\nYour share: ${formattedShare}\nPlease pay ${fromName}.`
        }

        const res = await sendMessage(member.telegramChatId, text)
        if (res.ok) telegramSent++
      } catch (err) {
        console.error(`Failed to telegram ${member.telegramChatId}:`, err)
      }
    }
  }

  return { emailsSent, telegramSent }
}

/**
 * Sync payment status from splits expenses back to subscription members.
 * Checks splits_expenses for payments linked to this subscription and updates member statuses.
 */
export async function syncSubscriptionSplitStatus(
  userId: string,
  subscriptionId: string
): Promise<void> {
  const db = await getMongoDb()

  const subscription = await db.collection('subscriptions').findOne({
    _id: new ObjectId(subscriptionId),
    userId,
  })

  if (!subscription || !subscription.isShared || !Array.isArray(subscription.sharedWith)) {
    return
  }

  // Get all split expenses linked to this subscription
  const expenses = await db
    .collection('splits_expenses')
    .find({ userId, subscriptionId, source: 'subscription' })
    .sort({ date: -1 })
    .limit(1)
    .toArray()

  if (expenses.length === 0) return

  const latestExpense = expenses[0]
  const paidMembers = new Set<string>()

  // Check if members have settled (simplified: look at splits array for settled status)
  if (Array.isArray(latestExpense.splits)) {
    for (const split of latestExpense.splits) {
      if (split.settled) {
        paidMembers.add(split.person)
      }
    }
  }

  // Update each member's status on the subscription
  const updatedMembers = subscription.sharedWith.map((member: SharedMember) => {
    if (paidMembers.has(member.name)) {
      return { ...member, status: 'paid', lastPaidDate: new Date().toISOString().split('T')[0] }
    }
    // Check if the subscription is overdue
    const nextExpected = new Date(subscription.nextExpected)
    const now = new Date()
    if (nextExpected < now && member.status !== 'paid') {
      return { ...member, status: 'overdue' }
    }
    return member
  })

  await db.collection('subscriptions').updateOne(
    { _id: new ObjectId(subscriptionId), userId },
    { $set: { sharedWith: updatedMembers, updatedAt: new Date().toISOString() } }
  )
}
