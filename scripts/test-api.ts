#!/usr/bin/env tsx

// Load environment variables FIRST before any imports (same as add-principle.ts)
import dotenv from 'dotenv';
dotenv.config();

import { OpenAIService } from '../lib/openai';

async function testAPI() {
  console.log('🔍 Testing the exact same flow as add-principle script\n');

  try {
    console.log('Environment check:');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('Key preview:', process.env.OPENAI_API_KEY?.slice(0, 20) + '...');

    console.log('\n🤖 Testing generateCompletion (principle creation)...');

    const testPrompt = `You are an expert UX designer and educator. Create a comprehensive UX principle entry based on this input: "Fitts Law"

Please provide a detailed response in the following JSON format:
{
  "title": "Official Principle Name",
  "type": "ux_law",
  "oneLiner": "One sentence summary (max 100 chars)",
  "definition": "Clear 2-3 sentence definition explaining what it is"
}`;

    const completion = await OpenAIService.generateCompletion(testPrompt, {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 500
    });

    console.log('✅ generateCompletion SUCCESS');
    console.log('Response preview:', completion.choices[0]?.message?.content?.slice(0, 100) + '...');

  } catch (error) {
    console.error('❌ Error occurred:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

testAPI().catch(console.error);
