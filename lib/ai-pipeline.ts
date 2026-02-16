import { getMongoDb } from './mongodb';
import { calculateAnalytics, separateOneTimeExpenses } from './analytics';
import { calculateAccountSummary } from './balance-utils';
import { calculateMonthlyMetrics, getCurrentMonth } from './monthly-utils';
import { chatCompletion, buildFinancialContext, buildInvestmentContext } from './openrouter';
import { getSystemPrompt, buildUserMessage } from './ai-prompts';
import { searchMarketContext } from './ai-search';
import { calculateTax, getDefaultTaxConfig } from '@/lib/tax';
import type { TaxConfig } from '@/lib/tax';
import type { Transaction, TransactionCategory, TransactionType, PaymentMethod, TransactionStatus } from './types';
import type { AiInsightType, AiAnalysisDoc, InsightSection, PipelineContext, PipelineOptions, PipelineResult } from './ai-types';
import type { Document } from 'mongodb';

const STALENESS_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ANALYSES_PER_TYPE = 5;

function toTransaction(doc: Record<string, unknown>): Transaction {
  return {
    id: (doc.txnId as string) || (doc._id as { toString(): string })?.toString() || '',
    date: new Date(doc.date as string),
    description: (doc.description as string) || '',
    merchant: (doc.merchant as string) || '',
    category: (doc.category as TransactionCategory) || ('Uncategorized' as TransactionCategory),
    amount: (doc.amount as number) || 0,
    type: (doc.type as TransactionType) || ('expense' as TransactionType),
    paymentMethod: (doc.paymentMethod as PaymentMethod) || ('Other' as PaymentMethod),
    account: (doc.account as string) || '',
    status: (doc.status as TransactionStatus) || ('completed' as TransactionStatus),
    tags: (doc.tags as string[]) || [],
    recurring: (doc.recurring as boolean) || false,
    balance: doc.balance as number | undefined,
  };
}

function isStale(doc: AiAnalysisDoc): boolean {
  const generatedAt = new Date(doc.generatedAt).getTime();
  return Date.now() - generatedAt > STALENESS_MS;
}

export async function getCachedAnalysis(
  userId: string,
  type: AiInsightType
): Promise<(AiAnalysisDoc & { stale: boolean }) | null> {
  const db = await getMongoDb();
  const doc = await db
    .collection('ai_analyses')
    .findOne(
      { userId, type },
      { sort: { generatedAt: -1 } }
    );

  if (!doc) return null;

  const analysis: AiAnalysisDoc = {
    _id: doc._id.toString(),
    userId: doc.userId as string,
    type: doc.type as AiInsightType,
    content: doc.content as string,
    sections: (doc.sections as InsightSection[] | undefined) || undefined,
    generatedAt: doc.generatedAt as string,
    dataPoints: doc.dataPoints as number,
    searchContext: doc.searchContext as AiAnalysisDoc['searchContext'],
    createdAt: doc.createdAt as string,
  };

  return { ...analysis, stale: isStale(analysis) };
}

