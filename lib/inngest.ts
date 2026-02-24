/**
 * Inngest client configuration and event type definitions.
 *
 * Inngest is used as a serverless event-driven workflow engine for:
 * - Post-sync AI insight generation
 * - Scheduled daily Telegram summaries
 * - Gamification event processing (badge unlocks, level-ups)
 * - Price update notifications
 *
 * All events are strongly typed via the `Events` record, ensuring
 * type safety across event producers and consumer functions.
 *
 * @module lib/inngest
 */

import { Inngest, EventSchemas } from 'inngest';
import type { AiInsightType } from './ai-types';

/**
 * Strongly-typed event definitions for all Inngest workflows.
 * Each key is the event name, and the value defines the `data` payload shape.
 */
type Events = {
  'finance/sync.completed': {
    data: {
      userIds: string[];
      transactionCount: number;
    };
  };
  'finance/prices.updated': {
    data: {
      stocksUpdated: number;
      fundsUpdated: number;
    };
  };
  'finance/insights.generate': {
    data: {
      userId: string;
      types: AiInsightType[];
      trigger: 'scheduled' | 'post-sync' | 'post-prices' | 'manual';
    };
  };
  'finance/gamification.badge-unlocked': {
    data: {
      userId: string;
      badgeId: string;
      badgeName: string;
    };
  };
  'finance/gamification.level-up': {
    data: {
      userId: string;
      level: number;
      levelName: string;
    };
  };
  'finance/telegram.daily-summary': {
    data: {
      userId: string;
    };
  };
};

/** Singleton Inngest client instance for the Finova application. */
export const inngest = new Inngest({
  id: 'finova',
  schemas: new EventSchemas().fromRecord<Events>(),
});
