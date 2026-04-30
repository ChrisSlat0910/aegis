'use client';
import AegisStressTest from '@/components/AegisStressTest';
import { UserProfile, AnalysisResult } from '@/lib/types';

export default function Home() {
  async function handleRunTest(profile: UserProfile, alreadyRetired: boolean): Promise<AnalysisResult> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, alreadyRetired }),
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  }

  return <AegisStressTest onRunTest={handleRunTest} />;
}