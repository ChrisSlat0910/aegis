export interface AssetAllocation {
  stocks: number;
  bonds: number;
  cash: number;
  crypto: number;
}

export interface UserProfile {
  allocation: AssetAllocation;
  targetFundMillions: number;
  currentAge: number;
  retirementAge: number;
  monthlyExpenseMillions: number;
}

export interface CrisisScenario {
  name: string;
  year: string;
  description: string;
  probability: string;
  riskLevel: 'high' | 'medium' | 'low';
  impact: {
    stocks: number;
    bonds: number;
    cash: number;
    crypto: number;
  };
  survivalYears: number;
  survivalAmount: number;
  chartData: Array<{
    year: number;
    fundValue: number;
  }>;
  verdict: string;
}

export interface AlternativeSolution {
  minimumFund: string;
  recommendedAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
    crypto: number;
  };
  explanation: string;
}

export interface AnalysisResult {
  scenarios: CrisisScenario[];
  portfolioNarrative: string;
  overallVerdict: string;
  safeWithdrawalRate: number;
  alternativeSolution: AlternativeSolution | null;
}