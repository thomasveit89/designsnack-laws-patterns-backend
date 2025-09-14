#!/usr/bin/env tsx

/**
 * AI-Powered Question Bank Expansion
 * Generate additional quiz questions for existing principles
 */

// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';

import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function selectPrinciples(): Promise<any[]> {
  console.log('📚 Loading existing principles...\n');
  
  const allPrinciples = await DatabaseService.getPrinciples();
  const stats = await DatabaseService.getQuestionStats();
  
  console.log(`Found ${allPrinciples.length} principles in database`);
  console.log(`Current total: ${stats.totalQuestions} questions\n`);

  // Show principles with current question counts
  console.log('Available principles:');
  console.log('====================');
  
  for (let i = 0; i < allPrinciples.length; i++) {
    const principle = allPrinciples[i];
    // Get question count for this principle (this is a simplified version)
    const questions = await DatabaseService.getQuestions({
      principleIds: [principle.id],
      minQualityScore: 0
    });
    
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${principle.title} (${principle.type})`);
    console.log(`    ${questions.length} questions | Category: ${principle.category}`);
  }

  console.log('\nOptions:');
  console.log('- Enter numbers (e.g., "1,3,5" for multiple principles)');
  console.log('- Enter "all" for all principles');
  console.log('- Enter principle name to search (e.g., "anchoring")');
  
  const selection = await askQuestion('\nSelect principles: ');
  
  if (selection.toLowerCase() === 'all') {
    return allPrinciples;
  }
  
  // Handle numeric selection
  if (/^[\d,\s]+$/.test(selection)) {
    const numbers = selection.split(',').map(n => parseInt(n.trim()) - 1);
    return numbers.map(i => allPrinciples[i]).filter(Boolean);
  }
  
  // Handle text search
  const searchTerm = selection.toLowerCase();
  return allPrinciples.filter(p => 
    p.title.toLowerCase().includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm) ||
    p.type.toLowerCase().includes(searchTerm)
  );
}

async function getQuestionParameters(): Promise<{
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: string[];
}> {
  console.log('\n🎯 Question Generation Parameters:');
  
  const countStr = await askQuestion('How many questions per principle? (default: 5): ');
  const count = parseInt(countStr) || 5;
  
  console.log('\nDifficulty levels:');
  console.log('1. Easy (basic definitions, simple recognition)');
  console.log('2. Medium (application scenarios, comparisons)'); 
  console.log('3. Hard (complex scenarios, expert analysis)');
  
  const difficultyStr = await askQuestion('Select difficulty (1-3, default: 2): ');
  const difficulties = ['easy', 'medium', 'hard'] as const;
  const difficulty = difficulties[parseInt(difficultyStr) - 1] || 'medium';
  
  console.log('\nQuestion types to include:');
  console.log('1. Definition questions ("What is...")')
  console.log('2. Application questions ("When should you...")')
  console.log('3. Scenario questions ("Which principle applies...")')
  console.log('4. Recognition questions ("This example shows...")')
  
  const typesStr = await askQuestion('Select types (1-4, default: all): ');
  const questionTypes = ['definition', 'application', 'scenario', 'recognition'];
  
  return { count, difficulty, questionTypes };
}

async function generateQuestionsForPrinciples(
  principles: any[],
  params: { count: number; difficulty: 'easy' | 'medium' | 'hard'; questionTypes: string[] }
): Promise<void> {
  console.log(`\n🤖 Generating ${params.count} ${params.difficulty} questions for ${principles.length} principles...\n`);
  
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const principle of principles) {
    try {
      console.log(`📝 Generating questions for: ${principle.title}`);
      
      const questions = await OpenAIService.generateQuestions(
        [principle],
        params.count,
        params.difficulty
      );

      if (questions.length === 0) {
        console.log(`   ⚠️ No questions generated`);
        totalFailed++;
        continue;
      }

      const quizQuestions = questions.map(q => ({
        principleId: q.principleId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: params.difficulty,
        qualityScore: 8
      }));

      const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
      console.log(`   ✅ Generated ${savedQuestions.length} questions`);
      totalGenerated += savedQuestions.length;

      // Show sample question
      if (savedQuestions.length > 0) {
        const sample = savedQuestions[0];
        console.log(`   📖 Sample: "${sample.question.substring(0, 60)}..."`);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
      totalFailed++;
    }
  }

  console.log('\n🎉 Question Generation Complete!');
  console.log('================================');
  console.log(`✅ Successfully generated: ${totalGenerated} questions`);
  console.log(`❌ Failed principles: ${totalFailed}`);
  
  if (totalGenerated > 0) {
    const stats = await DatabaseService.getQuestionStats();
    console.log(`📊 New database total: ${stats.totalQuestions} questions`);
    console.log(`📈 Average quality score: ${stats.averageQualityScore.toFixed(1)}/10`);
  }
}

async function showPreview(principles: any[]): Promise<boolean> {
  console.log('\n📋 Preview:');
  console.log('===========');
  console.log(`Selected principles: ${principles.length}`);
  
  principles.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (${p.type})`);
  });
  
  if (principles.length > 5) {
    console.log(`  ... and ${principles.length - 5} more`);
  }
  
  const confirm = await askQuestion('\n✅ Proceed with question generation? (y/n): ');
  return confirm.toLowerCase().startsWith('y');
}

async function main() {
  console.log('🎯 AI-Powered Question Bank Expansion');
  console.log('=====================================\n');

  try {
    // Select principles
    const selectedPrinciples = await selectPrinciples();
    
    if (selectedPrinciples.length === 0) {
      console.log('❌ No principles selected.');
      process.exit(1);
    }

    // Get generation parameters
    const params = await getQuestionParameters();
    
    // Show preview and confirm
    const confirmed = await showPreview(selectedPrinciples);
    
    if (!confirmed) {
      console.log('❌ Question generation cancelled.');
      process.exit(0);
    }

    // Generate questions
    await generateQuestionsForPrinciples(selectedPrinciples, params);

    console.log('\n🚀 Your app users will see these new questions in the next sync!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}