export type AiInsightType = 'spending_analysis' | 'monthly_budget' | 'weekly_budget' | 'investment_insights' | 'tax_optimization';

/* ─── Structured insight sections ─── */

export type InsightSectionType = 'summary' | 'list' | 'numbered_list' | 'highlight';

export interface InsightSection {
  id: string;
  title: string;
  type: InsightSectionType;
  /** For 'summary' — a paragraph of text */
  text?: string;
  /** For 'list' / 'numbered_list' */
  items?: string[];
  /** For 'highlight' — a single key sentence */
  highlight?: string;
  /** Optional severity for visual styling */
  severity?: 'positive' | 'warning' | 'critical' | 'neutral';
}

export interface AiAnalysisDoc {
  _id?: string;
  userId: string;
  type: AiInsightType;
  /** Legacy markdown (kept for backward compat) */
  content: string;
  /** Structured sections — preferred for rendering */
  sections?: InsightSection[];
  generatedAt: string;
  dataPoints: number;
  searchContext?: { queries: string[]; snippetCount: number };
  createdAt: string;
}

export interface PipelineContext {
  userId: string;
  financialContext: string;
  investmentContext: string;
  nwiContext: string;
  healthContext: string;
  goalsContext: string;
  currentMonthContext: string;
  transactionCount: number;
  marketContext: string;
  stockSymbols: string[];
  mutualFundNames: string[];
  taxContext?: string;
}

export interface PipelineOptions {
  force?: boolean;
  includeSearch?: boolean;
}

export interface PipelineResult {
  content: string;
  sections?: InsightSection[];
  generatedAt: string;
  dataPoints: number;
  fromCache: boolean;
  stale: boolean;
  searchContext?: { queries: string[]; snippetCount: number };
}
