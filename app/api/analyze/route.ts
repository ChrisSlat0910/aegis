import { NextRequest, NextResponse } from 'next/server';
import { buildAnalysisPrompt } from '@/lib/prompt';
import { UserProfile, AnalysisResult } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemma-4-31b-it',
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-3-4b-it',
];

async function generateWithFallback(prompt: string): Promise<string> {
  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying ${modelName}, attempt ${attempt}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        console.log(`Success with ${modelName}`);
        return result.response.text();
      } catch (error: unknown) {
        const err = error as { status?: number };
        const isRetryable = err.status === 503 || err.status === 429;
        if (isRetryable && attempt < 2) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        console.log(`${modelName} attempt ${attempt} failed, status: ${err.status}`);
        break;
      }
    }
  }
  throw new Error('All models unavailable');
}

export async function POST(request: NextRequest) {
  try {
    const { profile: body, alreadyRetired = false } = await request.json();

    const totalAllocation =
      body.allocation.stocks +
      body.allocation.bonds +
      body.allocation.cash +
      body.allocation.crypto;

    if (Math.abs(totalAllocation - 100) > 1) {
      return NextResponse.json(
        { error: 'Asset allocation must sum to 100%' },
        { status: 400 }
      );
    }

    const prompt = buildAnalysisPrompt(body as UserProfile, alreadyRetired as boolean);
    const rawText = await generateWithFallback(prompt);

    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const result: AnalysisResult = JSON.parse(cleaned);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}