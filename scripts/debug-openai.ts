#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

async function debugOpenAI() {
  console.log('=== OpenAI Debug Information ===');
  console.log('Node version:', process.version);
  console.log('Working directory:', process.cwd());
  
  // Check environment variables
  console.log('\n=== Environment Variables ===');
  console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
  console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
  console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
  
  // Check if key has any hidden characters
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    console.log('Key has newlines:', key.includes('\n'));
    console.log('Key has carriage returns:', key.includes('\r'));
    console.log('Key has spaces:', key.includes(' '));
    console.log('Trimmed key length:', key.trim().length);
  }
  
  // Test with different initialization methods
  console.log('\n=== Testing OpenAI Client Initialization ===');
  
  try {
    // Method 1: Standard initialization
    console.log('Testing method 1: Standard initialization...');
    const OpenAI = require('openai');
    const openai1 = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response1 = await openai1.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Test 1"' }],
      max_tokens: 5
    });
    console.log('✅ Method 1 SUCCESS:', response1.choices[0].message.content);
    
  } catch (error: any) {
    console.log('❌ Method 1 FAILED:', error.message);
    console.log('Error status:', error.status);
    console.log('Error type:', error.constructor.name);
  }
  
  try {
    // Method 2: With trimmed key
    console.log('\nTesting method 2: Trimmed key...');
    const OpenAI = require('openai');
    const openai2 = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY?.trim(),
    });
    
    const response2 = await openai2.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Test 2"' }],
      max_tokens: 5
    });
    console.log('✅ Method 2 SUCCESS:', response2.choices[0].message.content);
    
  } catch (error: any) {
    console.log('❌ Method 2 FAILED:', error.message);
  }
  
  // Note: All API key testing is done via environment variables only
  console.log('\nAll tests completed using environment variables only.');
}

debugOpenAI().catch(console.error);