"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  IconSchool,
  IconBulb,
  IconShieldCheck,
  IconChartLine,
  IconBuildingBank,
  IconCoins,
  IconPigMoney,
  IconCalculator,
  IconTarget,
  IconWallet,
  IconTrendingUp,
  IconChartDonut,
  IconCash,
  IconReceipt,
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconBookmark,
  IconClock,
  IconStar,
  IconArrowRight,
  IconFlame,
  IconScale,
  IconX,
  IconSparkles,
  IconMoodSmile,
  IconTrophy,
  IconRocket,
} from "@tabler/icons-react"

import { stagger, staggerSlow, fadeUp, fadeUpSmall, spring } from "@/lib/motion"
import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

/* ─── Types ─── */

interface Topic {
  id: string
  title: string
  icon: React.ElementType
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  readTime: string
  description: string
  content: React.ReactNode
}

interface TopicSection {
  id: string
  title: string
  icon: React.ElementType
  gradient: string
  topics: Topic[]
}

/* ─── localStorage helpers ─── */

const STORAGE_KEY = "learn-progress"

function loadProgress(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    // ignore
  }
  return new Set()
}

function saveProgress(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/* ─── Key Takeaway component ─── */

function KeyTakeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconStar className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Key Takeaway</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

/* ─── Tip component ─── */

function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconBulb className="h-4 w-4 text-cyan-500" />
        <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">Pro Tip</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

/* ─── Content helper: section heading inside topic ─── */

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5">{children}</h3>
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="text-sm text-muted-foreground leading-relaxed mb-2 ml-4 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="list-disc">{item}</li>
      ))}
    </ul>
  )
}

/* ─── Difficulty helpers ─── */

function difficultyColor(d: Topic["difficulty"]) {
  switch (d) {
    case "Beginner":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    case "Intermediate":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    case "Advanced":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  }
}

function difficultyIconBg(d: Topic["difficulty"]) {
  switch (d) {
    case "Beginner":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "Intermediate":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    case "Advanced":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  }
}

/* ─── Progress motivational copy ─── */

function getMotivationalCopy(percent: number, readCount: number, total: number): { text: string; icon: React.ElementType } {
  if (readCount === 0) return { text: "Begin your journey to financial mastery", icon: IconRocket }
  if (percent === 100) return { text: "You have mastered every topic. Brilliant.", icon: IconTrophy }
  if (percent >= 75) return { text: "Almost there! Just a few topics left to conquer", icon: IconSparkles }
  if (percent >= 50) return { text: "Halfway through! Your financial IQ is growing fast", icon: IconTrendingUp }
  if (percent >= 25) return { text: "Great momentum! Keep exploring to level up", icon: IconMoodSmile }
  return { text: "You are off to a strong start. Keep going!", icon: IconFlame }
}

/* ─── All topic content ─── */

