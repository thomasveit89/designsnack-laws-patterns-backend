#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * 
 * This script seeds the database with principles from the mobile app
 * and generates an initial set of fallback questions.
 */

import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';
import { Principle, QuizQuestion } from '../lib/types';

// Import principles from the mobile app
const MOBILE_APP_PATH = '../designsnack-laws-patterns';
const PRINCIPLES_FILE = path.join(__dirname, '../../', MOBILE_APP_PATH, 'src/data/principles.json');

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Check if principles file exists
    if (!fs.existsSync(PRINCIPLES_FILE)) {
      console.error(`❌ Principles file not found at: ${PRINCIPLES_FILE}`);
      console.log('Please make sure the mobile app is in the expected location.');
      process.exit(1);
    }

    // Load principles from mobile app
    console.log('📚 Loading principles from mobile app...');
    const principlesData = JSON.parse(fs.readFileSync(PRINCIPLES_FILE, 'utf-8'));
    const principles: Principle[] = Array.isArray(principlesData) ? principlesData : principlesData.principles;

    if (!principles || principles.length === 0) {
      console.error('❌ No principles found in the data file.');
      process.exit(1);
    }

    console.log(`Found ${principles.length} principles to seed\n`);

    // Check if principles already exist
    console.log('🔍 Checking existing principles in database...');
    const existingPrinciples = await DatabaseService.getPrinciples();
    
    if (existingPrinciples.length > 0) {
      console.log(`Found ${existingPrinciples.length} existing principles`);
      const proceed = await promptConfirmation('Do you want to add new principles or skip? (y/N): ');
      if (!proceed) {
        console.log('✅ Skipping principle seeding.');
      } else {
        await seedPrinciples(principles, existingPrinciples);
      }
    } else {
      await seedPrinciples(principles, []);
    }

    // Generate fallback questions
    console.log('\n🧠 Generating fallback questions...');
    const allPrinciples = await DatabaseService.getPrinciples();
    
    if (allPrinciples.length === 0) {
      console.error('❌ No principles in database. Cannot generate questions.');
      process.exit(1);
    }

    console.log('Creating basic fallback questions for immediate use...');
    const fallbackQuestions = OpenAIService.generateFallbackQuestions(allPrinciples);
    
    const quizQuestions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = 
      fallbackQuestions.map(q => ({
        principleId: q.principleId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: 'easy' as const,
        qualityScore: 6 // Fallback questions get lower quality score
      }));

    const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
    console.log(`✅ Created ${savedQuestions.length} fallback questions\n`);

    // Final summary
    const stats = await DatabaseService.getQuestionStats();
    console.log('📊 Database Summary:');
    console.log('='.repeat(30));
    console.log(`Principles: ${allPrinciples.length}`);
    console.log(`Questions: ${stats.totalQuestions}`);
    console.log(`Average Quality: ${stats.averageQualityScore.toFixed(1)}`);
    console.log();
    console.log('Questions by Difficulty:');
    Object.entries(stats.questionsByDifficulty).forEach(([difficulty, count]) => {
      console.log(`  ${difficulty}: ${count}`);
    });

    console.log('\n🎉 Database seeding completed!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run generate" to create AI-powered questions');
    console.log('2. Deploy to Vercel: "npm run deploy"');
    console.log('3. Update your mobile app to use the new API');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function seedPrinciples(principles: Principle[], existing: Principle[]) {
  console.log('🌱 Seeding principles...');
  
  const existingIds = new Set(existing.map(p => p.id));
  const newPrinciples = principles.filter(p => !existingIds.has(p.id));
  
  if (newPrinciples.length === 0) {
    console.log('✅ All principles already exist in database.');
    return;
  }

  console.log(`Adding ${newPrinciples.length} new principles...`);

  let successCount = 0;
  let errorCount = 0;

  for (const principle of newPrinciples) {
    try {
      await DatabaseService.createPrinciple(principle);
      successCount++;
      console.log(`  ✅ ${principle.title}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ ${principle.title}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\nPrinciples seeded: ${successCount} success, ${errorCount} errors`);
}

function promptConfirmation(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(message, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}