#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

async function testOpenAIKey() {
  console.log('🔑 Testing OpenAI API Key\n');

  // Check if API key is present
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }

  console.log('✅ API Key found:', `${apiKey.slice(0, 20)}...`);
  console.log('Key starts with:', apiKey.startsWith('sk-') ? 'sk- (correct)' : 'WRONG FORMAT');
  console.log('Key length:', apiKey.length, 'characters');

  // Test the API key with a simple request
  try {
    console.log('\n🧪 Testing API key with OpenAI...');

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, API key works!" in exactly those words.'
        }
      ],
      max_tokens: 20,
      temperature: 0
    });

    const response = completion.choices[0]?.message?.content;
    console.log('✅ OpenAI API Response:', response);

  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if ('status' in error) {
        console.error('HTTP Status:', error.status);
      }
    }
  }
}

testOpenAIKey().catch(console.error);