// Stage 1: Collect user data from MongoDB
async function collectUserData(
  userId: string,
  type: AiInsightType
): Promise<PipelineContext> {
  const db = await getMongoDb();

  // Always fetch transactions
  const txnDocs = await db
    .collection('transactions')
    .find({ userId })
    .sort({ date: -1 })
    .toArray();

  const transactions = txnDocs.map((d) => toTransaction(d as Record<string, unknown>));

  // Calculate analytics from transactions
  let financialContext = '';
  let currentMonthContext = '';
  let healthContext = '';

  if (transactions.length > 0) {
    const analytics = calculateAnalytics(transactions);
    const accountSummary = calculateAccountSummary(transactions);
    const separated = separateOneTimeExpenses(transactions);

    financialContext = buildFinancialContext({
      totalIncome: analytics.totalIncome,
      totalExpenses: analytics.totalExpenses,
      savingsRate: analytics.savingsRate,
      topCategories: analytics.categoryBreakdown.map((c) => ({
        category: c.category,
        amount: c.amount,
        percentage: c.percentage,
      })),
      monthlyTrends: analytics.monthlyTrends.map((m) => ({
        month: m.monthName,
        income: m.income,
        expenses: m.expenses,
        savings: m.savings,
      })),
      dailyAverage: analytics.dailyAverageSpend,
      recurringExpenses: analytics.recurringExpenses,
      oneTimeExpenses: separated.oneTime.map((t) => ({
        description: t.description || t.merchant,
        amount: t.amount,
      })),
      accountBalance: accountSummary.currentBalance,
      openingBalance: accountSummary.openingBalance,
    });

    // Current month context for budget types
    if (type === 'monthly_budget' || type === 'weekly_budget') {
      const { year, month } = getCurrentMonth();
      const metrics = calculateMonthlyMetrics(transactions, year, month);
      currentMonthContext = `## Current Month (${metrics.monthLabel})
- Opening Balance: Rs.${metrics.openingBalance.toLocaleString('en-IN')}
- Income so far: Rs.${metrics.totalIncome.toLocaleString('en-IN')}
- Expenses so far: Rs.${metrics.totalExpenses.toLocaleString('en-IN')}
- Days elapsed: ${metrics.daysInPeriod}
- Partial month: ${metrics.isPartialMonth ? 'Yes' : 'No'}`;
    }

    // Health context
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0';
    healthContext = `Financial Health Summary:
- Savings Rate: ${savingsRate}%
- Total Income: Rs.${totalIncome.toLocaleString('en-IN')}
- Total Expenses: Rs.${totalExpenses.toLocaleString('en-IN')}`;
  }

  // Fetch NWI config
  const nwiConfigDoc = await db.collection('nwi_config').findOne({ userId });
  let nwiContext = '';
  if (nwiConfigDoc) {
    const lines = [
      `Needs/Wants/Investments/Savings Split Configuration:`,
      `- Needs (${nwiConfigDoc.needs.percentage}%): ${nwiConfigDoc.needs.categories.join(', ')}`,
      `- Wants (${nwiConfigDoc.wants.percentage}%): ${nwiConfigDoc.wants.categories.join(', ')}`,
      `- Investments (${nwiConfigDoc.investments.percentage}%): ${nwiConfigDoc.investments.categories.join(', ')}`,
    ];
    if (nwiConfigDoc.savings) {
      lines.push(`- Savings (${nwiConfigDoc.savings.percentage}%): ${nwiConfigDoc.savings.categories.join(', ')}`);
    }
    nwiContext = lines.join('\n');
  }

  // Fetch savings goals
  const goalsDocs = await db.collection('savings_goals').find({ userId }).toArray();
  let goalsContext = '';
  if (goalsDocs.length > 0) {
    const goalsList = goalsDocs.map((g) =>
      `  - ${g.name}: Rs.${g.currentAmount?.toLocaleString('en-IN') || 0} / Rs.${g.targetAmount?.toLocaleString('en-IN')} (target: ${g.targetDate})`
    ).join('\n');
    goalsContext = `Savings Goals:\n${goalsList}`;
  }

  // Fetch investment data
  const [stocks, mutualFunds, sips] = await Promise.all([
    db.collection('stocks').find({ userId }).toArray(),
    db.collection('mutual_funds').find({ userId }).toArray(),
    db.collection('sips').find({ userId }).toArray(),
  ]);

  let investmentContext = '';
  const stockSymbols: string[] = [];
  const mutualFundNames: string[] = [];

  if (stocks.length > 0 || mutualFunds.length > 0 || sips.length > 0) {
    const stockInvested = stocks.reduce((a: number, s: Document) => a + ((Number(s.shares) || 0) * (Number(s.averageCost) || 0)), 0);
    const stockCurrent = stocks.reduce((a: number, s: Document) => {
      const price = Number(s.currentPrice) || Number(s.averageCost) || 0;
      return a + ((Number(s.shares) || 0) * price);
    }, 0);
    const mfInvested = mutualFunds.reduce((a: number, m: Document) => a + (Number(m.investedValue) || 0), 0);
    const mfCurrent = mutualFunds.reduce((a: number, m: Document) => a + (Number(m.currentValue) || 0), 0);

    investmentContext = buildInvestmentContext({
      sips: sips.map((s: Document) => ({
        name: String(s.name || ''),
        monthly: Number(s.monthlyAmount) || 0,
        provider: String(s.provider || 'Unknown'),
        status: String(s.status || 'active'),
      })),
      stocks: stocks.map((s: Document) => ({
        symbol: String(s.symbol || ''),
        shares: Number(s.shares) || 0,
        avgCost: Number(s.averageCost) || 0,
        currentPrice: s.currentPrice ? Number(s.currentPrice) : undefined,
      })),
      mutualFunds: mutualFunds.map((m: Document) => ({
        name: String(m.schemeName || m.name || ''),
        invested: Number(m.investedValue) || 0,
        current: Number(m.currentValue) || 0,
        returns: Number(m.returns) || 0,
      })),
      totalInvested: stockInvested + mfInvested,
      totalCurrentValue: stockCurrent + mfCurrent,
    });

    for (const s of stocks) {
      if (s.symbol) stockSymbols.push(String(s.symbol));
    }
    for (const m of mutualFunds) {
      const name = String(m.schemeName || m.name || '');
      if (name) mutualFundNames.push(name);
    }
  }

  // Fetch tax config for tax_optimization insights
  let taxContext = '';
  if (type === 'tax_optimization') {
    const taxConfigDoc = await db.collection('tax_config').findOne({ userId });
    const taxConfig: TaxConfig = taxConfigDoc
      ? {
          grossAnnualIncome: Number(taxConfigDoc.grossAnnualIncome) || 0,
          otherIncome: {
            fdInterest: Number(taxConfigDoc.otherIncome?.fdInterest) || 0,
            capitalGainsSTCG: Number(taxConfigDoc.otherIncome?.capitalGainsSTCG) || 0,
            capitalGainsLTCG: Number(taxConfigDoc.otherIncome?.capitalGainsLTCG) || 0,
            rentalIncome: Number(taxConfigDoc.otherIncome?.rentalIncome) || 0,
            otherSources: Number(taxConfigDoc.otherIncome?.otherSources) || 0,
          },
          deductions80C: {
            ppf: Number(taxConfigDoc.deductions80C?.ppf) || 0,
            elss: Number(taxConfigDoc.deductions80C?.elss) || 0,
            lic: Number(taxConfigDoc.deductions80C?.lic) || 0,
            epf: Number(taxConfigDoc.deductions80C?.epf) || 0,
            tuitionFees: Number(taxConfigDoc.deductions80C?.tuitionFees) || 0,
            homeLoanPrincipal: Number(taxConfigDoc.deductions80C?.homeLoanPrincipal) || 0,
            nsc: Number(taxConfigDoc.deductions80C?.nsc) || 0,
            others: Number(taxConfigDoc.deductions80C?.others) || 0,
          },
          deductions80D: {
            selfHealthInsurance: Number(taxConfigDoc.deductions80D?.selfHealthInsurance) || 0,
            parentsHealthInsurance: Number(taxConfigDoc.deductions80D?.parentsHealthInsurance) || 0,
            parentsAreSenior: Boolean(taxConfigDoc.deductions80D?.parentsAreSenior),
          },
          section80TTA: Number(taxConfigDoc.section80TTA) || 0,
          section24HomeLoan: Number(taxConfigDoc.section24HomeLoan) || 0,
          section80E: Number(taxConfigDoc.section80E) || 0,
          section80CCD1B: Number(taxConfigDoc.section80CCD1B) || 0,
          hra: {
            basicSalary: Number(taxConfigDoc.hra?.basicSalary) || 0,
            hraReceived: Number(taxConfigDoc.hra?.hraReceived) || 0,
            rentPaid: Number(taxConfigDoc.hra?.rentPaid) || 0,
            isMetroCity: Boolean(taxConfigDoc.hra?.isMetroCity),
          },
          preferredRegime: taxConfigDoc.preferredRegime || 'auto',
        }
      : getDefaultTaxConfig();

    const taxResult = calculateTax(taxConfig);
    const fmt = (n: number) => `Rs.${n.toLocaleString('en-IN')}`;

    const total80C =
      taxConfig.deductions80C.ppf +
      taxConfig.deductions80C.elss +
      taxConfig.deductions80C.lic +
      taxConfig.deductions80C.epf +
      taxConfig.deductions80C.tuitionFees +
      taxConfig.deductions80C.homeLoanPrincipal +
      taxConfig.deductions80C.nsc +
      taxConfig.deductions80C.others;

    const total80D = taxResult.old.total80D;

    const taxLines: string[] = [
      `## Tax Analysis (FY 2025-26)`,
      ``,
      `### Income`,
      `- Gross Annual Income: ${fmt(taxConfig.grossAnnualIncome)}`,
    ];

    const otherTotal =
      taxConfig.otherIncome.fdInterest +
      taxConfig.otherIncome.capitalGainsSTCG +
      taxConfig.otherIncome.capitalGainsLTCG +
      taxConfig.otherIncome.rentalIncome +
      taxConfig.otherIncome.otherSources;
    if (otherTotal > 0) {
      taxLines.push(`- Other Income: ${fmt(otherTotal)}`);
    }

    taxLines.push(
      ``,
      `### Deductions (Old Regime)`,
      `- 80C (${fmt(total80C)} of Rs.1,50,000 limit):`,
    );
    if (taxConfig.deductions80C.ppf > 0) taxLines.push(`  - PPF: ${fmt(taxConfig.deductions80C.ppf)}`);
    if (taxConfig.deductions80C.elss > 0) taxLines.push(`  - ELSS: ${fmt(taxConfig.deductions80C.elss)}`);
    if (taxConfig.deductions80C.lic > 0) taxLines.push(`  - LIC: ${fmt(taxConfig.deductions80C.lic)}`);
    if (taxConfig.deductions80C.epf > 0) taxLines.push(`  - EPF: ${fmt(taxConfig.deductions80C.epf)}`);
    if (taxConfig.deductions80C.tuitionFees > 0) taxLines.push(`  - Tuition Fees: ${fmt(taxConfig.deductions80C.tuitionFees)}`);
    if (taxConfig.deductions80C.homeLoanPrincipal > 0) taxLines.push(`  - Home Loan Principal: ${fmt(taxConfig.deductions80C.homeLoanPrincipal)}`);
    if (taxConfig.deductions80C.nsc > 0) taxLines.push(`  - NSC: ${fmt(taxConfig.deductions80C.nsc)}`);
    if (taxConfig.deductions80C.others > 0) taxLines.push(`  - Others: ${fmt(taxConfig.deductions80C.others)}`);

    taxLines.push(
      `- 80D (Health Insurance): ${fmt(total80D)}`,
      `  - Self: ${fmt(taxConfig.deductions80D.selfHealthInsurance)}`,
      `  - Parents: ${fmt(taxConfig.deductions80D.parentsHealthInsurance)}${taxConfig.deductions80D.parentsAreSenior ? ' (Senior Citizen)' : ''}`,
    );
    if (taxConfig.section80TTA > 0) taxLines.push(`- 80TTA (Savings Interest): ${fmt(taxConfig.section80TTA)}`);
    if (taxConfig.section80E > 0) taxLines.push(`- 80E (Education Loan): ${fmt(taxConfig.section80E)}`);
    if (taxConfig.section80CCD1B > 0) taxLines.push(`- 80CCD(1B) (NPS): ${fmt(taxConfig.section80CCD1B)}`);
    if (taxConfig.section24HomeLoan > 0) taxLines.push(`- Sec 24 (Home Loan Interest): ${fmt(taxConfig.section24HomeLoan)}`);

    if (taxConfig.hra.rentPaid > 0) {
      taxLines.push(
        ``,
        `### HRA Details`,
        `- Basic Salary: ${fmt(taxConfig.hra.basicSalary)}`,
        `- HRA Received: ${fmt(taxConfig.hra.hraReceived)}`,
        `- Rent Paid: ${fmt(taxConfig.hra.rentPaid)}`,
        `- Metro City: ${taxConfig.hra.isMetroCity ? 'Yes' : 'No'}`,
        `- HRA Exemption: ${fmt(taxResult.old.hraExemption)}`,
      );
    }

    taxLines.push(
      ``,
      `### Regime Comparison`,
      `- Old Regime Tax: ${fmt(taxResult.old.totalTax)} (Effective Rate: ${taxResult.old.effectiveRate.toFixed(1)}%)`,
      `- New Regime Tax: ${fmt(taxResult.new.totalTax)} (Effective Rate: ${taxResult.new.effectiveRate.toFixed(1)}%)`,
      `- Recommended Regime: ${taxResult.recommended === 'old' ? 'Old' : 'New'} Regime`,
      `- Tax Saved by Choosing Better Regime: ${fmt(taxResult.savings)}`,
      ``,
      `### Utilization Summary`,
      `- 80C: ${fmt(Math.min(total80C, 150_000))} of Rs.1,50,000 used (${fmt(Math.max(0, 150_000 - total80C))} remaining)`,
      `- 80D: ${fmt(total80D)} used`,
    );

    taxContext = taxLines.join('\n');
  }

  return {
    userId,
    financialContext,
    investmentContext,
    nwiContext,
    healthContext,
    goalsContext,
    currentMonthContext,
    transactionCount: transactions.length,
    marketContext: '', // filled in Stage 2
    stockSymbols,
    mutualFundNames,
    taxContext,
  };
}

