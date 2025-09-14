#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

async function testOpenAI() {
  console.log('Testing OpenAI API key...');
  console.log('API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API Key length:', process.env.OPENAI_API_KEY?.length);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ No OpenAI API key found');
    return;
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    console.log('Making test API call...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Hello World"' }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI API working!');
    console.log('Response:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ OpenAI API failed:', error);
  }
}

testOpenAI().catch(console.error);