'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import type { UserProfile, AnalysisResult } from '@/lib/types';

interface AegisStressTestProps {
  onRunTest: (profile: UserProfile, alreadyRetired: boolean) => Promise<AnalysisResult>;
}

export default function AegisStressTest({ onRunTest }: AegisStressTestProps) {
  const [allocation, setAllocation] = useState({
    stocks: 60,
    bonds: 25,
    cash: 10,
    crypto: 5
  });

  const [targetFund, setTargetFund] = useState("5000000000");
  const [monthlyExpense, setMonthlyExpense] = useState("20000000");
  const [currentAge, setCurrentAge] = useState("30");
  const [retirementAge, setRetirementAge] = useState("45");

  const [touched, setTouched] = useState({
    targetFund: false,
    monthlyExpense: false,
    currentAge: false,
    retirementAge: false,
  });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorData, setErrorData] = useState<{title: string, message: string} | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [alreadyRetired, setAlreadyRetired] = useState(false);

  const totalAllocation = allocation.stocks + allocation.bonds + allocation.cash + allocation.crypto;
  const isValidAllocation = totalAllocation === 100;

  const formatNumberId = (val: string) => {
    if (!val) return '';
    return parseInt(val, 10).toLocaleString('id-ID');
  };

  const getHumanReadable = (val: string) => {
    const num = parseInt(val, 10);
    if (!num || isNaN(num)) return '';
    if (num >= 1000000000) return `= Rp ${(num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Billion`;
    if (num >= 1000000) return `= Rp ${(num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Million`;
    if (num >= 1000) return `= Rp ${(num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Thousand`;
    return `= Rp ${num.toLocaleString('id-ID')}`;
};

  const handleSliderChange = (asset: keyof typeof allocation, value: string) => {
    setAllocation(prev => ({ ...prev, [asset]: parseInt(value) || 0 }));
  };

  const cAge = parseInt(currentAge) || 0;
  const rAge = parseInt(retirementAge) || 0;
  const tFund = parseInt(targetFund) || 0;
  const mExpense = parseInt(monthlyExpense) || 0;

  let currentAgeError = '';
  if (!currentAge) currentAgeError = 'Masukkan usia yang valid (17-80)';
  else if (cAge < 17 || cAge > 80) currentAgeError = 'Masukkan usia yang valid (17-80)';

  let retirementAgeError = '';
  if (!alreadyRetired) {
    if (!retirementAge) retirementAgeError = 'Masukkan usia yang valid (18-100)';
    else if (rAge < 18 || rAge > 100) retirementAgeError = 'Masukkan usia yang valid (18-100)';
    else if (rAge <= cAge) retirementAgeError = 'Usia pensiun harus lebih besar dari usia sekarang';
  }

  let targetFundError = '';
  if (!targetFund || tFund <= 0) targetFundError = 'Masukkan jumlah dana pensiun';

  let monthlyExpenseError = '';
  if (!monthlyExpense || mExpense <= 0) monthlyExpenseError = 'Masukkan pengeluaran bulanan';
  else if (tFund > 0 && mExpense > Math.floor(tFund / 12)) monthlyExpenseError = 'Pengeluaran terlalu besar dibanding dana yang dimiliki';

  const isFormValid = isValidAllocation && !currentAgeError && !retirementAgeError && !targetFundError && !monthlyExpenseError;

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleRunTest = async () => {
    setAttemptedSubmit(true);
    if (!isFormValid) return;
    setStatus('loading');
    setErrorData(null);
    try {
      const profile: UserProfile = {
        allocation,
        targetFundMillions: (parseFloat(targetFund) || 0) / 1000000,
        monthlyExpenseMillions: (parseFloat(monthlyExpense) || 0) / 1000000,
        currentAge: parseInt(currentAge) || 0,
        retirementAge: alreadyRetired ? parseInt(currentAge) || 0 : parseInt(retirementAge) || 0,
      };
      const res = await Promise.race([
        onRunTest(profile, alreadyRetired),
        new Promise<AnalysisResult>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 120000)
        )
      ]);
      setResult(res);
      setStatus('success');
    } catch (err: unknown) {
      const error = err as Error;
      let title = "An Error Occurred";
      let message = "Something didn't work as expected. Please try again.";
      const msg = error.message || "";
      if (msg === 'NETWORK_ERROR') { title = "Connection Issue"; message = "Check your internet connection and try again."; }
      else if (msg === 'RATE_LIMIT') { title = "Too Many Requests"; message = "Please wait a moment before trying again."; }
      else if (msg === 'SERVER_ERROR') { title = "Aegis is Busy"; message = "A server error occurred. Try again in a few seconds."; }
      else if (msg === 'INVALID_RESPONSE') { title = "Failed to Process Results"; message = "Aegis could not process the results. Please try again."; }
      else if (msg === 'TIMEOUT_ERROR') { title = "Analysis Taking Too Long"; message = "Aegis is taking longer than usual. Try again."; }
      else if (msg === 'INCOMPLETE_RESPONSE') { title = "Incomplete Results"; message = "Aegis only analyzed some scenarios. Try again for complete results."; }
      setErrorData({ title, message });
      setStatus('error');
    }
  };

  const statusProgressSteps = [
    "Reading your portfolio profile...",
    "Generating crisis scenarios...",
    "Preparing recommendations for you..."
  ];

  useEffect(() => {
    if (status === 'loading') {
      const timer1 = setTimeout(() => setLoadingStep(1), 2000);
      const timer2 = setTimeout(() => setLoadingStep(2), 4000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); setLoadingStep(0); };
    }
  }, [status]);

  const riskStyles = {
    high: { border: 'border-l-red-700', text: 'text-red-700', label: 'High Risk' },
    medium: { border: 'border-l-amber-600', text: 'text-amber-600', label: 'Medium Risk' },
    low: { border: 'border-l-emerald-600', text: 'text-emerald-600', label: 'Low Risk' }
  };

  const survivedCount = result ? result.scenarios.filter(s => s.survivalYears >= 30).length : 0;
  const worstScenario = result ? [...result.scenarios].sort((a, b) => a.survivalYears - b.survivalYears)[0] : null;
  const bestScenario = result ? [...result.scenarios].sort((a, b) => b.survivalYears - a.survivalYears)[0] : null;
  const truncate = (str: string, n: number) => str.length > n ? str.slice(0, n - 1) + '…' : str;
  const worstYears = worstScenario?.survivalYears ?? 0;
  const bestYears = bestScenario?.survivalYears ?? 0;
  const yearsToRetirement = rAge - cAge;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const formatted = value >= 1000000 
  ? `Rp ${(value/1000000).toFixed(2)} Triliun`
  : value >= 1000
  ? `Rp ${(value/1000).toFixed(2)} Miliar`
  : `Rp ${value.toLocaleString('id-ID')} Juta`;
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
          <p className="text-slate-400 mb-1">Year {label}</p>
          <p className="text-white font-semibold">{formatted}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900 pb-16">
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Aegis" width={32} height={32} />
          <span className="font-bold text-2xl text-[#4338CA] tracking-tight">Aegis</span>
        </div>
        <div className="text-sm text-slate-600">AI Financial Stress Testing</div>
      </nav>



      <section className="bg-[#F9FAFB] pt-12 pb-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col-reverse md:flex-row items-center gap-6 md:gap-8">

          {/* Left — Narasi */}
          <div className="flex-1 text-center md:text-left">
            <div className="text-xs font-medium tracking-widest text-[#0F766E] mb-4">FOR INDONESIAN INVESTORS</div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-5">
              Know your risks<br className="hidden md:block" /> before it&apos;s too late.
            </h1>
            <p className="text-lg text-slate-500 max-w-[480px] mb-8 mx-auto md:mx-0">
              Tell us about your portfolio. Aegis will show what could happen and what you should prepare for.
            </p>
            <div className="bg-white border border-[#E5E7EB] py-4 px-6 rounded-2xl shadow-sm text-left flex gap-4 items-start max-w-[480px] mx-auto md:mx-0">
              <span className="text-2xl mt-0.5">💡</span>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Post-FIRE Simulation</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Aegis simulates whether your funds will survive various crisis scenarios after you stop working — early or normal retirement.
                </p>
              </div>
            </div>
          </div>

          {/* Right — Mascot */}
          <div className="shrink-0 flex justify-center">
            <Image
              src="/Athena_1.png"
              alt="Aegis mascot — Athena guarding your retirement"
              width={380}
              height={380}
              className="drop-shadow-xl"
              priority
            />
          </div>

        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl shadow-md p-6 lg:p-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-2xl text-slate-900">Portfolio Profile</h2>
              {isValidAllocation ? (
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">✓ 100%</div>
              ) : (
                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">⚠ {totalAllocation}%</div>
              )}
            </div>

            <div className="h-1 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div className={`h-full transition-all duration-300 ${isValidAllocation ? 'bg-[#4338CA]' : 'bg-amber-500'}`} style={{ width: `${Math.min(totalAllocation, 100)}%` }} />
            </div>

            <div className="mb-6">
              <div className="text-xs font-semibold tracking-widest text-slate-600 mb-1">ASSET ALLOCATION</div>
              <div className="text-xs text-slate-500 mb-3">Adjust sliders to set percentage per asset. Total must equal 100%.</div>
              <div className="space-y-4">
                {(Object.keys(allocation) as Array<keyof typeof allocation>).map((asset) => (
                  <div key={asset}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="capitalize text-sm font-medium text-slate-700">
                          {asset === 'stocks' ? 'Stocks' : asset === 'bonds' ? 'Bonds' : asset === 'cash' ? 'Cash' : 'Crypto'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {asset === 'stocks' ? 'High potential, volatile.' : asset === 'bonds' ? 'Medium risk, relatively stable.' : asset === 'cash' ? 'Low risk, safe, low return.' : 'Highly volatile, high risk to principal.'}
                        </div>
                      </div>
                      <span className="bg-[#EEF2FF] text-[#4338CA] px-2 py-0.5 rounded-full text-sm font-mono font-medium">{allocation[asset]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={allocation[asset]} onChange={(e) => handleSliderChange(asset, e.target.value)} className="w-full accent-[#4338CA] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 mb-6" />

            <div className="mb-6">
              <div className="text-xs font-semibold tracking-widest text-slate-600 mb-1">TARGET & METRICS</div>
              <div className="text-xs text-slate-500 mb-4">Enter your financial targets and retirement age information.</div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <input
                  type="checkbox"
                  id="alreadyRetired"
                  checked={alreadyRetired}
                  onChange={(e) => setAlreadyRetired(e.target.checked)}
                  className="w-4 h-4 accent-[#4338CA] cursor-pointer shrink-0"
                />
                <label htmlFor="alreadyRetired" className="text-sm text-slate-600 cursor-pointer select-none leading-snug">
                  I am already retired — simulation will start from now
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Total funds at retirement start (Rp)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-mono text-sm">Rp</span>
                    </div>
                    <input type="text" onBlur={() => handleBlur('targetFund')} value={formatNumberId(targetFund)} onChange={e => setTargetFund(e.target.value.replace(/[^0-9]/g, ''))} placeholder="5.000.000.000" className={`w-full bg-slate-50 border ${(touched.targetFund || attemptedSubmit) && targetFundError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-lg pl-12 pr-4 py-3 focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] outline-none font-mono transition-colors`} />
                  </div>
                  {targetFund && !((touched.targetFund || attemptedSubmit) && targetFundError) && <div className="text-[11px] text-[#0F766E] font-medium mt-1.5 pl-1">{getHumanReadable(targetFund)}</div>}
                  {(touched.targetFund || attemptedSubmit) && targetFundError && <div className="text-sm text-red-500 mt-1 pl-1">{targetFundError}</div>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Expenses (Rp)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-mono text-sm">Rp</span>
                    </div>
                    <input type="text" onBlur={() => handleBlur('monthlyExpense')} value={formatNumberId(monthlyExpense)} onChange={e => setMonthlyExpense(e.target.value.replace(/[^0-9]/g, ''))} placeholder="20.000.000" className={`w-full bg-slate-50 border ${(touched.monthlyExpense || attemptedSubmit) && monthlyExpenseError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-lg pl-12 pr-4 py-3 focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] outline-none font-mono transition-colors`} />
                  </div>
                  {monthlyExpense && !((touched.monthlyExpense || attemptedSubmit) && monthlyExpenseError) && <div className="text-[11px] text-[#0F766E] font-medium mt-1.5 pl-1">{getHumanReadable(monthlyExpense)}</div>}
                  {(touched.monthlyExpense || attemptedSubmit) && monthlyExpenseError && <div className="text-sm text-red-500 mt-1 pl-1">{monthlyExpenseError}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Current Age</label>
                  <input type="text" onBlur={() => handleBlur('currentAge')} value={currentAge} onChange={e => setCurrentAge(e.target.value.replace(/[^0-9]/g, ''))} placeholder="30" className={`w-full bg-slate-50 border ${(touched.currentAge || attemptedSubmit) && currentAgeError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-lg px-4 py-3 focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] outline-none font-mono transition-colors`} />
                  {(touched.currentAge || attemptedSubmit) && currentAgeError && <div className="text-sm text-red-500 mt-1 pl-1">{currentAgeError}</div>}
                </div>
                {!alreadyRetired && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Retirement Age</label>
                  <input type="text" onBlur={() => handleBlur('retirementAge')} value={retirementAge} onChange={e => setRetirementAge(e.target.value.replace(/[^0-9]/g, ''))} placeholder="45" className={`w-full bg-slate-50 border ${(touched.retirementAge || attemptedSubmit) && retirementAgeError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-lg px-4 py-3 focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] outline-none font-mono transition-colors`} />
                  {(touched.retirementAge || attemptedSubmit) && retirementAgeError && <div className="text-sm text-red-500 mt-1 pl-1">{retirementAgeError}</div>}
                </div>
                )}
              </div>
            </div>

            <button onClick={handleRunTest} disabled={status === 'loading'} className={`w-full rounded-xl py-3.5 font-bold text-center transition-colors duration-200 ${!isFormValid || status === 'loading' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#4338CA] text-white hover:bg-indigo-700'}`}>
              ⚡ Analyze My Portfolio →
            </button>
            <div className="text-center mt-3 text-xs text-slate-500 font-medium">
              Aegis will generate 3 crisis simulations in ~15 seconds
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 pb-12 w-full lg:mt-0">
          {status === 'error' && (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center py-20 px-4">
              <div className="w-full max-w-sm bg-red-50 rounded-2xl border border-red-200 p-6 flex flex-col items-center text-center shadow-sm">
                <span className="text-2xl mb-3">⚠️</span>
                <h3 className="text-base font-semibold text-red-700 mb-1">{errorData?.title}</h3>
                <p className="text-sm text-red-500 mb-6 leading-relaxed">{errorData?.message}</p>
                <button onClick={handleRunTest} className="px-5 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors duration-200">
                  Try Again
                </button>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <div className="w-full border-2 border-dashed border-slate-200 bg-white/50 rounded-4xl flex flex-col items-center justify-center text-center py-20 px-8">
              <div className="text-6xl mb-6 opacity-30 text-slate-300">🛡️</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-3">Analysis results will appear here</h3>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                Aegis is ready to test your portfolio against inflation scenarios, market downturns, and worst-case conditions.
                <br /><br />
                Complete your portfolio profile on the left and click Analyze to begin.
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-[#4338CA] animate-spin mb-6" />
              <h3 className="text-base font-medium text-slate-600 mb-4">Aegis is analyzing your portfolio...</h3>
              <div className="h-6">
                <AnimatePresence mode="wait">
                  <motion.div key={loadingStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm text-slate-400">
                    {statusProgressSteps[loadingStep]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              <div className="bg-[#F8F9FF] rounded-2xl shadow-sm p-6 border-l-4 border-[#4338CA] mb-8">
                <div className="text-xs tracking-widest font-semibold text-indigo-600 mb-2">YOUR PORTFOLIO ANALYSIS</div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Here&apos;s your current portfolio condition</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {result.portfolioNarrative}
                </p>
              </div>

              {(() => {
                const tFundMillions = tFund / 1000000;
                const mExpenseMillions = mExpense / 1000000;
                const simulasiRunway = mExpenseMillions > 0 ? (tFundMillions / (mExpenseMillions * 12)).toFixed(1) : '0';
                const withdrawalRate = tFundMillions > 0 ? ((mExpenseMillions * 12 / tFundMillions) * 100).toFixed(1) : '0';
                const withdrawalRateNum = parseFloat(withdrawalRate);
                const wrColor = withdrawalRateNum < 4 ? 'text-emerald-600' : withdrawalRateNum <= 6 ? 'text-amber-600' : 'text-red-600';
                const retirementYear = new Date().getFullYear() + (rAge - cAge);

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                    <div className="flex justify-between items-center">
                      <span className="text-xs tracking-widest font-semibold text-slate-600">SIMULATION BASIS</span>
                      <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">Post-FIRE</span>
                    </div>
                    <div className="border-b border-slate-100 my-3"></div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {!alreadyRetired && (
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Remaining Accumulation Time</div>
                        <div className={`text-sm font-semibold ${yearsToRetirement > 10 ? 'text-emerald-600' : yearsToRetirement >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{yearsToRetirement} years remaining</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {yearsToRetirement > 10
                            ? 'Still time to optimize your portfolio'
                            : yearsToRetirement >= 5
                            ? 'Evaluate your portfolio strategy soon'
                            : 'Very limited time, prioritize conservative approach'}
                        </div>
                      </div>
                      )}
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Simulation Start</div>
                        <div className="text-sm font-semibold text-slate-800">
                          {alreadyRetired
                            ? `${new Date().getFullYear()} (starting now, age ${currentAge})`
                            : `${retirementYear} (age ${retirementAge})`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Simulation Horizon</div>
                        <div className="text-sm font-semibold text-slate-800">30 years (until age {rAge + 30})</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Initial Retirement Fund</div>
                        <div className="text-sm font-semibold text-slate-800">{getHumanReadable(targetFund).replace('= ', '')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Monthly Expenses</div>
                        <div className="text-sm font-semibold text-slate-800">{getHumanReadable(monthlyExpense).replace('= ', '')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Runway Without Crisis &amp; Return</div>
                        <div className="text-sm font-semibold text-slate-800">{simulasiRunway} years</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">assumption: no investment return &amp; inflation</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Annual Withdrawal Rate</div>
                        <div className={`text-sm font-semibold ${wrColor}`}>{withdrawalRate}%</div>
                      </div>
                    </div>

                    <div className="border-b border-slate-100 mt-4 mb-3"></div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      ⚠ This simulation does not account for investment returns, inflation, or passive income. Results are AI-generated crisis scenario estimates.
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="text-xs tracking-wide text-slate-400 uppercase mb-2">FUND RESILIENCE LEVEL</div>
                    <div className={`text-2xl lg:text-3xl font-black font-mono mb-1 ${survivedCount >= 2 ? 'text-[#059669]' : survivedCount === 1 ? 'text-amber-500' : 'text-[#B91C1C]'}`}>
                      {survivedCount >= 2 ? 'Fund Safe' : survivedCount === 1 ? 'Needs Attention' : 'Vulnerable'}
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{survivedCount} out of 3 scenarios</div>
                    <div className="text-xs text-slate-400 mt-0.5">scenarios where fund survives 30 years</div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                    <div className={`h-full ${survivedCount >= 2 ? 'bg-[#059669]' : survivedCount === 1 ? 'bg-amber-500' : 'bg-[#B91C1C]'}`} style={{ width: `${(survivedCount / 3) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="text-xs tracking-wide text-slate-400 uppercase mb-2">WORST: {worstScenario ? truncate(worstScenario.name, 20) : ''}</div>
                    <div className={`text-2xl lg:text-3xl font-black font-mono ${worstYears < 30 ? 'text-[#B91C1C]' : 'text-[#059669]'}`}>
                      {worstYears < 30 ? `Depleted at year ${worstYears}` : 'Survived 30 years'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{worstScenario?.name}</div>
                  </div>
                  <div className="mt-4">
                    {worstScenario && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border-l-2 bg-slate-50 ${riskStyles[worstScenario.riskLevel].border} ${riskStyles[worstScenario.riskLevel].text}`}>
                        {riskStyles[worstScenario.riskLevel].label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="text-xs tracking-wide text-slate-400 uppercase mb-2">BEST: {bestScenario ? truncate(bestScenario.name, 20) : ''}</div>
                    <div className={`text-2xl lg:text-3xl font-black font-mono ${bestYears >= 30 ? 'text-[#059669]' : 'text-amber-500'}`}>
                      {bestYears >= 30 ? `Survived ${bestYears} years` : `Depleted at year ${bestYears}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{bestScenario?.name}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-1">What might happen</h2>
                <div className="text-sm text-slate-400">3 crisis scenarios most relevant to your portfolio profile</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 items-start">
                <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">SIMULATION DISCLAIMER</p>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    The scenarios below are hypothetical simulations generated by AI based on historical crisis patterns. This is <strong>not a prediction of the future</strong> and <strong>not professional investment advice</strong>. Use as educational material and consideration, not as the sole basis for financial decisions.
                  </p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                {result.scenarios.map((scenario, idx) => {
                  const sRisk = riskStyles[scenario.riskLevel] || riskStyles.medium;
                  const survived = scenario.survivalYears >= 30;
                  return (
                    <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.15 }} className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border border-slate-100 border-l-4 ${sRisk.border}`}>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg pr-4 leading-tight">{scenario.name}</h3>
                        <div className="bg-slate-100 text-slate-600 rounded whitespace-nowrap font-mono text-xs px-2 py-1 shrink-0">{scenario.year}</div>
                      </div>
                      <div className={`text-xs font-medium mb-3 ${sRisk.text}`}>{sRisk.label}</div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-6">{scenario.description}</p>
                      <div className="text-[10px] text-slate-500 mb-1 text-right">in Million IDR</div>
                      <div className="bg-slate-900 rounded-xl p-4 mb-6 h-[180px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <AreaChart data={scenario.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis
                              dataKey="year"
                              tick={{ fontSize: 10, fill: '#94A3B8' }}
                              tickLine={false}
                              axisLine={false}
                              tickCount={6}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#94A3B8' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => {
  if (value >= 1000000) return `${(value/1000000).toFixed(1)}T`;
  if (value >= 1000) return `${(value/1000).toFixed(1)}M`;
  if (value >= 1) return `${value.toFixed(0)}`;
  return `${value}`;
}}
                              width={45}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {!survived && (
                              <ReferenceLine
                                y={0}
                                stroke="#EF4444"
                                strokeDasharray="4 4"
                                label={{ value: 'Fund Depleted', position: 'insideBottomRight', fontSize: 9, fill: '#EF4444' }}
                              />
                            )}
                            <Area
                              type="monotone"
                              dataKey="fundValue"
                              stroke={survived ? '#059669' : '#B91C1C'}
                              fill={survived ? '#059669' : '#B91C1C'}
                              fillOpacity={survived ? 0.2 : 0.4}
                              strokeWidth={2}
                              isAnimationActive={false}
                              dot={{ r: 3, fill: survived ? '#059669' : '#B91C1C' }}
                              activeDot={{ r: 5 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Status:</span>
                          <span className={`font-medium text-sm ${survived ? 'text-[#059669]' : 'text-[#B91C1C]'}`}>{survived ? '✓ Fund Safe' : '⚠ Fund Depleted'}</span>
                        </div>
                        <div className="text-xs text-slate-600 font-mono">{survived ? `Survived ${scenario.survivalYears} years` : `Depleted at year ${scenario.survivalYears}`}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="bg-[#EEF2FF] border-l-4 border-[#4338CA] rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🛡️</span>
                  <h3 className="font-semibold text-indigo-900 text-lg">Aegis Recommendation</h3>
                </div>
                <div className="text-xs text-indigo-600 mb-6">Based on your portfolio analysis</div>
                <p className="text-base text-slate-700 leading-relaxed mb-6 whitespace-pre-wrap">{result.overallVerdict}</p>
                <div className="h-px bg-indigo-200/50 w-full mb-6" />
                <div>
                  <div className="text-sm text-slate-700 uppercase tracking-wide font-medium mb-1">RECOMMENDED SAFE WITHDRAWAL RATE:</div>
                  <div className="text-4xl font-black font-mono text-indigo-700 mb-1">{result.safeWithdrawalRate}%</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Safe percentage to withdraw annually from your portfolio.
                  </div>
                  <div className="text-xs text-emerald-700 font-medium mt-1 bg-emerald-50 rounded-lg px-3 py-2">
                    💡 With a fund of {getHumanReadable(targetFund).replace('= ', '')}, SWR {result.safeWithdrawalRate}% means you can withdraw a maximum of{' '}
                    Rp {((parseInt(targetFund) * result.safeWithdrawalRate / 100) / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Million per year{' '}
                    or Rp {((parseInt(targetFund) * result.safeWithdrawalRate / 100) / 12000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Million per month{' '}
                    with low risk of running out of funds.
                  </div>
                </div>
              </motion.div>

              {!alreadyRetired && result.alternativeSolution != null && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="bg-[#F0FDF9] border-l-4 border-[#0F766E] rounded-2xl p-8 mt-6"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🎯</span>
                    <h3 className="font-semibold text-teal-900 text-lg">If You Still Want the Same Withdrawal Rate</h3>
                  </div>
                  <div className="text-xs text-teal-500 mb-6">Here&apos;s what you need to survive all scenarios above</div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="text-xs tracking-wide text-slate-500 uppercase mb-2">MINIMUM RETIREMENT FUND</div>
                      <div className="text-3xl font-black font-mono text-teal-700">{result.alternativeSolution.minimumFund}</div>
                      <div className="text-xs text-slate-500 mt-1">funds needed to survive all scenarios</div>
                    </div>
                    <div>
                      <div className="text-xs tracking-wide text-slate-500 uppercase mb-2">RECOMMENDED PORTFOLIO ALLOCATION</div>
                      {Object.entries(result.alternativeSolution.recommendedAllocation).map(([key, val]) => (
                        <div key={key} className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-slate-600">
                              {key === 'stocks' ? 'Stocks' : key === 'bonds' ? 'Bonds' : key === 'cash' ? 'Cash' : 'Crypto'}
                            </span>
                            <span className="font-mono text-teal-600 font-bold">{val}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0F766E]" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-teal-100 w-full mb-4" />
                  <p className="text-sm text-slate-600 leading-relaxed">{result.alternativeSolution.explanation}</p>
                </motion.div>
              )}

            </motion.div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 mt-8 py-8 text-center px-6">
        <p className="text-sm font-semibold text-slate-600 mb-1">
          Aegis · AI Financial Stress Testing · For Indonesian Investors
        </p>
        <p className="text-xs text-slate-400">
          Simulation results are educational and not professional investment advice.
        </p>
      </footer>
    </div>
  );
}