/**
 * Parse AI response as structured JSON sections.
 * Falls back gracefully if the response isn't valid JSON.
 */
function parseAiResponse(raw: string): { sections?: InsightSection[]; content: string } {
  // Strip code fences if AI wrapped JSON in ```json ... ```
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.sections && Array.isArray(parsed.sections)) {
      // Validate basic structure
      const sections: InsightSection[] = parsed.sections
        .filter((s: Record<string, unknown>) => s.id && s.title && s.type)
        .map((s: Record<string, unknown>) => ({
          id: String(s.id),
          title: String(s.title),
          type: String(s.type) as InsightSection['type'],
          text: s.text ? String(s.text) : undefined,
          items: Array.isArray(s.items) ? s.items.map(String) : undefined,
          highlight: s.highlight ? String(s.highlight) : undefined,
          severity: ['positive', 'warning', 'critical', 'neutral'].includes(String(s.severity || ''))
            ? (String(s.severity) as InsightSection['severity'])
            : undefined,
        }));

      // Build a markdown fallback from sections for backward compat
      const markdownLines: string[] = [];
      for (const sec of sections) {
        markdownLines.push(`## ${sec.title}`);
        if (sec.text) markdownLines.push(sec.text);
        if (sec.items) {
          for (let i = 0; i < sec.items.length; i++) {
            markdownLines.push(sec.type === 'numbered_list' ? `${i + 1}. ${sec.items[i]}` : `- ${sec.items[i]}`);
          }
        }
        if (sec.highlight) markdownLines.push(`**${sec.highlight}**`);
        markdownLines.push('');
      }

      return { sections, content: markdownLines.join('\n') };
    }
  } catch {
    // Not valid JSON — treat as plain markdown
  }

  return { content: raw };
}