const SECTIONS: TopicSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: IconSchool,
    gradient: "from-emerald-500/80 to-cyan-500/80",
    topics: [
      {
        id: "what-is-investing",
        title: "What is Investing?",
        icon: IconBulb,
        difficulty: "Beginner",
        readTime: "4 min read",
        description: "Why you should invest, the power of compounding, and why savings accounts alone won't cut it.",
        content: (
          <>
            <Paragraph>
              Investing is putting your money to work so it grows over time. Instead of letting your hard-earned cash sit idle in a savings account earning 3-4% interest, you deploy it into assets that historically deliver much higher returns.
            </Paragraph>

            <H3>Why Should You Invest?</H3>
            <Paragraph>
              Here is the uncomfortable truth: inflation in India averages around 6-7% per year. If your savings account pays you 3.5%, your money is actually losing purchasing power every single year. That fancy phone costing &#8377;50,000 today will cost &#8377;67,000 in five years at 6% inflation. Your savings account balance? It would grow to only about &#8377;59,000 in the same period.
            </Paragraph>

            <H3>The Magic of Compounding</H3>
            <Paragraph>
              Albert Einstein reportedly called compound interest the eighth wonder of the world. Here is why: if you invest &#8377;10,000 at 12% annual return, after 10 years you will have &#8377;31,058. After 20 years? &#8377;96,463. After 30 years? A staggering &#8377;2,99,599. That is 30x your original investment, and you did not lift a finger after the first deposit.
            </Paragraph>
            <Paragraph>
              The secret is that your returns start earning returns. In year one, you earn &#8377;1,200 on your &#8377;10,000. In year two, you earn &#8377;1,344 because now you have &#8377;11,200 working for you. This snowball effect accelerates dramatically over long periods.
            </Paragraph>

            <H3>Savings vs. Investing</H3>
            <BulletList items={[
              "Savings account: 3-4% return, virtually zero risk, fully liquid",
              "Fixed deposit: 6-7% return, very low risk, locked for a period",
              "Equity mutual funds: 12-15% historical return, moderate risk, best for 5+ year horizon",
              "Direct stocks: potentially higher returns, higher risk, requires knowledge and time",
            ]} />

            <H3>When to Start?</H3>
            <Paragraph>
              The best time to start investing was 10 years ago. The second best time is today. Even small amounts grow significantly over decades. A 25-year-old investing just &#8377;5,000/month at 12% will have over &#8377;3.2 crore by age 55. Starting at 35 with the same amount? Only about &#8377;95 lakh. Those 10 extra years make a 3x difference because of compounding.
            </Paragraph>

            <KeyTakeaway>
              Investing is not about getting rich quick. It is about consistently putting money into growing assets and letting compounding do the heavy lifting over time. Start small, start early, and stay consistent.
            </KeyTakeaway>

            <ProTip>
              Even &#8377;500/month in an index fund SIP is a great start. The important thing is to begin. You can always increase the amount later.
            </ProTip>
          </>
        ),
      },
      {
        id: "risk-vs-return",
        title: "Risk vs Return",
        icon: IconScale,
        difficulty: "Beginner",
        readTime: "4 min read",
        description: "Understanding how risk and returns are connected, and finding your comfort zone.",
        content: (
          <>
            <Paragraph>
              In the world of investing, risk and return are two sides of the same coin. Generally, the higher the potential return, the higher the risk you need to accept. Understanding this relationship is the foundation of smart investing.
            </Paragraph>

            <H3>What is Investment Risk?</H3>
            <Paragraph>
              Risk does not mean you will definitely lose money. It means the actual return could be different from what you expect. A savings account has almost zero risk because you know exactly what you will get. Stocks have higher risk because their value can swing wildly in the short term, even though they tend to grow over long periods.
            </Paragraph>

            <H3>The Risk-Return Spectrum</H3>
            <BulletList items={[
              "Savings account (3-4%): Lowest risk, lowest return. Your money is safe but barely keeps up with inflation.",
              "Government bonds / PPF (7-8%): Very low risk, guaranteed by the government. Decent but not exciting.",
              "Corporate bonds / debt funds (7-10%): Low to moderate risk. Companies are less safe than the government.",
              "Balanced / hybrid funds (10-12%): Moderate risk. A mix of stocks and bonds gives you a smoother ride.",
              "Equity mutual funds (12-15%): Moderate to high risk. Great for long-term wealth creation.",
              "Direct stocks (variable): High risk, potentially high reward. Individual stocks can double or halve in value.",
              "Crypto / penny stocks: Very high risk. You could make a fortune or lose everything.",
            ]} />

            <H3>Risk Tolerance: Know Yourself</H3>
            <Paragraph>
              Your risk tolerance depends on three things: your age (younger = can take more risk because you have time to recover), your financial situation (emergency fund first, investments second), and your personality (can you sleep well if your portfolio drops 30%?).
            </Paragraph>

            <H3>Diversification: Do Not Put All Eggs in One Basket</H3>
            <Paragraph>
              Diversification is the simplest way to manage risk. By spreading your money across different asset types (stocks, bonds, gold, real estate), different sectors (IT, banking, pharma), and different geographies (India, US), you ensure that a crash in one area does not wipe out your entire portfolio. Think of it as a cricket team: you need batsmen, bowlers, and all-rounders to win consistently.
            </Paragraph>

            <KeyTakeaway>
              Higher returns always come with higher risk. The goal is not to eliminate risk, but to take the right amount of risk for your age, goals, and temperament. Diversification is your best friend.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "emergency-fund",
        title: "Emergency Fund",
        icon: IconShieldCheck,
        difficulty: "Beginner",
        readTime: "3 min read",
        description: "Your financial safety net. Why you absolutely need one before you start investing.",
        content: (
          <>
            <Paragraph>
              Before you invest a single rupee in the stock market, you need an emergency fund. Think of it as the foundation of your financial house. Without it, one unexpected expense can force you to sell your investments at the worst possible time.
            </Paragraph>

            <H3>What is an Emergency Fund?</H3>
            <Paragraph>
              An emergency fund is money set aside specifically for unexpected expenses: a medical emergency, job loss, car breakdown, or urgent home repair. It is not for vacations, gadgets, or sales (even if they feel urgent). It is boring money with an exciting purpose: keeping you out of debt and financial panic.
            </Paragraph>

            <H3>How Much Do You Need?</H3>
            <Paragraph>
              The golden rule is 3 to 6 months of your essential expenses. If your monthly essentials (rent, food, EMIs, utilities, insurance) add up to &#8377;30,000, you need &#8377;90,000 to &#8377;1,80,000 in your emergency fund. If you have dependents or an unstable income (freelancing, business), aim for 6 to 12 months.
            </Paragraph>

            <H3>Where to Keep It</H3>
            <BulletList items={[
              "High-yield savings account: Earns some interest, instantly accessible. This is the go-to option.",
              "Liquid mutual fund: Slightly better returns (5-6%), redeemable within 24 hours. Good for the portion you are unlikely to need instantly.",
              "Fixed deposit with premature withdrawal: Decent interest, penalty for early withdrawal. Consider for a portion of your fund.",
              "NOT in stocks or equity mutual funds: These can lose value right when you need the money most.",
            ]} />

            <H3>How to Build It</H3>
            <Paragraph>
              Start by saving &#8377;5,000 to &#8377;10,000 per month until you reach your target. Automate the transfer right after payday so you are not tempted to spend it. Once your emergency fund is in place, redirect that monthly amount into investments.
            </Paragraph>

            <KeyTakeaway>
              An emergency fund is not optional. It is the one thing standing between you and financial disaster. Build it first, invest second. Aim for 6 months of expenses in a liquid, safe account.
            </KeyTakeaway>

            <ProTip>
              Open a separate bank account for your emergency fund. Out of sight, out of mind. If it is mixed with your spending money, it will disappear.
            </ProTip>
          </>
        ),
      },
    ],
  },
  {
    id: "market-instruments",
    title: "Market Instruments",
    icon: IconChartLine,
    gradient: "from-blue-500/80 to-violet-500/80",
    topics: [
      {
        id: "stocks",
        title: "Stocks (Equities)",
        icon: IconChartLine,
        difficulty: "Intermediate",
        readTime: "5 min read",
        description: "How the stock market works, BSE/NSE basics, and key terms every investor should know.",
        content: (
          <>
            <Paragraph>
              When you buy a stock, you are buying a tiny piece of a company. If the company does well, your piece becomes more valuable. If it does poorly, your piece loses value. It is that simple at its core.
            </Paragraph>

            <H3>How Does the Stock Market Work?</H3>
            <Paragraph>
              India has two major stock exchanges: the Bombay Stock Exchange (BSE, established 1875) and the National Stock Exchange (NSE, established 1992). Companies list their shares on these exchanges through an IPO (Initial Public Offering). After that, anyone with a demat account can buy and sell these shares during market hours (9:15 AM to 3:30 PM, Monday to Friday).
            </Paragraph>
            <Paragraph>
              When you place a buy order through your broker (Zerodha, Groww, etc.), the exchange matches you with a seller. The price is determined by supply and demand. If more people want to buy a stock than sell it, the price goes up, and vice versa.
            </Paragraph>

            <H3>Key Terms You Must Know</H3>
            <BulletList items={[
              "Market Cap: The total value of all a company's shares. Large-cap (> &#8377;20,000 crore) = stable, mid-cap (&#8377;5,000-20,000 crore) = growth potential, small-cap (< &#8377;5,000 crore) = high risk, high reward.",
              "P/E Ratio (Price-to-Earnings): How much investors pay per rupee of earnings. A P/E of 20 means you pay &#8377;20 for every &#8377;1 the company earns. Lower can mean undervalued, higher can mean overvalued or high growth expected.",
              "EPS (Earnings Per Share): Company's profit divided by number of shares. Higher is better. If a company earns &#8377;100 crore with 10 crore shares, EPS = &#8377;10.",
              "Dividend: A portion of profits paid to shareholders. Not all companies pay dividends. ITC and Coal India are famous for generous dividends.",
              "Face Value: The nominal value of a share (often &#8377;1 or &#8377;10). Not related to market price.",
              "52-Week High/Low: The highest and lowest price in the past year. Useful for understanding price range.",
            ]} />

            <H3>How to Buy Stocks</H3>
            <Paragraph>
              You need three things: a PAN card, a bank account, and a demat account (think of it as a digital locker for your shares). Sign up with a broker like Zerodha, Groww, or Angel One, complete the KYC process, fund your account, and you are ready to trade. Most brokers now charge zero brokerage on delivery trades.
            </Paragraph>

            <H3>Dividends and Capital Gains</H3>
            <Paragraph>
              You make money from stocks in two ways. Capital gains: buy at &#8377;100, sell at &#8377;150, profit is &#8377;50. Dividends: the company pays you &#8377;5 per share from its profits. Long-term capital gains (held over 1 year) above &#8377;1.25 lakh are taxed at 12.5%. Short-term gains are taxed at 20%.
            </Paragraph>

            <KeyTakeaway>
              Stocks offer the highest long-term returns among common asset classes, but they require patience and knowledge. Start by understanding the companies you invest in, and never invest money you might need within 3-5 years.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "mutual-funds",
        title: "Mutual Funds",
        icon: IconCoins,
        difficulty: "Beginner",
        readTime: "5 min read",
        description: "A pooled investment managed by professionals. The easiest way to start investing.",
        content: (
          <>
            <Paragraph>
              A mutual fund pools money from thousands of investors and invests it in a diversified portfolio of stocks, bonds, or other assets. A professional fund manager makes all the buying and selling decisions. Think of it as hiring an expert chef instead of cooking a complex meal yourself.
            </Paragraph>

            <H3>How NAV Works</H3>
            <Paragraph>
              NAV (Net Asset Value) is the price of one unit of a mutual fund. If a fund has &#8377;100 crore in assets and 10 crore units, the NAV is &#8377;10. When you invest &#8377;5,000, you get 500 units at NAV &#8377;10. If the NAV rises to &#8377;12, your 500 units are now worth &#8377;6,000. NAV is updated daily after market hours.
            </Paragraph>

            <H3>Types of Mutual Funds</H3>
            <BulletList items={[
              "Equity Funds: Invest primarily in stocks. Best for long-term goals (5+ years). Sub-types include large-cap, mid-cap, small-cap, and flexi-cap.",
              "Debt Funds: Invest in bonds, government securities, and fixed-income instruments. Lower risk, lower return (6-8%). Good for 1-3 year goals.",
              "Hybrid Funds: A mix of equity and debt. Balanced advantage funds automatically shift between stocks and bonds based on market conditions.",
              "Index Funds: Passively track an index like Nifty 50. Low expense ratio, no fund manager bias. We will cover these in detail next.",
              "ELSS (Equity Linked Savings Scheme): Equity funds with a 3-year lock-in. Offer tax deduction under Section 80C up to &#8377;1,50,000.",
            ]} />

            <H3>Expense Ratio: The Hidden Cost</H3>
            <Paragraph>
              Every mutual fund charges an annual fee called the expense ratio. An expense ratio of 1.5% means the fund deducts &#8377;1,500 per year for every &#8377;1,00,000 you have invested. This is automatically deducted from the NAV, so you never see a separate charge. Active funds typically charge 1-2%, while index funds charge 0.1-0.5%. Over 20 years, this difference compounds massively.
            </Paragraph>

            <H3>AUM: Assets Under Management</H3>
            <Paragraph>
              AUM tells you the total money a fund manages. Higher AUM (like &#8377;50,000+ crore) generally indicates investor trust and fund stability, but it can also make it harder for the fund to outperform because moving large amounts of money is difficult. For index funds, higher AUM is generally better (lower tracking error).
            </Paragraph>

            <H3>Direct vs Regular Plans</H3>
            <Paragraph>
              Every mutual fund comes in two flavors. Regular plans include a commission for the distributor (bank, advisor) and have a higher expense ratio. Direct plans cut out the middleman and are cheaper by 0.5-1%. Always choose Direct plans if you are investing on your own through platforms like Zerodha Coin, Groww, or Kuvera.
            </Paragraph>

            <KeyTakeaway>
              Mutual funds are the simplest path to diversified investing. Choose Direct plans to save on costs, match the fund type to your goal timeline, and always check the expense ratio before investing.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "index-funds",
        title: "Index Funds",
        icon: IconTrendingUp,
        difficulty: "Beginner",
        readTime: "4 min read",
        description: "Why most experts recommend index funds, and what makes them special.",
        content: (
          <>
            <Paragraph>
              An index fund is a type of mutual fund that simply copies a market index. Instead of a fund manager picking stocks, the fund buys all the stocks in the index in the same proportion. Think of it as a sampler platter at a restaurant: you get a taste of everything on the menu.
            </Paragraph>

            <H3>What is a Market Index?</H3>
            <BulletList items={[
              "Nifty 50: The top 50 companies listed on NSE by market cap. Includes Reliance, TCS, HDFC Bank, Infosys, etc. This is India's benchmark index.",
              "Sensex (BSE 30): The top 30 companies on BSE. Similar to Nifty 50 but older and with fewer companies.",
              "Nifty Next 50: The 51st to 100th largest companies. Slightly more growth-oriented.",
              "Nifty Midcap 150: 150 mid-sized companies. Higher risk, higher potential return.",
              "S&P 500: Top 500 US companies. International diversification option available through fund-of-funds.",
            ]} />

            <H3>Why Index Funds Are So Popular</H3>
            <Paragraph>
              Here is a fact that surprises most people: over a 10-year period, about 80-90% of actively managed funds fail to beat their benchmark index after fees. That means the expensive fund manager with the fancy office is usually worse than a simple index fund that runs on autopilot.
            </Paragraph>
            <Paragraph>
              The reasons are simple. Index funds have much lower expense ratios (0.1-0.2% vs 1-2% for active funds). They do not suffer from fund manager bias or bad timing decisions. And they automatically stay diversified across the market's biggest companies.
            </Paragraph>

            <H3>Passive vs Active Management</H3>
            <Paragraph>
              Active management means a human picks stocks trying to beat the market. Passive management (index funds) means you match the market. It sounds counterintuitive, but matching the market consistently beats most people who try to beat it. Warren Buffett himself has recommended index funds for most investors. He even won a famous million-dollar bet that the S&P 500 index would beat a collection of hedge funds over 10 years.
            </Paragraph>

            <H3>How to Pick an Index Fund</H3>
            <BulletList items={[
              "Choose a well-known index (Nifty 50 is great for beginners)",
              "Compare expense ratios (lower is always better, aim for under 0.2%)",
              "Check tracking error (how closely the fund follows the index, lower is better)",
              "Prefer higher AUM funds (they track the index more efficiently)",
              "Always pick the Direct Growth plan",
            ]} />

            <KeyTakeaway>
              Index funds offer market returns at minimal cost with zero stock-picking stress. A Nifty 50 index fund with low expense ratio is arguably the single best investment for most beginners. Start here and branch out as you learn more.
            </KeyTakeaway>

            <ProTip>
              Nifty 50 has returned about 12-13% CAGR over the last 20 years. A &#8377;10,000/month SIP in a Nifty 50 index fund for 25 years at 12% would grow to roughly &#8377;1.9 crore. The total amount you invest is just &#8377;30 lakh.
            </ProTip>
          </>
        ),
      },
      {
        id: "sip",
        title: "SIP (Systematic Investment Plan)",
        icon: IconPigMoney,
        difficulty: "Beginner",
        readTime: "4 min read",
        description: "Invest a fixed amount regularly and harness the power of rupee cost averaging.",
        content: (
          <>
            <Paragraph>
              A SIP lets you invest a fixed amount in a mutual fund at regular intervals (usually monthly). Instead of investing &#8377;1,20,000 all at once and worrying about market timing, you invest &#8377;10,000 every month like clockwork. It is the most stress-free way to build wealth.
            </Paragraph>

            <H3>How SIP Works</H3>
            <Paragraph>
              On a fixed date every month, your bank automatically transfers a set amount to your chosen mutual fund. The fund allots you units based on that day's NAV. If the NAV is &#8377;100, your &#8377;10,000 buys 100 units. Next month, if the NAV drops to &#8377;80, you get 125 units for the same &#8377;10,000. When the NAV is &#8377;120, you get about 83 units.
            </Paragraph>

            <H3>Rupee Cost Averaging</H3>
            <Paragraph>
              This is the magic of SIP. Because you invest a fixed amount, you automatically buy more units when prices are low and fewer when prices are high. Over time, this averages out your purchase price. You do not need to time the market because SIP does it for you mathematically.
            </Paragraph>
            <Paragraph>
              Example: Over 6 months, the NAV goes 100, 80, 90, 110, 95, 105. Investing &#8377;10,000 monthly, you buy 100 + 125 + 111 + 91 + 105 + 95 = 627 units for &#8377;60,000. Your average cost per unit is &#8377;95.7, which is lower than the simple average NAV of &#8377;96.7.
            </Paragraph>

            <H3>The Power of SIP: Real Numbers</H3>
            <BulletList items={[
              "&#8377;5,000/month for 10 years at 12% = &#8377;11.6 lakh (invested: &#8377;6 lakh)",
              "&#8377;5,000/month for 20 years at 12% = &#8377;49.9 lakh (invested: &#8377;12 lakh)",
              "&#8377;5,000/month for 30 years at 12% = &#8377;1.76 crore (invested: &#8377;18 lakh)",
              "&#8377;10,000/month for 25 years at 12% = &#8377;1.89 crore (invested: &#8377;30 lakh)",
              "&#8377;25,000/month for 20 years at 12% = &#8377;2.49 crore (invested: &#8377;60 lakh)",
            ]} />

            <H3>SIP Best Practices</H3>
            <Paragraph>
              Set up auto-debit so you never miss a payment. Choose a date right after your salary credit. Do not stop SIP during market crashes (that is actually when you are getting the best deals). Increase your SIP amount by 10% every year as your salary grows (called a step-up SIP).
            </Paragraph>

            <KeyTakeaway>
              SIP removes emotion from investing. You invest consistently regardless of market conditions, and rupee cost averaging works in your favor. Start with any amount and increase over time. The best SIP is the one you never stop.
            </KeyTakeaway>

            <ProTip>
              Start with &#8377;500/month if that is all you can afford. Most platforms allow SIPs starting at &#8377;100-500. The habit of investing regularly matters more than the amount.
            </ProTip>
          </>
        ),
      },
      {
        id: "fixed-deposits-debt",
        title: "Fixed Deposits & Debt Instruments",
        icon: IconBuildingBank,
        difficulty: "Beginner",
        readTime: "4 min read",
        description: "Safe, predictable returns. FDs, PPF, EPF, NPS, and government bonds explained.",
        content: (
          <>
            <Paragraph>
              Not everyone is comfortable with the stock market, and that is perfectly fine. Debt instruments offer predictable, stable returns with minimal risk. They are essential for the conservative portion of your portfolio and for goals that are less than 3-5 years away.
            </Paragraph>

            <H3>Fixed Deposits (FDs)</H3>
            <Paragraph>
              You deposit a lump sum with a bank for a fixed period (7 days to 10 years) at a predetermined interest rate. Currently, major banks offer 6-7.5% for most tenures. Senior citizens get an extra 0.25-0.5%. The interest is guaranteed, and deposits up to &#8377;5 lakh per bank are insured by DICGC.
            </Paragraph>
            <Paragraph>
              Downside: Interest is fully taxable at your income slab. If you are in the 30% tax bracket, a 7% FD effectively gives you only about 4.9% post-tax, which barely beats inflation.
            </Paragraph>

            <H3>Recurring Deposits (RDs)</H3>
            <Paragraph>
              Like a SIP, but for fixed deposits. You deposit a fixed amount monthly, and it earns FD-like interest. Great for building a short-term corpus, but returns are similar to FDs and face the same tax issue.
            </Paragraph>

            <H3>PPF (Public Provident Fund)</H3>
            <BulletList items={[
              "Government-backed, currently 7.1% interest (reviewed quarterly)",
              "15-year lock-in with partial withdrawal from year 7",
              "Contributions up to &#8377;1,50,000/year qualify for 80C deduction",
              "Interest earned is completely tax-free (EEE status)",
              "One of the safest long-term debt instruments in India",
            ]} />

            <H3>EPF (Employee Provident Fund)</H3>
            <Paragraph>
              If you are a salaried employee, 12% of your basic salary goes to EPF, matched by your employer. The current interest rate is about 8.25%. This is essentially forced savings with excellent returns and tax benefits. Do not withdraw it when changing jobs (transfer it instead).
            </Paragraph>

            <H3>NPS (National Pension System)</H3>
            <Paragraph>
              A government-sponsored retirement scheme that invests in a mix of equity, corporate bonds, and government securities. You get an additional &#8377;50,000 tax deduction under Section 80CCD(1B) over and above the &#8377;1.5 lakh 80C limit. The catch is that 40% of the corpus must be used to buy an annuity at retirement.
            </Paragraph>

            <H3>Government Bonds / SGBs</H3>
            <Paragraph>
              Sovereign Gold Bonds (SGBs) offer 2.5% annual interest plus gold price appreciation, and capital gains are tax-free if held till maturity (8 years). Government securities (G-Secs) can now be bought directly through RBI Retail Direct.
            </Paragraph>

            <KeyTakeaway>
              Debt instruments are the steady, predictable part of your portfolio. PPF for long-term tax-free growth, EPF as forced retirement savings, FDs for short-term needs, and NPS for the extra tax benefit. Every portfolio needs some allocation to debt.
            </KeyTakeaway>
          </>
        ),
      },
    ],
  },
  {
    id: "financial-planning",
    title: "Financial Planning",
    icon: IconTarget,
    gradient: "from-cyan-500/80 to-emerald-500/80",
    topics: [
      {
        id: "budgeting-methods",
        title: "Budgeting Methods",
        icon: IconWallet,
        difficulty: "Beginner",
        readTime: "5 min read",
        description: "Popular frameworks to control spending: 50/30/20, NWI, zero-based, and the envelope method.",
        content: (
          <>
            <Paragraph>
              A budget is not a restriction. It is a plan for your money. Without one, cash has a mysterious way of disappearing before the month ends. Here are the most popular budgeting methods, from simple to detailed.
            </Paragraph>

            <H3>The 50/30/20 Rule</H3>
            <Paragraph>
              The simplest budgeting framework. Divide your after-tax income into three buckets: 50% for Needs (rent, groceries, EMIs, utilities, insurance), 30% for Wants (dining out, entertainment, shopping, subscriptions), and 20% for Savings and Investments (SIPs, emergency fund, debt repayment beyond minimums).
            </Paragraph>
            <Paragraph>
              Example: If your take-home salary is &#8377;60,000, that is &#8377;30,000 for needs, &#8377;18,000 for wants, and &#8377;12,000 for savings/investments. If your needs exceed 50%, you might need to find ways to reduce fixed costs or increase income.
            </Paragraph>

            <H3>NWI (Needs, Wants, Investments) Framework</H3>
            <Paragraph>
              A variation used in this app. It classifies every transaction into one of three categories. The ideal split depends on your income level and goals, but a good target is Needs under 50%, Wants under 30%, and Investments at least 20%. Tracking this consistently shows you exactly where your money goes and where you can optimize.
            </Paragraph>

            <H3>Zero-Based Budgeting</H3>
            <Paragraph>
              Every rupee gets a job. Start with your income and allocate every single rupee to a category until you hit zero. Income &#8377;60,000 = Rent &#8377;15,000 + Groceries &#8377;8,000 + Transport &#8377;3,000 + SIP &#8377;10,000 + Emergency fund &#8377;5,000 + Entertainment &#8377;5,000 + Utilities &#8377;4,000 + Insurance &#8377;2,000 + Misc &#8377;3,000 + Buffer &#8377;5,000 = &#8377;60,000. This method is very detailed but gives you maximum control.
            </Paragraph>

            <H3>Envelope Method</H3>
            <Paragraph>
              An old-school method that works surprisingly well. Put cash in labeled envelopes for each spending category. When the envelope is empty, you stop spending in that category. In the digital age, you can use separate bank accounts or budgeting apps to simulate envelopes. This works great for people who tend to overspend with cards.
            </Paragraph>

            <H3>Which Method is Right for You?</H3>
            <BulletList items={[
              "Just starting out? Use 50/30/20. It is simple and effective.",
              "Want detailed control? Try zero-based budgeting.",
              "Overspend on cards? Try the envelope method.",
              "Already using this app? The NWI framework tracks your split automatically.",
            ]} />

            <KeyTakeaway>
              The best budget is one you actually follow. Start with the simplest method that works for you and refine over time. The goal is awareness: knowing where your money goes is the first step to controlling it.
            </KeyTakeaway>

            <ProTip>
              Automate your savings. Set up auto-debit for SIPs and savings transfers on payday. What you do not see, you do not spend.
            </ProTip>
          </>
        ),
      },
      {
        id: "savings-rate",
        title: "Savings Rate",
        icon: IconCalculator,
        difficulty: "Beginner",
        readTime: "3 min read",
        description: "The single most important number in personal finance. Learn to calculate and improve it.",
        content: (
          <>
            <Paragraph>
              Your savings rate is the percentage of your income that you save and invest. It is arguably the most important metric in personal finance because it directly determines how fast you build wealth and when you can achieve financial independence.
            </Paragraph>

            <H3>How to Calculate It</H3>
            <Paragraph>
              Savings Rate = (Income - Expenses) / Income x 100. If you earn &#8377;80,000 and spend &#8377;55,000, your savings rate is (80,000 - 55,000) / 80,000 = 31.25%. Include all forms of income and all expenses including EMIs.
            </Paragraph>

            <H3>Benchmarks</H3>
            <BulletList items={[
              "Below 10%: Danger zone. You are living paycheck to paycheck with no buffer.",
              "10-20%: Acceptable. You are building some wealth, but slowly.",
              "20-30%: Good. You are on track for a comfortable retirement.",
              "30-50%: Great. You are building serious wealth and have options.",
              "50%+: Exceptional. You are on the fast track to financial independence.",
            ]} />

            <H3>Why It Matters More Than Returns</H3>
            <Paragraph>
              Here is a counterintuitive truth: your savings rate matters more than your investment returns, especially in the early years. Someone saving &#8377;30,000/month at 10% returns will build more wealth than someone saving &#8377;10,000/month at 15% returns. Over 20 years, the first person has &#8377;2.28 crore while the second has &#8377;1.52 crore. The amount you save trumps how cleverly you invest it.
            </Paragraph>

            <H3>How to Improve Your Savings Rate</H3>
            <BulletList items={[
              "Track every expense for a month (this app helps with that!)",
              "Identify and cut subscriptions you do not use",
              "Cook more, eat out less (dining is often the biggest leak)",
              "Increase income through skills, side projects, or career moves",
              "Save raises: when you get a salary bump, save at least half of the increase",
            ]} />

            <KeyTakeaway>
              Aim for a savings rate of at least 20%. Track it monthly. Small improvements compound massively over decades. A 5% increase in your savings rate today can mean years of earlier retirement.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "net-worth",
        title: "Net Worth",
        icon: IconChartDonut,
        difficulty: "Beginner",
        readTime: "3 min read",
        description: "Your financial scorecard. How to calculate and track the number that truly matters.",
        content: (
          <>
            <Paragraph>
              Net worth is the single number that captures your entire financial picture. It is simple: everything you own minus everything you owe. If you have &#8377;20 lakh in assets and &#8377;5 lakh in debt, your net worth is &#8377;15 lakh.
            </Paragraph>

            <H3>How to Calculate It</H3>
            <Paragraph>
              Add up all your assets: savings accounts, fixed deposits, mutual fund investments, stocks, PPF, EPF, real estate (current market value), gold, and any other valuables. Then subtract all your liabilities: home loan, car loan, education loan, credit card debt, and personal loans. The difference is your net worth.
            </Paragraph>

            <H3>What Counts as Assets</H3>
            <BulletList items={[
              "Bank balances (savings, FDs, RDs)",
              "Investment portfolio (mutual funds, stocks, bonds)",
              "Retirement accounts (EPF, PPF, NPS)",
              "Real estate (at current market value, not purchase price)",
              "Gold and other physical assets",
              "Business equity if applicable",
            ]} />

            <H3>What Counts as Liabilities</H3>
            <BulletList items={[
              "Home loan outstanding balance",
              "Car loan, education loan, personal loan balances",
              "Credit card debt (outstanding, not limit)",
              "Any money you owe to others",
            ]} />

            <H3>Tracking Over Time</H3>
            <Paragraph>
              The absolute number matters less than the trend. Calculate your net worth monthly or quarterly and track it in a spreadsheet or in this app's financial health section. A consistently rising net worth means you are building wealth. If it is flat or declining, you need to investigate why. Good months and bad months are normal, but the long-term trend should be upward.
            </Paragraph>

            <H3>Net Worth by Age (India, rough benchmarks)</H3>
            <BulletList items={[
              "Age 25: 0.5x to 1x annual salary",
              "Age 30: 1x to 3x annual salary",
              "Age 35: 3x to 5x annual salary",
              "Age 40: 5x to 8x annual salary",
              "Age 50: 10x to 15x annual salary",
            ]} />

            <KeyTakeaway>
              Net worth is your financial GPS. It tells you where you are, and tracking it over time tells you if you are heading in the right direction. Check it monthly and focus on growing it consistently.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "fire",
        title: "Financial Freedom (FIRE)",
        icon: IconFlame,
        difficulty: "Intermediate",
        readTime: "5 min read",
        description: "The movement to retire early. What is FIRE, how to calculate your number, and the different flavors.",
        content: (
          <>
            <Paragraph>
              FIRE stands for Financial Independence, Retire Early. It is a movement built on a simple idea: if you save and invest aggressively, you can build a portfolio large enough to cover your living expenses forever, freeing you from the need to work for money. Retirement here does not mean doing nothing; it means work becomes optional.
            </Paragraph>

            <H3>The 4% Rule</H3>
            <Paragraph>
              The core of FIRE is the Trinity Study's 4% rule: if you withdraw 4% of your investment portfolio per year, it should last 30+ years (historically, with a US stock/bond portfolio). This means you need 25 times your annual expenses to be financially independent.
            </Paragraph>
            <Paragraph>
              Example: If you spend &#8377;6 lakh per year (&#8377;50,000/month), you need &#8377;6 lakh x 25 = &#8377;1.5 crore. If you spend &#8377;12 lakh/year (&#8377;1 lakh/month), you need &#8377;3 crore. For India, many FIRE enthusiasts use a more conservative 3-3.5% withdrawal rate to account for higher inflation, which means needing 28-33x annual expenses.
            </Paragraph>

            <H3>Calculating Your FIRE Number</H3>
            <BulletList items={[
              "Step 1: Calculate your annual expenses (track for 3-6 months for accuracy)",
              "Step 2: Add 20-30% buffer for healthcare, inflation, and surprises",
              "Step 3: Multiply by 25 (for 4% rule) or 33 (for conservative 3% rule)",
              "Step 4: That is your FIRE number. Work backward to figure out how long it takes.",
            ]} />

            <H3>Types of FIRE</H3>
            <BulletList items={[
              "Lean FIRE: Minimalist lifestyle. Lower expenses, smaller target corpus. Think &#8377;25,000-35,000/month in a tier-2 city.",
              "Fat FIRE: Comfortable lifestyle with no compromises. Higher corpus needed (&#8377;5+ crore). You can travel, dine out, and enjoy luxuries.",
              "Barista FIRE: You have enough invested to cover basic needs, but work a part-time or passion job for extra income and health insurance.",
              "Coast FIRE: You have invested enough that compounding alone will grow it to your full FIRE number by traditional retirement age. You just need to cover current expenses.",
            ]} />

            <H3>The Math of Early Retirement</H3>
            <Paragraph>
              The key insight: your years to FIRE depends almost entirely on your savings rate, not your income. At a 20% savings rate, you need about 37 years. At 50%, about 17 years. At 70%, about 8.5 years. This is why high earners who spend everything are no closer to freedom than moderate earners who save aggressively.
            </Paragraph>

            <H3>FIRE in India: Special Considerations</H3>
            <Paragraph>
              India actually has some advantages for FIRE: lower cost of living, strong family support systems, and access to domestic help. However, healthcare costs can be a wildcard, and inflation tends to be higher than in Western countries. Plan for 7-8% inflation on your expenses and make sure you have comprehensive health insurance.
            </Paragraph>

            <KeyTakeaway>
              FIRE is not about deprivation. It is about intentional spending, aggressive saving, and letting compound growth buy your freedom. Even if you do not retire early, working toward FIRE gives you financial security and the power to make life choices from a position of strength.
            </KeyTakeaway>

            <ProTip>
              You do not need to go all-in on FIRE. Even aiming for Coast FIRE is incredibly liberating. Knowing that your retirement is handled and you just need to cover today's bills removes enormous stress.
            </ProTip>
          </>
        ),
      },
    ],
  },
  {
    id: "tax-advanced",
    title: "Tax & Advanced Topics",
    icon: IconReceipt,
    gradient: "from-amber-500/80 to-rose-500/80",
    topics: [
      {
        id: "tax-saving",
        title: "Tax Saving Investments",
        icon: IconReceipt,
        difficulty: "Intermediate",
        readTime: "5 min read",
        description: "Section 80C, 80D, and other legal ways to reduce your tax bill significantly.",
        content: (
          <>
            <Paragraph>
              Tax planning is not tax evasion. It is using legal provisions to minimize your tax liability. The Indian tax code offers several deductions that can save you &#8377;50,000 to &#8377;1,50,000 or more in taxes every year. Most salaried employees leave money on the table because they do not know about these.
            </Paragraph>

            <H3>Section 80C (up to &#8377;1,50,000)</H3>
            <Paragraph>
              This is the big one. You can deduct up to &#8377;1,50,000 from your taxable income by investing in any combination of these instruments. The key is to choose instruments that also serve your financial goals, not just save tax.
            </Paragraph>
            <BulletList items={[
              "ELSS Mutual Funds: Best option for most people. Only 3-year lock-in (shortest among all 80C instruments), potential 12-15% returns, and you get equity market exposure. You can start SIPs in ELSS to spread the investment through the year instead of a lump sum in March.",
              "PPF (Public Provident Fund): 15-year lock-in with partial withdrawal from year 7. Currently 7.1% interest, fully tax-free (EEE status: exempt at investment, exempt on returns, exempt on withdrawal). Ideal for the conservative, long-term portion of your portfolio.",
              "EPF (Employee Provident Fund): Your 12% basic salary contribution automatically counts toward 80C. Most salaried people already exhaust a significant portion of their 80C limit through EPF alone. Check your payslip to see how much room is left.",
              "LIC / Life Insurance Premiums: Only premiums for term insurance policies are sensible here. Avoid endowment plans and money-back policies as investments; they deliver 4-5% returns while locking your money for decades.",
              "NSC (National Savings Certificate): 5-year lock-in, currently around 7.7% interest. Interest is taxable but gets reinvested and qualifies for 80C deduction in subsequent years. Suitable for conservative investors.",
              "ULIP (Unit Linked Insurance Plans): Combine insurance with investment. Generally not recommended due to high charges and complexity. ELSS + term insurance is almost always a better combination.",
              "Children's tuition fees: Tuition fees paid for up to 2 children at any school, college, or university in India qualify. This does not include development fees, donations, or hostel charges.",
              "Home Loan Principal Repayment: The principal component of your home loan EMI qualifies under 80C. If you are paying a home loan, this might already consume a large part of your 80C limit.",
              "5-Year Tax Saver FD: Guaranteed returns (currently 6-7%), but the interest earned is fully taxable at your slab rate. Use this only as a last resort if you have exhausted better options.",
              "Sukanya Samriddhi Yojana: For the girl child (up to age 10). Currently 8.2% interest, EEE status. Excellent if you have a daughter.",
            ]} />

            <H3>Section 80D (Health Insurance)</H3>
            <Paragraph>
              Health insurance premiums qualify for a separate deduction under Section 80D, over and above the 80C limit. This is one of the most underutilized deductions.
            </Paragraph>
            <BulletList items={[
              "&#8377;25,000 deduction for health insurance premium paid for self, spouse, and dependent children.",
              "Additional &#8377;25,000 for parents' health insurance. If your parents are senior citizens (age 60+), this limit increases to &#8377;50,000.",
              "If you are also a senior citizen, your own limit is &#8377;50,000 instead of &#8377;25,000.",
              "Maximum possible deduction: &#8377;1,00,000 (if both you and parents are senior citizens).",
              "Preventive health check-up expenses up to &#8377;5,000 are included within the overall 80D limit (not in addition to it).",
              "Even if your employer provides group health insurance, buying a personal policy gives you this tax benefit plus better coverage.",
            ]} />

            <H3>Section 80CCD(1B) -- NPS Extra Deduction</H3>
            <Paragraph>
              The National Pension System (NPS) offers an additional &#8377;50,000 deduction under Section 80CCD(1B), completely separate from the &#8377;1,50,000 limit of 80C. This makes NPS one of the most tax-efficient instruments available. Your NPS contributions under 80CCD(1) are part of the 80C limit, but this extra &#8377;50,000 is a bonus. For someone in the 30% tax bracket, this single deduction saves &#8377;15,600 in taxes (including cess). The trade-off is that NPS has a long lock-in until age 60, and 40% of the corpus must be used to purchase an annuity at retirement.
            </Paragraph>

            <H3>HRA Exemption (House Rent Allowance)</H3>
            <Paragraph>
              If you receive HRA as part of your salary and live in rented accommodation, you can claim an HRA exemption. The exempt amount is the lowest of these three values:
            </Paragraph>
            <BulletList items={[
              "Actual HRA received from your employer.",
              "Rent paid minus 10% of your basic salary.",
              "50% of basic salary if you live in a metro city (Delhi, Mumbai, Chennai, Kolkata), or 40% of basic salary for non-metro cities.",
            ]} />
            <Paragraph>
              Example: Basic salary &#8377;50,000, HRA received &#8377;20,000, rent paid &#8377;18,000, living in Bangalore (non-metro). The three values are: &#8377;20,000, &#8377;18,000 - &#8377;5,000 = &#8377;13,000, and &#8377;20,000 (40% of &#8377;50,000). The exemption is &#8377;13,000/month or &#8377;1,56,000/year. You must have rent receipts and your landlord's PAN if annual rent exceeds &#8377;1,00,000.
            </Paragraph>

            <H3>Section 80E -- Education Loan Interest</H3>
            <Paragraph>
              Interest paid on an education loan for higher studies (for yourself, spouse, or children) is fully deductible under Section 80E. There is no upper limit on the deduction amount, making this one of the most generous provisions in the tax code. The deduction is available for up to 8 years from the year you start repaying the loan, or until the interest is fully repaid, whichever is earlier. Only the interest component qualifies, not the principal repayment.
            </Paragraph>

            <H3>Section 80TTA -- Savings Account Interest</H3>
            <Paragraph>
              Interest earned on savings bank accounts (not FDs or RDs) is deductible up to &#8377;10,000 per year under Section 80TTA. This covers interest across all your savings accounts combined. For senior citizens, Section 80TTB provides a higher limit of &#8377;50,000 and includes FD interest as well. If your savings account interest exceeds the limit, the excess is taxable at your slab rate.
            </Paragraph>

            <H3>Section 24 -- Home Loan Interest</H3>
            <Paragraph>
              Interest paid on a home loan for a self-occupied property is deductible up to &#8377;2,00,000 per year under Section 24(b). This is separate from the 80C deduction on principal repayment, so a home loan gives you double tax benefits. For a let-out (rented) property, there is no limit on the interest deduction. Note that construction must be completed within 5 years from the end of the financial year in which the loan was taken, otherwise the limit drops to &#8377;30,000.
            </Paragraph>

            <H3>New Regime vs Old Regime</H3>
            <Paragraph>
              The new tax regime (default from FY 2023-24) offers lower slab rates but removes almost all deductions and exemptions. The old regime has higher slab rates but lets you claim 80C, 80D, HRA, Section 24, and other deductions.
            </Paragraph>
            <BulletList items={[
              "Choose the OLD regime if: Your total deductions (80C + 80D + HRA + NPS + home loan interest + others) exceed &#8377;3.75-4 lakh. The deductions more than compensate for the higher slab rates.",
              "Choose the NEW regime if: You have minimal deductions (no home loan, no HRA, low 80C usage). The lower slab rates and the higher standard deduction (&#8377;75,000) give you a better deal.",
              "Salaried employees can switch between regimes every year. Use an online tax calculator to compare both for your exact salary and deductions before choosing.",
              "If you are early in your career, living with parents, and have no home loan, the new regime is likely better. If you are paying rent, have a home loan, and max out 80C + 80D + NPS, the old regime often saves more.",
            ]} />

            <KeyTakeaway>
              Combine Section 80C (&#8377;1,50,000) + Section 80D (up to &#8377;1,00,000) + NPS 80CCD(1B) (&#8377;50,000) for a maximum deduction of &#8377;3,00,000 or more. For someone in the 30% bracket, that is over &#8377;93,000 saved in taxes every year. Add HRA and home loan interest, and you could be saving over &#8377;1.5 lakh annually. Plan at the start of the financial year (April), not in a January panic.
            </KeyTakeaway>

            <ProTip>
              ELSS has the shortest lock-in period (3 years) among all Section 80C instruments. Compare that with PPF (15 years), NSC (5 years), and tax-saver FDs (5 years). If you want liquidity along with tax savings, ELSS is the clear winner. Start a monthly SIP in an ELSS fund early in the financial year to avoid lump-sum investing in March.
            </ProTip>
          </>
        ),
      },
      {
        id: "xirr-cagr",
        title: "XIRR & CAGR",
        icon: IconCalculator,
        difficulty: "Advanced",
        readTime: "4 min read",
        description: "Measure your real investment returns accurately. Stop being fooled by absolute numbers.",
        content: (
          <>
            <Paragraph>
              When someone says "I made 50% return on my investment," the natural question should be: "In how many years?" Absolute returns can be misleading. CAGR and XIRR give you the annualized picture, making it easy to compare different investments.
            </Paragraph>

            <H3>Absolute Return</H3>
            <Paragraph>
              The simplest measure. If you invested &#8377;1,00,000 and it is now worth &#8377;1,50,000, your absolute return is 50%. But this is meaningless without knowing the time period. A 50% return in 1 year is incredible. In 10 years, it is mediocre (just 4.1% per year).
            </Paragraph>

            <H3>CAGR (Compound Annual Growth Rate)</H3>
            <Paragraph>
              CAGR converts your total return into a smooth, annualized rate. Formula: CAGR = (Ending Value / Beginning Value)^(1/years) - 1. If &#8377;1,00,000 grew to &#8377;3,00,000 in 10 years: CAGR = (3,00,000 / 1,00,000)^(1/10) - 1 = 11.6%. This means your investment grew at an equivalent of 11.6% every year, compounded.
            </Paragraph>
            <Paragraph>
              CAGR works perfectly for lump-sum investments with a single entry and exit point. But what about SIPs or multiple investments at different times?
            </Paragraph>

            <H3>XIRR (Extended Internal Rate of Return)</H3>
            <Paragraph>
              XIRR is the gold standard for measuring returns when you have multiple cash flows at different dates. It accounts for the exact timing and amount of every investment and withdrawal. This is the metric you should use for your SIP returns, stock portfolio, or any investment where you added or withdrew money at different times.
            </Paragraph>
            <Paragraph>
              Example: You invest &#8377;10,000 on Jan 1, &#8377;10,000 on Apr 1, &#8377;10,000 on Jul 1, and on Dec 31 your portfolio is worth &#8377;34,000. A simple calculation might say you made 13.3% (4,000 profit on 30,000 invested). But XIRR accounts for the fact that the first &#8377;10,000 was invested for 12 months while the last was only invested for 6 months. The actual XIRR might be 16-17%.
            </Paragraph>

            <H3>When to Use Which</H3>
            <BulletList items={[
              "Absolute Return: Quick sanity check. How much did I make in total?",
              "CAGR: Single lump-sum investment. How did my one-time FD or stock purchase perform annually?",
              "XIRR: Multiple investments over time. How are my SIPs actually performing? (This app calculates XIRR for you.)",
            ]} />

            <H3>Common Pitfalls</H3>
            <BulletList items={[
              "Do not compare CAGR of a 2-year investment with a 10-year one without context",
              "Annualized returns for periods under 1 year can be misleading (a 5% gain in 1 month is not guaranteed to be 60% annually)",
              "Always look at risk-adjusted returns: a 15% return with wild swings is different from a steady 12%",
            ]} />

            <KeyTakeaway>
              Use CAGR for lump-sum investments and XIRR for anything with multiple cash flows (SIPs, regular additions). Your real return is always the annualized, compounded one. This app automatically calculates XIRR for your mutual fund and stock investments.
            </KeyTakeaway>
          </>
        ),
      },
      {
        id: "asset-allocation",
        title: "Asset Allocation",
        icon: IconCash,
        difficulty: "Advanced",
        readTime: "5 min read",
        description: "How to divide your money across different asset classes for optimal risk-adjusted returns.",
        content: (
          <>
            <Paragraph>
              Asset allocation is deciding what percentage of your money goes into stocks, bonds, gold, real estate, and cash. It is the single biggest factor determining your portfolio's performance. Studies show that asset allocation explains over 90% of portfolio return variation, while individual stock or fund selection accounts for less than 10%.
            </Paragraph>

            <H3>The Age-Based Rule</H3>
            <Paragraph>
              A classic starting point is: Equity allocation = 100 minus your age. So a 25-year-old would have 75% in equity and 25% in debt. A 50-year-old would have 50-50. This is a rough guide, not a law. Some experts now suggest 110 or even 120 minus age, because people live longer and need growth for a longer retirement.
            </Paragraph>

            <H3>Core Asset Classes</H3>
            <BulletList items={[
              "Equity (Stocks / Equity Mutual Funds): The growth engine. Higher risk, higher return. Best for goals 5+ years away. Historically 12-15% CAGR in India.",
              "Debt (Bonds / FDs / PPF / Debt Funds): The stabilizer. Lower risk, predictable returns (6-8%). Best for goals 1-5 years away and for balancing portfolio risk.",
              "Gold (SGBs / Gold ETFs): The hedge. Gold tends to do well when stocks struggle. 5-10% allocation provides portfolio insurance. SGBs also pay 2.5% annual interest.",
              "Real Estate: Most Indians are over-allocated here because of property. If you already own a home, your real estate allocation might be 40-60% of your net worth. Account for this when deciding other allocations.",
              "Cash/Liquid: Emergency fund + short-term needs. Do not keep too much here as it loses value to inflation.",
            ]} />

            <H3>Sample Allocations</H3>
            <Paragraph>
              Aggressive (age 25-35): 70-80% equity, 10-15% debt, 5-10% gold. Balanced (age 35-50): 50-60% equity, 25-30% debt, 10% gold. Conservative (age 50+): 30-40% equity, 40-50% debt, 10% gold, 10% cash.
            </Paragraph>

            <H3>Rebalancing</H3>
            <Paragraph>
              Over time, your allocation drifts. If stocks have a great year, your 70% equity allocation might become 80%. Rebalancing means selling some equity and buying debt to return to your target. This forces you to sell high and buy low, which is exactly what smart investing looks like. Rebalance once or twice a year, or when any allocation drifts more than 5% from target.
            </Paragraph>

            <H3>International Diversification</H3>
            <Paragraph>
              Consider allocating 10-20% to US or global equity through international fund-of-funds. This provides currency diversification (if the rupee weakens, your international investments gain in INR terms) and exposure to global companies like Apple, Google, and Amazon that you cannot buy on Indian exchanges. Motilal Oswal S&P 500 Index Fund and Navi US Total Market Fund are popular options.
            </Paragraph>

            <KeyTakeaway>
              Asset allocation is more important than picking the right fund or stock. Start with an age-based rule, adjust for your risk tolerance and goals, include some gold for hedging, and rebalance annually. Keep it simple and stick to the plan through market ups and downs.
            </KeyTakeaway>

            <ProTip>
              Write down your target allocation and put it somewhere visible. When markets crash and everyone is panicking, your written plan will be the calm voice of reason telling you to rebalance and buy more equity at a discount.
            </ProTip>
          </>
        ),
      },
    ],
  },
]

/* ─── Total topic count ─── */

const ALL_TOPICS = SECTIONS.flatMap((s) => s.topics)
const TOTAL_TOPICS = ALL_TOPICS.length

/* ─── Section header gradient backgrounds ─── */

const sectionAccentBg: Record<string, string> = {
  "getting-started": "from-emerald-500/8 via-cyan-500/5 to-transparent",
  "market-instruments": "from-blue-500/8 via-violet-500/5 to-transparent",
  "financial-planning": "from-cyan-500/8 via-emerald-500/5 to-transparent",
  "tax-advanced": "from-amber-500/8 via-rose-500/5 to-transparent",
}

/* ─── Topic Card component ─── */

function TopicCard({
  topic,
  isRead,
  onToggle,
  isExpanded,
  onMarkComplete,
  isLast,
}: {
  topic: Topic
  isRead: boolean
  onToggle: () => void
  isExpanded: boolean
  onMarkComplete: () => void
  isLast: boolean
}) {
  return (
    <motion.div variants={fadeUpSmall}>
      <button
        onClick={onToggle}
        className={`
          group w-full text-left transition-all duration-200
          rounded-none px-4 py-4
          hover:bg-accent/50
          focus-visible:outline-none focus-visible:bg-accent/50
          ${isExpanded ? "bg-accent/30" : ""}
        `}
      >
        <div className="flex items-center gap-3.5">
          {/* Icon with difficulty color */}
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${difficultyIconBg(topic.difficulty)} transition-transform duration-200 group-hover:scale-105`}>
            <topic.icon className="h-4 w-4" />
          </div>

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`text-sm font-medium leading-tight truncate ${isRead ? "text-muted-foreground" : "text-foreground"}`}>
                {topic.title}
              </h3>
              {isRead && (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <IconCheck className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed">
              {topic.description}
            </p>
          </div>

          {/* Right side: badges + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${difficultyColor(topic.difficulty)}`}
            >
              {topic.difficulty}
            </span>
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
              <IconClock className="h-3 w-3" />
              {topic.readTime}
            </span>
            <div className={`text-muted-foreground/30 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              <IconChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </button>

      {/* Divider between items (not after last) */}
      {!isLast && !isExpanded && (
        <div className="mx-4 h-px bg-border/40" />
      )}

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5">
              <div className="rounded-xl bg-muted/30 border border-border/30 overflow-hidden">
                <div className="px-5 pb-6 pt-5">
                  {/* Mobile badges */}
                  <div className="flex items-center gap-2 mb-4 sm:hidden">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${difficultyColor(topic.difficulty)}`}>
                      {topic.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                      <IconClock className="h-3 w-3" />
                      {topic.readTime}
                    </span>
                  </div>

                  {/* Article content */}
                  <div className="prose-finance">
                    {topic.content}
                  </div>

                  {/* Mark as complete */}
                  <div className="mt-6 pt-4 border-t border-border/30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMarkComplete()
                      }}
                      className={`
                        inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200
                        ${isRead
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                          : "bg-primary/8 text-primary hover:bg-primary/12"
                        }
                      `}
                    >
                      <IconCheck className={`h-3.5 w-3.5 ${isRead ? "" : "opacity-50"}`} strokeWidth={2.5} />
                      {isRead ? "Completed" : "Mark as complete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider after expanded content (not after last) */}
            {!isLast && <div className="mx-4 h-px bg-border/40" />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Section component with collapsible behavior ─── */

function SectionBlock({
  section,
  readTopics,
  expandedTopics,
  onToggleTopic,
  onMarkComplete,
  defaultOpen,
}: {
  section: TopicSection
  readTopics: Set<string>
  expandedTopics: Set<string>
  onToggleTopic: (id: string) => void
  onMarkComplete: (id: string) => void
  defaultOpen: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const sectionReadCount = section.topics.filter((t) => readTopics.has(t.id)).length
  const sectionTotal = section.topics.length
  const sectionPercent = sectionTotal > 0 ? Math.round((sectionReadCount / sectionTotal) * 100) : 0

  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-3">
      {/* Section header — clickable to collapse/expand */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          group/section w-full text-left rounded-2xl p-4 transition-all duration-200
          bg-gradient-to-r ${sectionAccentBg[section.id] || "from-muted/30 to-transparent"}
          border border-border/40 hover:border-border/60
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        `}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${section.gradient} text-white shadow-sm shrink-0`}
          >
            <section.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {sectionPercent === 100 && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/25">
                  <IconCheck className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                {sectionReadCount} of {sectionTotal} completed
              </p>
              {/* Inline mini progress bar */}
              <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${section.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${sectionPercent}%` }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                {sectionPercent}%
              </span>
            </div>
          </div>
          <div className={`shrink-0 text-muted-foreground/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
            <IconChevronDown className="h-5 w-5" />
          </div>
        </div>
      </button>

      {/* Topic cards — collapsible, wrapped in a single card container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 card-elevated overflow-hidden">
              <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">
                {section.topics.map((topic, idx) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    isRead={readTopics.has(topic.id)}
                    isExpanded={expandedTopics.has(topic.id)}
                    onToggle={() => onToggleTopic(topic.id)}
                    onMarkComplete={() => onMarkComplete(topic.id)}
                    isLast={idx === section.topics.length - 1}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Main page component ─── */

export default function LearnPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [readTopics, setReadTopics] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  // Load progress from localStorage
  useEffect(() => {
    setReadTopics(loadProgress())
  }, [])

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, isLoading, router])

  // Toggle expand (no auto-mark-as-read)
  const toggleTopic = useCallback((id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Explicit mark as complete
  const markComplete = useCallback((id: string) => {
    setReadTopics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveProgress(next)
      return next
    })
  }, [])

  // Filter topics by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS
    const query = searchQuery.toLowerCase()
    return SECTIONS.map((section) => ({
      ...section,
      topics: section.topics.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.difficulty.toLowerCase().includes(query)
      ),
    })).filter((section) => section.topics.length > 0)
  }, [searchQuery])

  // Progress count
  const readCount = readTopics.size
  const progressPercent = TOTAL_TOPICS > 0 ? Math.round((readCount / TOTAL_TOPICS) * 100) : 0
  const motivational = getMotivationalCopy(progressPercent, readCount, TOTAL_TOPICS)
  const MotivIcon = motivational.icon

  if (isLoading || !isAuthenticated) return null

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Learn" subtitle="Master your financial knowledge" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-6"
            >
              {/* ─── Hero / Progress Section ─── */}
              <motion.div variants={fadeUp} className="relative">
                {/* Ambient glow behind the hero */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/10 via-cyan-500/8 to-emerald-500/10 blur-2xl opacity-50 pointer-events-none" />

                <div className="relative rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 card-elevated overflow-hidden">
                  {/* Decorative gradient strip at top */}
                  <div className="h-1 bg-gradient-to-r from-primary/60 via-cyan-500/60 to-emerald-500/60" />

                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
                    <svg width="100%" height="100%">
                      <pattern id="learn-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="1" fill="currentColor" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#learn-grid)" />
                    </svg>
                  </div>

                  <div className="relative p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                      {/* Left — Text content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/10">
                            <IconSchool className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                              Financial Academy
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {TOTAL_TOPICS} bite-sized lessons across {SECTIONS.length} modules
                            </p>
                          </div>
                        </div>

                        {/* Motivational copy */}
                        <motion.div
                          variants={fadeUpSmall}
                          className="flex items-center gap-2 mt-4 mb-5"
                        >
                          <MotivIcon className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {motivational.text}
                          </p>
                        </motion.div>

                        {/* Progress bar below text */}
                        <div className="max-w-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {readCount} of {TOTAL_TOPICS} topics completed
                            </span>
                            <span className="text-xs font-bold tabular-nums text-foreground">
                              {progressPercent}%
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-500 to-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right — Donut ring */}
                      <div className="shrink-0 self-center">
                        <div className="relative flex items-center justify-center h-28 w-28 md:h-32 md:w-32">
                          {/* Glow ring behind SVG */}
                          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-emerald-500/10 blur-md" />
                          <svg className="h-full w-full -rotate-90 relative" viewBox="0 0 100 100">
                            {/* Background track */}
                            <circle
                              cx="50" cy="50" r="40"
                              fill="none" stroke="currentColor" strokeWidth="6"
                              className="text-muted/30"
                            />
                            {/* Progress arc */}
                            <circle
                              cx="50" cy="50" r="40"
                              fill="none" strokeWidth="6"
                              stroke="url(#heroProgressGradient)"
                              strokeLinecap="round"
                              strokeDasharray={`${(progressPercent / 100) * 251.33} 251.33`}
                              className="transition-all duration-700 ease-out"
                            />
                            <defs>
                              <linearGradient id="heroProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="oklch(0.55 0.12 145)" />
                                <stop offset="50%" stopColor="rgb(6 182 212)" />
                                <stop offset="100%" stopColor="rgb(16 185 129)" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-2xl md:text-3xl font-extrabold tabular-nums text-foreground leading-none">
                              {progressPercent}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                              percent
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completion celebration */}
                    {readCount === TOTAL_TOPICS && TOTAL_TOPICS > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, ...spring.smooth }}
                        className="flex items-center gap-2.5 mt-5 pt-4 border-t border-border/40"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                          <IconTrophy className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          Congratulations! You have completed all topics. You are now financially literate.
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ─── Search bar ─── */}
              <motion.div variants={fadeUp} className="relative group/search">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative flex items-center rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm card-elevated transition-all duration-200 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/15">
                  <IconSearch className="ml-4 h-[18px] w-[18px] text-muted-foreground/50 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search topics... (e.g., SIP, tax, FIRE, mutual funds)"
                    className="h-12 flex-1 bg-transparent pl-3 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        searchRef.current?.focus()
                      }}
                      className="mr-3 flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* ─── Empty state ─── */}
            {filteredSections.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring.smooth}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-5">
                  {/* Decorative rings */}
                  <div className="absolute -inset-4 rounded-full border border-border/30 animate-pulse" />
                  <div className="absolute -inset-8 rounded-full border border-border/15" />
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 border border-border/40">
                    <IconSearch className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">No topics found</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  No results for &quot;{searchQuery}&quot;. Try a different keyword or browse all topics.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    searchRef.current?.focus()
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
                >
                  <IconX className="h-3.5 w-3.5" />
                  Clear search
                </button>
              </motion.div>
            )}

            {/* ─── Topic sections ─── */}
            <motion.div
              variants={staggerSlow}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5"
            >
              {filteredSections.map((section, sectionIdx) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  readTopics={readTopics}
                  expandedTopics={expandedTopics}
                  onToggleTopic={toggleTopic}
                  onMarkComplete={markComplete}
                  defaultOpen={!searchQuery ? true : true}
                />
              ))}
            </motion.div>

            {/* ─── Footer CTA ─── */}
            {filteredSections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.45 }}
                className="relative overflow-hidden"
              >
                {/* Ambient glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/8 via-orange-500/5 to-rose-500/8 blur-xl opacity-50 pointer-events-none" />

                <div className="relative rounded-2xl bg-card/80 backdrop-blur-sm border border-amber-500/15 card-elevated overflow-hidden">
                  {/* Top gradient accent */}
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                  <div className="p-6">
                    {/* Decorative sparkles */}
                    <div className="absolute top-4 right-5 text-amber-400/15">
                      <IconStar className="h-6 w-6" />
                    </div>
                    <div className="absolute top-10 right-14 text-amber-400/10">
                      <IconStar className="h-3.5 w-3.5" />
                    </div>
                    <div className="absolute bottom-5 right-8 text-amber-400/8">
                      <IconSparkles className="h-4 w-4" />
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/10">
                        <IconBookmark className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[15px] font-semibold text-foreground mb-1.5">
                          Knowledge is Your Best Investment
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          Warren Buffett spends 80% of his day reading. The more you understand about
                          money, the better decisions you will make. Come back to these topics whenever
                          you need a refresher. Your progress is saved automatically.
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium group/cta cursor-default">
                          <span>Keep learning</span>
                          <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
