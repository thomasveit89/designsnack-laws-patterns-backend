#!/usr/bin/env tsx

/**
 * Question Generation Script
 * 
 * This script generates quiz questions for all principles in the database using OpenAI.
 * Run with: npm run generate
 */

import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';
import { QuizQuestion } from '../lib/types';

interface GenerationConfig {
  questionsPerPrinciple: number;
  difficulties: ('easy' | 'medium' | 'hard')[];
  batchSize: number;
  delayBetweenBatches: number; // milliseconds
  dryRun: boolean;
}

const DEFAULT_CONFIG: GenerationConfig = {
  questionsPerPrinciple: 10,
  difficulties: ['easy', 'medium', 'hard'],
  batchSize: 3, // Principles per batch
  delayBetweenBatches: 2000, // 2 seconds
  dryRun: false
};

async function main() {
  console.log('🚀 Starting question generation script...\n');

  try {
    // Parse command line arguments
    const config = parseArguments();
    
    console.log('Configuration:', {
      questionsPerPrinciple: config.questionsPerPrinciple,
      difficulties: config.difficulties,
      batchSize: config.batchSize,
      dryRun: config.dryRun
    });
    console.log();

    // Get all principles from database
    console.log('📚 Fetching principles from database...');
    const principles = await DatabaseService.getPrinciples();
    console.log(`Found ${principles.length} principles\n`);

    if (principles.length === 0) {
      console.error('❌ No principles found in database. Please seed the database first.');
      process.exit(1);
    }

    // Calculate costs and show overview
    const totalCost = config.difficulties.reduce((sum, difficulty) => {
      const estimate = OpenAIService.estimateTokenCost(principles, config.questionsPerPrinciple);
      return sum + estimate.estimatedCostUSD;
    }, 0);

    console.log('💰 Cost Estimation:');
    console.log(`Total estimated cost: $${totalCost.toFixed(2)}`);
    console.log(`Questions to generate: ${principles.length * config.difficulties.length * config.questionsPerPrinciple}`);
    console.log();

    if (!config.dryRun) {
      const confirmed = await promptConfirmation('Do you want to proceed? (y/N): ');
      if (!confirmed) {
        console.log('❌ Generation cancelled.');
        process.exit(0);
      }
    }

    // Split principles into batches
    const batches = createBatches(principles, config.batchSize);
    console.log(`📦 Split into ${batches.length} batches of ${config.batchSize} principles each\n`);

    let totalGenerated = 0;
    let totalErrors = 0;

    // Generate questions for each difficulty level
    for (const difficulty of config.difficulties) {
      console.log(`\n🎯 Generating ${difficulty} questions...`);
      console.log('='.repeat(50));

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNum = i + 1;
        
        console.log(`\n📝 Batch ${batchNum}/${batches.length} (${difficulty}):`);
        console.log(`Principles: ${batch.map(p => p.title).join(', ')}`);

        if (config.dryRun) {
          console.log('🏃 DRY RUN - Skipping actual generation');
          continue;
        }

        try {
          // Generate questions for this batch
          const generatedQuestions = await OpenAIService.generateQuestions(
            batch,
            config.questionsPerPrinciple,
            difficulty
          );

          if (generatedQuestions.length === 0) {
            console.log('⚠️  No questions generated for this batch');
            continue;
          }

          // Convert to QuizQuestion format
          const quizQuestions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = 
            generatedQuestions.map(q => ({
              principleId: q.principleId,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: difficulty,
              qualityScore: 8 // AI-generated questions get default score of 8
            }));

          // Save to database
          const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
          totalGenerated += savedQuestions.length;

          console.log(`✅ Generated ${savedQuestions.length} questions`);

          // Delay between batches to respect rate limits
          if (i < batches.length - 1) {
            console.log(`⏳ Waiting ${config.delayBetweenBatches}ms...`);
            await sleep(config.delayBetweenBatches);
          }

        } catch (error) {
          totalErrors++;
          console.error(`❌ Error generating questions for batch ${batchNum}:`, error instanceof Error ? error.message : error);
        }
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Generation Summary');
    console.log('='.repeat(50));
    console.log(`Total questions generated: ${totalGenerated}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Success rate: ${((batches.length * config.difficulties.length - totalErrors) / (batches.length * config.difficulties.length) * 100).toFixed(1)}%`);

    if (!config.dryRun && totalGenerated > 0) {
      // Show final database stats
      const stats = await DatabaseService.getQuestionStats();
      console.log(`\nDatabase now contains ${stats.totalQuestions} total questions`);
      console.log(`Average quality score: ${stats.averageQualityScore.toFixed(1)}`);
    }

    console.log('\n🎉 Question generation completed!');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

function parseArguments(): GenerationConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--questions':
      case '-q':
        config.questionsPerPrinciple = parseInt(args[++i]) || config.questionsPerPrinciple;
        break;
      case '--batch-size':
      case '-b':
        config.batchSize = parseInt(args[++i]) || config.batchSize;
        break;
      case '--delay':
      case '-d':
        config.delayBetweenBatches = parseInt(args[++i]) || config.delayBetweenBatches;
        break;
      case '--difficulty':
        const difficulty = args[++i] as 'easy' | 'medium' | 'hard';
        if (['easy', 'medium', 'hard'].includes(difficulty)) {
          config.difficulties = [difficulty];
        }
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function printHelp() {
  console.log(`
Question Generation Script

Usage: npm run generate [options]

Options:
  -q, --questions <number>     Questions per principle (default: ${DEFAULT_CONFIG.questionsPerPrinciple})
  -b, --batch-size <number>    Principles per batch (default: ${DEFAULT_CONFIG.batchSize})
  -d, --delay <number>         Delay between batches in ms (default: ${DEFAULT_CONFIG.delayBetweenBatches})
  --difficulty <level>         Generate only for specific difficulty (easy/medium/hard)
  --dry-run                    Show what would be generated without actually doing it
  -h, --help                   Show this help message

Examples:
  npm run generate                          # Generate with default settings
  npm run generate --questions 5           # Generate 5 questions per principle
  npm run generate --difficulty medium     # Generate only medium questions
  npm run generate --dry-run               # Preview without generating
  `);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}