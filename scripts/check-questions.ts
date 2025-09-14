#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import readline from 'readline';

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

// Selection helper functions
function parseSelectionInput(input: string, maxIndex: number): number[] {
  if (input.toLowerCase() === 'all') {
    return Array.from({ length: maxIndex }, (_, i) => i);
  }

  const indices: number[] = [];
  const parts = input.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(p => parseInt(p.trim()));
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= maxIndex) {
        for (let i = start; i <= end; i++) {
          indices.push(i - 1); // Convert to 0-based index
        }
      }
    } else {
      const index = parseInt(part);
      if (!isNaN(index) && index >= 1 && index <= maxIndex) {
        indices.push(index - 1); // Convert to 0-based index
      }
    }
  }

  return [...new Set(indices)].sort();
}

function searchPrinciples(principles: any[], searchTerm: string): number[] {
  const term = searchTerm.toLowerCase();
  const matches: number[] = [];

  principles.forEach((principle, index) => {
    const titleMatch = principle.title.toLowerCase().includes(term);
    const typeMatch = principle.type.toLowerCase().includes(term);
    const categoryMatch = principle.category.toLowerCase().includes(term);
    
    if (titleMatch || typeMatch || categoryMatch) {
      matches.push(index);
    }
  });

  return matches;
}

async function selectPrinciples(principles: any[]): Promise<any[]> {
  console.log('\n📋 Available Principles:');
  console.log('======================\n');
  
  // Group by category for better display
  const groupedByCategory = principles.reduce((acc, p, index) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push({ ...p, index: index + 1 });
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(groupedByCategory).forEach(([category, categoryPrinciples]) => {
    console.log(`📂 ${category.toUpperCase()} (${categoryPrinciples.length})`);
    categoryPrinciples.forEach((p) => {
      console.log(`   ${p.index}. ${p.title} (${p.type})`);
    });
    console.log('');
  });

  console.log('🎯 Selection Options:');
  console.log('• Numbers: "1,3,5" or "1-10" or "1,5-8,12"');
  console.log('• Search: "fitts", "cognitive_bias", "usability"');
  console.log('• All: "all"');

  const selection = await askQuestion('\n👉 Select principles to check: ');

  // Check if it's a search term
  if (isNaN(parseInt(selection.split(',')[0])) && selection.toLowerCase() !== 'all') {
    const matchingIndices = searchPrinciples(principles, selection);
    if (matchingIndices.length === 0) {
      console.log(`❌ No principles found matching "${selection}"`);
      return [];
    }
    console.log(`\n🔍 Found ${matchingIndices.length} matching principle(s):`);
    matchingIndices.forEach(i => {
      console.log(`   ${i + 1}. ${principles[i].title}`);
    });
    return matchingIndices.map(i => principles[i]);
  }

  // Parse selection
  const selectedIndices = parseSelectionInput(selection, principles.length);
  
  if (selectedIndices.length === 0) {
    console.log('❌ No valid selection made');
    return [];
  }

  return selectedIndices.map(i => principles[i]);
}

async function checkQuestions() {
  console.log('🔍 Quiz Question Assignment Checker');
  console.log('===================================\n');

  try {
    // Load all principles
    const principles = await DatabaseService.getPrinciples();
    console.log(`📊 Found ${principles.length} principles in database\n`);

    // Select principles to check
    const selectedPrinciples = await selectPrinciples(principles);
    
    if (selectedPrinciples.length === 0) {
      console.log('\n👋 No principles selected. Exiting...');
      return;
    }

    console.log(`\n🔍 Checking questions for ${selectedPrinciples.length} principles...\n`);

    // Get question counts for selected principles
    const principleIds = selectedPrinciples.map(p => p.id);
    const questionCounts = await DatabaseService.getQuestionCountsForPrinciples(principleIds);

    // Display results
    console.log('📊 Quiz Question Report:');
    console.log('========================\n');

    let totalQuestions = 0;
    let principlesWithoutQuestions = 0;

    selectedPrinciples.forEach((principle, index) => {
      const questionCount = questionCounts[principle.id] || 0;
      totalQuestions += questionCount;
      
      if (questionCount === 0) {
        principlesWithoutQuestions++;
      }

      const status = questionCount === 0 ? '❌' : questionCount < 3 ? '⚠️ ' : '✅';
      const countDisplay = questionCount === 0 ? 'NO QUESTIONS' : `${questionCount} questions`;
      
      console.log(`${status} ${principle.title}`);
      console.log(`   📂 ${principle.category} • 🏷️  ${principle.type}`);
      console.log(`   📝 ${countDisplay}`);
      console.log('');
    });

    // Summary
    console.log('📈 Summary:');
    console.log(`   • Total principles checked: ${selectedPrinciples.length}`);
    console.log(`   • Total questions found: ${totalQuestions}`);
    console.log(`   • Principles without questions: ${principlesWithoutQuestions}`);
    console.log(`   • Average questions per principle: ${(totalQuestions / selectedPrinciples.length).toFixed(1)}`);

    if (principlesWithoutQuestions > 0) {
      console.log(`\n💡 Suggestion: Use "npm run expand-questions" to generate questions for principles without any.`);
    }

  } catch (error) {
    console.error('❌ Failed to check questions:', error);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Check cancelled!');
  rl.close();
  process.exit(0);
});

checkQuestions().catch(console.error);