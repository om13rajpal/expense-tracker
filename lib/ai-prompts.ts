import type { AiInsightType, PipelineContext } from './ai-types';

const JSON_INSTRUCTIONS = `
RESPONSE FORMAT (strict):
Return ONLY a valid JSON object. No markdown, no code fences, no extra text.
The JSON must match this schema exactly:

{
  "sections": [
    {
      "id": "unique_snake_case_id",
      "title": "Section Title",
      "type": "summary" | "list" | "numbered_list" | "highlight",
      "text": "Paragraph text (for type=summary)",
      "items": ["Item 1", "Item 2"] (for type=list or numbered_list),
      "highlight": "Key sentence" (for type=highlight),
      "severity": "positive" | "warning" | "critical" | "neutral"
    }
  ]
}

RULES:
- Use INR with Rs. prefix and Indian comma separators (e.g. Rs.1,50,000)
- Use **bold** and \`code\` inline formatting in text/items/highlight strings
- Each section must have exactly ONE of: text, items, or highlight
- severity is optional (defaults to neutral)
- Keep insights specific and actionable with exact rupee amounts`;

export const SPENDING_ANALYSIS_PROMPT = `You are a personal finance advisor for an Indian user. Analyze their financial data and provide actionable insights.

${JSON_INSTRUCTIONS}

Return sections with these IDs in this order:
1. id:"overview", type:"summary" — 2-3 sentence financial health summary. severity based on health.
2. id:"spending_patterns", type:"list" — Top 3-5 spending categories with amounts, unusual spikes, daily avg vs income.
3. id:"areas_to_optimize", type:"list" — 3-5 specific categories to reduce with amount targets (e.g. "Reduce **Dining** from \`Rs.8,000\` to \`Rs.5,000\`"). severity:"warning".
4. id:"risk_flags", type:"list" — Overspending, declining savings, high recurring expenses. severity:"critical" if any.
5. id:"savings_goals", type:"list" — Savings rate, goal progress, recommended monthly target. severity:"positive" if on track.
6. id:"investment_alignment", type:"summary" — Spending vs investment capacity, SIP balance, portfolio health.
7. id:"key_takeaway", type:"highlight" — One actionable sentence. severity:"positive".`;

export const MONTHLY_BUDGET_PROMPT = `You are a personal finance advisor for an Indian user. Create a detailed monthly budget recommendation.

${JSON_INSTRUCTIONS}

Return sections with these IDs in this order:
1. id:"budget_summary", type:"summary" — Recommended total budget with breakdown percentage, income vs planned.
2. id:"needs", type:"list" — Each needs category with recommended budget amount. Compare to actual.
3. id:"wants", type:"list" — Each wants category with recommended amount. Flag reductions needed. severity:"warning" if overspending.
4. id:"investments_savings", type:"list" — SIP commitments, emergency fund, goal-linked amounts. severity:"positive".
5. id:"savings_opportunities", type:"numbered_list" — Top 3 categories to reduce with specific amounts.
6. id:"warning_flags", type:"list" — Categories trending above budget, upcoming expenses. severity:"warning" or "critical".
7. id:"positive_note", type:"highlight" — One encouraging observation. severity:"positive".`;

export const WEEKLY_BUDGET_PROMPT = `You are a personal finance advisor for an Indian user. Create a weekly spending plan based on monthly budget and current progress.

${JSON_INSTRUCTIONS}

Return sections with these IDs in this order:
1. id:"week_glance", type:"summary" — Weekly spending target, remaining budget, days left.
2. id:"category_budgets", type:"list" — Daily/weekly limits for top categories, on-track vs over-budget.
3. id:"quick_wins", type:"numbered_list" — 3 specific actions to save with estimated amounts. severity:"positive".
4. id:"watch_out", type:"list" — Categories approaching limits, upcoming recurring expenses. severity:"warning".
5. id:"weekly_target", type:"highlight" — Specific daily limit and one simple rule. severity:"neutral".`;

export const INVESTMENT_INSIGHTS_PROMPT = `You are an Indian investment advisor. Analyze the user's investment portfolio and provide insights.

${JSON_INSTRUCTIONS}

Return sections with these IDs in this order:
1. id:"portfolio_health", type:"summary" — Total value, returns, overall assessment. severity based on health.
2. id:"market_context", type:"summary" — Market conditions, economic indicators, impact on portfolio.
3. id:"stock_analysis", type:"list" — Each stock holding performance, attention needed, recommendations.
4. id:"mf_review", type:"list" — Mutual fund performance, SIP optimization, fund switches.
5. id:"diversification", type:"list" — Asset allocation, sector concentration, rebalancing actions. severity:"warning" if unbalanced.
6. id:"action_items", type:"numbered_list" — Most urgent action, medium-term optimization, long-term adjustment.
7. id:"goal_alignment", type:"summary" — Investment tracking vs goals, monthly rate, projected timeline. severity:"positive" if on track.`;

