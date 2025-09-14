#!/usr/bin/env tsx

/**
 * Sample Question Generation
 * Generate a small batch of questions for testing
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';

async function main() {
  console.log('🤖 Generating sample questions with AI...\n');

  try {
    // Get first 3 principles for testing
    const allPrinciples = await DatabaseService.getPrinciples();
    const testPrinciples = allPrinciples.slice(0, 3);
    
    console.log('📚 Selected principles for testing:');
    testPrinciples.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title} (${p.type})`);
    });
    
    // Estimate cost
    const costEstimate = OpenAIService.estimateTokenCost(testPrinciples, 3);
    console.log(`\n💰 Estimated cost: $${costEstimate.estimatedCostUSD} for ${testPrinciples.length * 3} questions`);
    
    console.log('\n🎯 Generating questions...');
    
    // Generate questions
    const generatedQuestions = await OpenAIService.generateQuestions(
      testPrinciples,
      3, // 3 questions per principle
      'medium'
    );
    
    console.log(`✅ Generated ${generatedQuestions.length} questions`);
    
    // Save to database
    const quizQuestions = generatedQuestions.map(q => ({
      principleId: q.principleId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: 'medium' as const,
      qualityScore: 8
    }));
    
    const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
    console.log(`💾 Saved ${savedQuestions.length} questions to database`);
    
    // Show sample
    if (savedQuestions.length > 0) {
      console.log('\n📝 Sample question:');
      const sample = savedQuestions[0];
      const principle = testPrinciples.find(p => p.id === sample.principleId);
      console.log(`   Principle: ${principle?.title}`);
      console.log(`   Question: ${sample.question}`);
      console.log(`   Options: ${sample.options.map((opt, i) => `\n     ${String.fromCharCode(65 + i)}) ${opt}`).join('')}`);
      console.log(`   Correct Answer: ${String.fromCharCode(65 + sample.correctAnswer)}`);
      if (sample.explanation) {
        console.log(`   Explanation: ${sample.explanation}`);
      }
    }
    
    // Final stats
    const stats = await DatabaseService.getQuestionStats();
    console.log(`\n📊 Database now contains ${stats.totalQuestions} questions`);
    console.log(`   Average quality score: ${stats.averageQualityScore.toFixed(1)}`);
    
    console.log('\n🎉 Sample generation completed successfully!');

  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    
    // Try fallback questions
    console.log('\n🛟 Trying fallback questions...');
    try {
      const allPrinciples = await DatabaseService.getPrinciples();
      const testPrinciples = allPrinciples.slice(0, 3);
      
      const fallbackQuestions = OpenAIService.generateFallbackQuestions(testPrinciples);
      const quizQuestions = fallbackQuestions.map(q => ({
        principleId: q.principleId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: 'easy' as const,
        qualityScore: 6
      }));
      
      const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
      console.log(`✅ Created ${savedQuestions.length} fallback questions`);
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      process.exit(1);
    }
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}