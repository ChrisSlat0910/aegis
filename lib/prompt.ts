import { UserProfile } from './types';

export function buildAnalysisPrompt(profile: UserProfile, alreadyRetired: boolean = false): string {
  const yearsToRetirement = alreadyRetired ? 0 : profile.retirementAge - profile.currentAge;
  const annualBurn = profile.monthlyExpenseMillions * 12;
  const burnYears = (profile.targetFundMillions / annualBurn).toFixed(1);
  const retirementYear = alreadyRetired
    ? new Date().getFullYear()
    : new Date().getFullYear() + yearsToRetirement;
  const lifeExpectancy = profile.currentAge + 30;
  const withdrawalRate = ((annualBurn / profile.targetFundMillions) * 100).toFixed(1);

  const formatRupiah = (millions: number): string => {
    if (millions >= 1000000) return `Rp ${(millions / 1000000).toFixed(1)} Trillion`;
    if (millions >= 1000) return `Rp ${(millions / 1000).toFixed(1)} Billion`;
    return `Rp ${millions.toLocaleString('id-ID')} Million`;
  };

  const stocksAmount = profile.targetFundMillions * profile.allocation.stocks / 100;
  const bondsAmount = profile.targetFundMillions * profile.allocation.bonds / 100;
  const cashAmount = profile.targetFundMillions * profile.allocation.cash / 100;
  const cryptoAmount = profile.targetFundMillions * profile.allocation.crypto / 100;

  const retirementContext = alreadyRetired
    ? `- Status: ALREADY RETIRED — simulation starts now (${retirementYear})
- Current age: ${profile.currentAge} years old
- Simulation horizon: 30 years ahead (until age ${lifeExpectancy})`
    : `- Status: NOT YET RETIRED — will retire in ${yearsToRetirement} years
- Current age: ${profile.currentAge} | Retirement age: ${profile.retirementAge}
- Retirement starts: year ${retirementYear} | Simulation ends: age ${lifeExpectancy}`;

  const saranContext = alreadyRetired
    ? `Investor IS ALREADY RETIRED. overallVerdict must focus on:
- Current portfolio condition and short-term risks
- Concrete steps that can be taken NOW (rebalancing, reduce expenses, find passive income)
- Tone: no more accumulation time, prioritize protection and fund sustainability
- Avoid advice that requires long time horizons like "increase monthly savings"`
    : `Investor IS NOT YET RETIRED, still has ${yearsToRetirement} years of accumulation. overallVerdict must focus on:
- What can be improved BEFORE retirement
- Concrete steps: rebalance allocation, increase savings, reduce expense targets
- Tone: there is still time, here is what you can do now to strengthen your position
- Provide realistic hope, not just warnings`;

  const alternativeSolutionInstruction = alreadyRetired
    ? `- alternativeSolution: null (investor is already retired, not relevant)`
    : `- alternativeSolution: If there is at least 1 scenario with survivalYears < 30, calculate:
  * minimumFund: estimated minimum total fund in IDR format (Million/Billion/Trillion) to survive ALL scenarios with the same withdrawal rate of ${withdrawalRate}%
  * recommendedAllocation: more defensive portfolio composition for withdrawal rate ${withdrawalRate}% — total stocks+bonds+cash+crypto MUST = 100
  * explanation: 2-3 sentences in English explaining why that fund size and composition is safer
  If all scenarios survived (survivalYears >= 30), return null for this field`;

  return `You are a senior financial analyst at Aegis speaking directly to an Indonesian investor. Generate a Post-FIRE portfolio stress test report that is personal, realistic, and in English.

INVESTOR PORTFOLIO DATA:
${retirementContext}
- Allocation: Stocks ${profile.allocation.stocks}% (${formatRupiah(stocksAmount)}), Bonds ${profile.allocation.bonds}% (${formatRupiah(bondsAmount)}), Cash ${profile.allocation.cash}% (${formatRupiah(cashAmount)}), Crypto ${profile.allocation.crypto}% (${formatRupiah(cryptoAmount)})
- Total Fund: ${formatRupiah(profile.targetFundMillions)}
- Expenses: ${formatRupiah(profile.monthlyExpenseMillions)}/month (${formatRupiah(annualBurn)}/year)
- Withdrawal rate: ${withdrawalRate}% per year
- Without growth, fund lasts: ${burnYears} years

IMPORTANT INSTRUCTIONS:
1. All output MUST be in English
2. Always use "you" and "your portfolio" — speak directly to the investor
3. All scenarios MUST occur AFTER year ${retirementYear}
4. Minimum scenario year is ${retirementYear}, maximum ${retirementYear + 25}
5. Mention investor's age when scenario occurs (age = ${profile.currentAge} + (scenario year - ${retirementYear}))
6. Scenario names must be realistic and specific — inspired by historical crisis patterns but NOT copying exact names or years. Create scenarios that feel plausible based on current economic trends
7. Descriptions must read like a real analyst report — mention concrete figures in IDR format (Million/Billion/Trillion), realistic economic triggers, and gradual realistic impact
8. riskLevel must be exactly "high", "medium", or "low" (lowercase)
9. chartData: exactly 6 data points from year ${retirementYear} to ${retirementYear + 30}, fundValue MUST be in MILLION IDR units (example: Rp 5 Billion fund = 5000, NOT 5000000000)
10. survivalYears: which year (1-30) fund hits zero, or 30 if it survives
11. Create 3 DIFFERENT scenario types most relevant to this investor's specific allocation
12. portfolioNarrative: specific analysis in IDR format that is easy to understand, mention withdrawal rate ${withdrawalRate}% and its implications
13. safeWithdrawalRate: number in percent between 1.0 and 6.0, example: 3.5 NOT 0.035 and NOT 35
14. ${saranContext}
15. In descriptions and narratives, ALWAYS write monetary amounts in IDR format: Million, Billion, or Trillion
16. ${alternativeSolutionInstruction}
17. Return ONLY raw JSON, no markdown, no backticks

{"scenarios":[{"name":"string — realistic crisis name in English","year":"string — year ${retirementYear} or later","description":"string — 2-3 sentences in English like an analyst report, IDR amounts, mention investor age","probability":"Low|Medium|High","riskLevel":"high|medium|low","impact":{"stocks":number,"bonds":number,"cash":number,"crypto":number},"survivalYears":number,"survivalAmount":number,"chartData":[{"year":number,"fundValue":number}],"verdict":"string — one honest blunt sentence in English"}],"portfolioNarrative":"string — 2-3 sentences in English with correct IDR format","overallVerdict":"string — 2-3 sentences in English, start with Aegis recommends...","safeWithdrawalRate":number between 1.0-6.0,"alternativeSolution":null or {"minimumFund":"string IDR format","recommendedAllocation":{"stocks":number,"bonds":number,"cash":number,"crypto":number},"explanation":"string in English"}}`;
}