// Stage 5: Persist and prune
async function persistAnalysis(
  userId: string,
  type: AiInsightType,
  content: string,
  dataPoints: number,
  sections?: InsightSection[],
  searchContext?: { queries: string[]; snippetCount: number }
): Promise<void> {
  const db = await getMongoDb();
  const now = new Date().toISOString();

  await db.collection('ai_analyses').insertOne({
    userId,
    type,
    content,
    sections: sections || null,
    generatedAt: now,
    dataPoints,
    searchContext: searchContext || null,
    createdAt: now,
  });

  // Prune: keep only last MAX_ANALYSES_PER_TYPE per type per user
  const allDocs = await db
    .collection('ai_analyses')
    .find({ userId, type })
    .sort({ generatedAt: -1 })
    .toArray();

  if (allDocs.length > MAX_ANALYSES_PER_TYPE) {
    const toDelete = allDocs.slice(MAX_ANALYSES_PER_TYPE).map((d) => d._id);
    await db.collection('ai_analyses').deleteMany({ _id: { $in: toDelete } });
  }
}

export async function runAiPipeline(
  userId: string,
  type: AiInsightType,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { force = false, includeSearch = true } = options;

  // Check cache first (unless force regenerate)
  if (!force) {
    const cached = await getCachedAnalysis(userId, type);
    if (cached && !cached.stale) {
      return {
        content: cached.content,
        sections: cached.sections,
        generatedAt: cached.generatedAt,
        dataPoints: cached.dataPoints,
        fromCache: true,
        stale: false,
        searchContext: cached.searchContext,
      };
    }
  }

  // Stage 1: Collect
  const ctx = await collectUserData(userId, type);

  if (ctx.transactionCount === 0 && type !== 'investment_insights' && type !== 'tax_optimization') {
    throw new Error('No transaction data available. Please sync first.');
  }

  // Stage 2: Enrich (search) — only for investment_insights
  let searchContext: { queries: string[]; snippetCount: number } | undefined;
  if (type === 'investment_insights' && includeSearch) {
    const searchResult = await searchMarketContext(ctx.stockSymbols, ctx.mutualFundNames);
    if (searchResult.context) {
      ctx.marketContext = searchResult.context;
      searchContext = { queries: searchResult.queries, snippetCount: searchResult.snippetCount };
    }
  }

  // Stage 3: Prompt
  const systemPrompt = getSystemPrompt(type);
  const userMessage = buildUserMessage(type, ctx);

  // Stage 4: Generate
  const rawContent = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 4000 }
  );

  // Parse structured JSON (falls back to markdown if AI didn't return JSON)
  const { sections, content } = parseAiResponse(rawContent);

  // Stage 5: Persist
  await persistAnalysis(userId, type, content, ctx.transactionCount, sections, searchContext);

  return {
    content,
    sections,
    generatedAt: new Date().toISOString(),
    dataPoints: ctx.transactionCount,
    fromCache: false,
    stale: false,
    searchContext,
  };
}