export const TAX_OPTIMIZATION_PROMPT = `You are an Indian tax advisor specializing in income tax planning for FY 2025-26 (AY 2026-27). Analyze the user's financial data and recommend tax-saving strategies under both Old and New regimes.

${JSON_INSTRUCTIONS}

Return sections with these IDs in this order:
1. id:"current_status", type:"summary" — Current estimated tax liability under both regimes, recommended regime (Old vs New), effective tax rate, and taxable income bracket. severity based on optimization potential.
2. id:"section_80c", type:"list" — Section 80C analysis: deductions already used vs Rs.1,50,000 limit. List specific instruments to invest in (ELSS, PPF, EPF, LIC, NSC, SCSS, tax-saver FD) with exact INR amounts to maximize. severity:"warning" if under-utilized, "positive" if near or at limit.
3. id:"health_insurance", type:"list" — Section 80D analysis: health insurance premiums for self/family (up to Rs.25,000) and parents (up to Rs.25,000 or Rs.50,000 for senior citizens). Show current coverage, gap amounts, and recommended policies. severity:"warning" if no coverage or under-insured.
4. id:"hra_optimization", type:"list" — HRA exemption analysis: actual HRA received vs optimal claim, metro vs non-metro impact (50% vs 40% of basic), rent paid vs 10% of salary calculation. Only include this section if HRA or rent data exists in the financial context. severity:"neutral".
5. id:"other_deductions", type:"list" — Additional deductions: 80TTA savings interest (up to Rs.10,000), 80E education loan interest, 80CCD(1B) NPS (additional Rs.50,000), Section 24 home loan interest (up to Rs.2,00,000). Show used vs available limits. severity:"positive" for utilized deductions, "warning" for unused ones.
6. id:"action_plan", type:"numbered_list" — Top 5 specific tax-saving actions ordered by impact. Each item must include the exact INR tax savings (e.g. "Invest **Rs.50,000** in NPS under 80CCD(1B) — saves \`Rs.15,600\` in tax"). severity:"positive".
7. id:"total_savings", type:"highlight" — One-line summary: "You can save **Rs.X,XX,XXX** in tax this year by ..." with the total potential savings. severity:"positive".`;

const PROMPT_MAP: Record<AiInsightType, string> = {
  spending_analysis: SPENDING_ANALYSIS_PROMPT,
  monthly_budget: MONTHLY_BUDGET_PROMPT,
  weekly_budget: WEEKLY_BUDGET_PROMPT,
  investment_insights: INVESTMENT_INSIGHTS_PROMPT,
  tax_optimization: TAX_OPTIMIZATION_PROMPT,
};

export function getSystemPrompt(type: AiInsightType): string {
  return PROMPT_MAP[type];
}

export function buildUserMessage(type: AiInsightType, ctx: PipelineContext): string {
  const parts: string[] = ['Here is my financial data:\n'];

  if (ctx.financialContext) {
    parts.push(ctx.financialContext);
  }

  if (ctx.currentMonthContext) {
    parts.push(ctx.currentMonthContext);
  }

  if (ctx.investmentContext) {
    parts.push(ctx.investmentContext);
  }

  if (ctx.nwiContext) {
    parts.push(ctx.nwiContext);
  }

  if (ctx.healthContext) {
    parts.push(ctx.healthContext);
  }

  if (ctx.goalsContext) {
    parts.push(ctx.goalsContext);
  }

  if (ctx.marketContext) {
    parts.push(ctx.marketContext);
  }

  if (ctx.taxContext) {
    parts.push(ctx.taxContext);
  }

  const typeLabels: Record<AiInsightType, string> = {
    spending_analysis: 'Please analyze my spending patterns and provide insights.',
    monthly_budget: 'Please give me monthly budget recommendations.',
    weekly_budget: 'Please give me weekly budget recommendations.',
    investment_insights: 'Please analyze my investment portfolio and provide insights.',
    tax_optimization: 'Please analyze my tax situation for FY 2025-26 and recommend tax-saving strategies.',
  };

  parts.push(`\n${typeLabels[type]}`);

  return parts.join('\n\n');
}
