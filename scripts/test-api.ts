#!/usr/bin/env tsx

/**
 * API Testing Script
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

async function main() {
  console.log('🧪 Testing API functionality...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const principles = await DatabaseService.getPrinciples();
    console.log(`   ✅ Database connected! Found ${principles.length} principles`);
    
    if (principles.length > 0) {
      console.log(`   📋 Sample principle: "${principles[0].title}"`);
    }

    // Test 2: Question Statistics
    console.log('\n2️⃣ Testing database statistics...');
    const stats = await DatabaseService.getQuestionStats();
    console.log(`   📊 Total questions: ${stats.totalQuestions}`);
    console.log(`   📈 Average quality: ${stats.averageQualityScore}`);
    console.log(`   📈 Questions by difficulty:`, stats.questionsByDifficulty);

    // Test 3: Get Random Questions (should be empty for now)
    console.log('\n3️⃣ Testing random question selection...');
    const principleIds = principles.slice(0, 3).map(p => p.id);
    const randomQuestions = await DatabaseService.getRandomQuestions(principleIds, 5);
    console.log(`   🎲 Random questions found: ${randomQuestions.length}`);

    if (randomQuestions.length === 0) {
      console.log(`   ℹ️  No questions yet - this is expected before generation`);
    }

    // Test 4: Environment Variables
    console.log('\n4️⃣ Testing environment configuration...');
    const envCheck = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseAnon: !!process.env.SUPABASE_ANON_KEY,
      supabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY
    };
    console.log('   🔑 Environment variables:', envCheck);
    
    const allEnvPresent = Object.values(envCheck).every(Boolean);
    console.log(`   ${allEnvPresent ? '✅' : '❌'} All required environment variables present`);

    console.log('\n🎉 API tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Database: Connected (${principles.length} principles)`);
    console.log(`   • Questions: ${stats.totalQuestions} (ready for generation)`);
    console.log(`   • Environment: ${allEnvPresent ? 'Configured' : 'Missing variables'}`);
    
    if (allEnvPresent && principles.length > 0) {
      console.log('\n✨ Ready to generate questions with AI!');
    }

  } catch (error) {
    console.error('\n❌ API test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}