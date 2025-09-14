#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

function fixCategory(category: string, principleType: string): string {
  const categoryLower = category.toLowerCase();
  
  // Map common variations to our standard categories
  const categoryMappings: Record<string, string> = {
    'cognitive biases': 'decisions',
    'design heuristics': 'usability',
    'usability principles': 'usability',
    'visual design': 'attention',
    'information architecture': 'attention',
    'interaction design': 'usability'
  };
  
  // Check direct mappings first
  if (categoryMappings[categoryLower]) {
    return categoryMappings[categoryLower];
  }
  
  // Fallback based on principle type
  switch (principleType) {
    case 'cognitive_bias':
      return 'decisions';
    case 'heuristic':
      return 'usability';
    case 'ux_law':
      return 'usability';
    default:
      return 'usability';
  }
}

function generateMissingTags(principle: any): string[] {
  const tags: string[] = [];
  
  // Add tags based on type
  switch (principle.type) {
    case 'cognitive_bias':
      tags.push('psychology', 'decision-making');
      break;
    case 'heuristic':
      tags.push('usability', 'design');
      break;
    case 'ux_law':
      tags.push('design', 'interaction');
      break;
  }
  
  // Add tags based on category
  switch (principle.category) {
    case 'usability':
      tags.push('usability', 'interface');
      break;
    case 'decisions':
      tags.push('psychology', 'decision-making');
      break;
    case 'attention':
      tags.push('visual', 'attention');
      break;
    case 'memory':
      tags.push('memory', 'cognition');
      break;
  }
  
  return Array.from(new Set(tags));
}

function generateMissingAppliesWhen(principle: any): string[] {
  const contexts: string[] = [];
  
  // Add contexts based on type
  switch (principle.type) {
    case 'cognitive_bias':
      contexts.push('decision making', 'user choices', 'product selection', 'information processing');
      break;
    case 'heuristic':
      contexts.push('interface design', 'user testing', 'usability evaluation', 'design reviews');
      break;
    case 'ux_law':
      contexts.push('interface design', 'interaction design', 'user flows', 'layout design');
      break;
  }
  
  return contexts.slice(0, 4);
}

async function autoFixData() {
  console.log('🔧 Auto-fixing Data Structure Issues');
  console.log('====================================\n');

  try {
    const principles = await DatabaseService.getPrinciples();
    console.log(`📊 Checking ${principles.length} principles...\n`);

    let fixesApplied = 0;

    for (const principle of principles) {
      const fixes: any = {};
      const issues: string[] = [];

      // Fix category formatting and validity
      if (principle.category !== principle.category.toLowerCase()) {
        fixes.category = fixCategory(principle.category, principle.type);
        issues.push(`Category: "${principle.category}" → "${fixes.category}"`);
      } else if (!['usability', 'decisions', 'attention', 'memory'].includes(principle.category)) {
        fixes.category = fixCategory(principle.category, principle.type);
        issues.push(`Invalid category: "${principle.category}" → "${fixes.category}"`);
      }

      // Fix missing appliesWhen
      if (!principle.appliesWhen || principle.appliesWhen.length === 0) {
        fixes.appliesWhen = generateMissingAppliesWhen(principle);
        issues.push(`Added appliesWhen: ${fixes.appliesWhen.join(', ')}`);
      }

      // Fix missing tags
      if (!principle.tags || principle.tags.length === 0) {
        fixes.tags = generateMissingTags(principle);
        issues.push(`Added tags: ${fixes.tags.join(', ')}`);
      }

      // Apply fixes if any
      if (Object.keys(fixes).length > 0) {
        try {
          await DatabaseService.updatePrinciple(principle.id, fixes);
          console.log(`✅ Fixed: ${principle.title}`);
          issues.forEach(issue => console.log(`   • ${issue}`));
          fixesApplied++;
        } catch (error) {
          console.log(`❌ Failed to fix ${principle.title}: ${error}`);
        }
      }
    }

    console.log(`\n🎉 Auto-fix complete!`);
    console.log(`📊 Applied fixes to ${fixesApplied} principles`);
    
    if (fixesApplied > 0) {
      console.log('\n💡 Next steps:');
      console.log('• Run "npm run audit-content" for content quality improvements');
      console.log('• Use "npm run expand-questions" to add quiz questions');
    }

  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
  }
}

autoFixData().catch(console.error);