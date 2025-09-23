#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';

async function testQuizGeneration() {
  console.log('🧪 Testing Quiz Question Generation\n');

  try {
    // Create a test principle
    const testPrinciple = {
      id: 'test-fitts-law',
      title: "Fitts's Law",
      type: 'ux_law' as const,
      oneLiner: "The time to reach a target is proportional to distance and inversely related to size",
      definition: "Fitts's Law describes the relationship between the time required to rapidly point to a target area and the distance to and size of the target.",
      category: 'usability' as const,
      appliesWhen: ["buttons", "menus", "touch targets", "navigation"],
      do: ["Make important buttons larger", "Place related actions close together", "Size targets appropriately for input method", "Consider thumb-friendly zones on mobile"],
      dont: ["Make small clickable areas", "Place important buttons far from cursor", "Use tiny touch targets", "Ignore input method constraints"],
      example: {
        image: '',
        caption: "iOS uses large, easily tappable buttons in the bottom navigation bar where thumbs naturally rest"
      },
      tags: ["interaction", "usability", "mobile"],
      sources: ["Fitts, P. M. (1954). The information capacity of the human motor system"]
    };

    console.log('📝 Generating quiz questions for:', testPrinciple.title);

    // Test the question generation
    const questions = await OpenAIService.generateQuestions(
      [testPrinciple],
      3, // Generate 3 questions
      'medium'
    );

    console.log(`✅ Generated ${questions.length} questions successfully!\n`);

    // Display the questions
    questions.forEach((q, index) => {
      console.log(`Question ${index + 1}:`);
      console.log(`Q: ${q.question}`);
      console.log('Options:');
      q.options.forEach((option, i) => {
        const marker = i === q.correctAnswer ? '✓' : ' ';
        console.log(`   ${marker} ${String.fromCharCode(65 + i)}) ${option}`);
      });
      console.log(`Explanation: ${q.explanation || 'None provided'}\n`);
    });

  } catch (error) {
    console.error('❌ Quiz generation failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }

    // Check environment variables
    console.log('\n🔍 Environment Check:');
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 20)}...` : 'MISSING');
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Present' : 'MISSING');
  }
}

// Run the test
testQuizGeneration().catch(console.error);