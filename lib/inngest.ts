import { Inngest, EventSchemas } from 'inngest';
import type { AiInsightType } from './ai-types';

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

export const inngest = new Inngest({
  id: 'finance-tracker',
  schemas: new EventSchemas().fromRecord<Events>(),
});
