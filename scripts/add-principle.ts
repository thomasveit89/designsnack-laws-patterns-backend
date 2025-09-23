#!/usr/bin/env tsx

/**
 * AI-Powered Principle Creation Script
 * Interactive tool to add new UX principles with AI assistance
 */

// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';
import { Principle } from '../lib/types';

// Create readline interface for user interaction
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

interface AIGeneratedPrinciple {
  title: string;
  type: "ux_law" | "cognitive_bias" | "heuristic";
  oneLiner: string;
  definition: string;
  category: string;
  appliesWhen: string[];
  do: string[];
  dont: string[];
  example: {
    caption: string;
  };
  tags: string[];
  sources: string[];
}

async function generatePrincipleContent(principleInput: string): Promise<AIGeneratedPrinciple> {
  console.log('🤖 Generating comprehensive principle content with AI...\n');

  const prompt = `You are an expert UX designer and educator. Create a comprehensive UX principle entry based on this input: "${principleInput}"

Please provide a detailed response in the following JSON format:
{
  "title": "Official Principle Name",  
  "type": "ux_law" | "cognitive_bias" | "heuristic",
  "oneLiner": "One sentence summary (max 100 chars)",
  "definition": "Clear 2-3 sentence definition explaining what it is",
  "category": "usability" | "decisions" | "attention" | "memory" | "persuasion" | "visual",
  "appliesWhen": [
    "context1",
    "context2", 
    "context3",
    "context4"
  ],
  "do": [
    "Specific actionable do recommendation 1",
    "Specific actionable do recommendation 2",
    "Specific actionable do recommendation 3",
    "Specific actionable do recommendation 4"
  ],
  "dont": [
    "Specific actionable don't recommendation 1", 
    "Specific actionable don't recommendation 2",
    "Specific actionable don't recommendation 3",
    "Specific actionable don't recommendation 4"
  ],
  "example": {
    "caption": "Concrete real-world example of this principle with specific product/context"
  },
  "tags": [
    "tag1",
    "tag2", 
    "tag3"
  ],
  "sources": [
    "https://example.com/reference1",
    "Book Title by Author Name"
  ]
}

Guidelines:
- Use established UX terminology and concepts
- Make do/don't items specific and actionable (4 items each)
- appliesWhen should be short contexts where this principle matters (like "buttons", "menus", "forms")
- Keep oneLiner under 100 characters
- Example caption should be concrete and specific (like "Netflix uses thumbnails sized proportionally to viewing distance")
- Tags should be relevant UX/design concepts using lowercase-with-hyphens format (like "user-interaction", "mobile-design", "cognitive-bias")
- Sources should be URLs or "Book Title by Author" format
- Categories should be: "attention" (visual hierarchy, contrast), "memory" (chunking, recall), "decisions" (biases, heuristics), "usability" (interfaces, interactions), "persuasion" (scarcity, social proof), or "visual" (aesthetic principles)`;

  try {
    const completion = await OpenAIService.generateCompletion(prompt, {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse JSON response
    const principleData = JSON.parse(content);
    return principleData;

  } catch (error) {
    console.error('❌ AI generation failed:', error);
    throw error;
  }
}

async function reviewAndConfirm(principle: AIGeneratedPrinciple): Promise<boolean> {
  console.log('\n📋 Generated Principle Preview:');
  console.log('=====================================');
  console.log(`Title: ${principle.title}`);
  console.log(`Type: ${principle.type}`);
  console.log(`Category: ${principle.category}`);
  console.log(`One-liner: ${principle.oneLiner}`);
  console.log(`\nDefinition:\n${principle.definition}`);
  
  console.log(`\n🎯 Applies When (${principle.appliesWhen?.length} contexts):`);
  principle.appliesWhen?.forEach((context, i) => {
    console.log(`   ${i + 1}. ${context}`);
  });
  
  console.log(`\n✅ Do (${principle.do?.length} items):`);
  principle.do?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item}`);
  });
  
  console.log(`\n❌ Don't (${principle.dont?.length} items):`);
  principle.dont?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item}`);
  });

  console.log(`\n💡 Example:`);
  console.log(`   ${principle.example?.caption}`);

  console.log(`\n🏷️ Tags (${principle.tags?.length} items):`);
  console.log(`   ${principle.tags?.join(', ')}`);

  console.log(`\n📚 Sources (${principle.sources?.length} items):`);
  principle.sources?.forEach((source, i) => {
    console.log(`   ${i + 1}. ${source}`);
  });

  console.log('\n=====================================');
  
  const confirm = await askQuestion('\n✅ Does this look good? (y/n/edit): ');
  return confirm.toLowerCase().startsWith('y');
}

async function savePrinciple(principle: AIGeneratedPrinciple): Promise<void> {
  console.log('\n💾 Saving principle to database...');

  const completePrinciple: Omit<Principle, 'id'> = {
    title: principle.title,
    type: principle.type,
    oneLiner: principle.oneLiner,
    definition: principle.definition,
    category: principle.category,
    appliesWhen: principle.appliesWhen || [],
    do: principle.do || [],
    dont: principle.dont || [],
    example: principle.example ? {
      image: '',
      caption: principle.example.caption
    } : undefined,
    tags: principle.tags || [],
    sources: principle.sources || []
  };

  try {
    await DatabaseService.createPrinciple(completePrinciple);
    console.log(`✅ Successfully saved "${principle.title}" to database!`);
    
    // Ask if user wants to generate questions
    const generateQuestions = await askQuestion('\n🎯 Generate quiz questions for this principle? (y/n): ');
    
    if (generateQuestions.toLowerCase().startsWith('y')) {
      await generateQuestionsForPrinciple(completePrinciple);
    }

  } catch (error) {
    console.error('❌ Failed to save principle:', error);
    throw error;
  }
}

async function generateQuestionsForPrinciple(principle: Principle): Promise<void> {
  console.log(`\n🎯 Generating quiz questions for "${principle.title}"...`);

  try {
    const questions = await OpenAIService.generateQuestions(
      [principle],
      5, // Generate 5 questions per principle
      'medium'
    );

    const quizQuestions = questions.map(q => ({
      principleId: q.principleId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: 'medium' as const,
      qualityScore: 8
    }));

    const savedQuestions = await DatabaseService.createQuestions(quizQuestions);
    console.log(`✅ Generated and saved ${savedQuestions.length} quiz questions!`);

    // Show sample question
    if (savedQuestions.length > 0) {
      const sample = savedQuestions[0];
      console.log('\n📝 Sample question:');
      console.log(`Q: ${sample.question}`);
      console.log(`Options: ${sample.options.map((opt, i) => `\n   ${String.fromCharCode(65 + i)}) ${opt}`).join('')}`);
      console.log(`Correct: ${String.fromCharCode(65 + sample.correctAnswer)}`);
    }

  } catch (error) {
    console.warn('⚠️ Question generation failed, but principle was saved successfully');
    console.warn('You can generate questions later using the generate-questions script');
  }
}

async function main() {
  console.log('🎨 AI-Powered UX Principle Creator');
  console.log('===================================\n');

  try {
    // Get user input
    const principleInput = await askQuestion(
      '🤔 What UX principle would you like to add?\n' +
      '   (e.g., "Progressive Disclosure", "Fitts\' Law", "Anchoring Bias")\n' +
      '   > '
    );

    if (!principleInput) {
      console.log('❌ Please provide a principle name or concept.');
      process.exit(1);
    }

    // Generate content with AI
    const principleData = await generatePrincipleContent(principleInput);

    // Review and confirm
    const approved = await reviewAndConfirm(principleData);
    
    if (!approved) {
      console.log('❌ Principle creation cancelled.');
      process.exit(0);
    }

    // Save to database
    await savePrinciple(principleData);

    // Final success message
    console.log('\n🎉 Principle successfully added to your app!');
    console.log('   Users will see it in the next sync.');

    // Show database stats
    const stats = await DatabaseService.getQuestionStats();
    const principles = await DatabaseService.getPrinciples();
    
    console.log(`\n📊 Database Status:`);
    console.log(`   Total Principles: ${principles.length}`);
    console.log(`   Total Questions: ${stats.totalQuestions}`);
    console.log(`   Average Quality: ${stats.averageQualityScore.toFixed(1)}/10`);

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