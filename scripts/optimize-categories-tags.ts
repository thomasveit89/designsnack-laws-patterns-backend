#!/usr/bin/env tsx

/**
 * Categories & Tags Optimization Implementation
 * Implements the approved optimization plan from the audit
 */

import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import { DatabaseService } from '../lib/supabase';

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

// New 6-category system from the approved plan
const NEW_CATEGORIES = {
  'attention': 'Visual hierarchy, contrast, scanning, focal points',
  'memory': 'Chunking, spacing effect, recall, recognition',
  'decisions': 'Biases, heuristics, choice architecture',
  'usability': 'Interface design, interactions, flow',
  'persuasion': 'Business psychology (scarcity, social proof, etc.)',
  'visual': 'Aesthetic principles, design laws'
} as const;

type CategoryName = keyof typeof NEW_CATEGORIES;

// Standardized tag mappings from audit findings
const TAG_STANDARDIZATION: Record<string, string> = {
  // Duplicates identified in audit
  'decision making': 'decision-making',
  'Decision Making': 'decision-making',
  'user experience': 'user-experience',
  'User Experience': 'user-experience',
  'cognitive bias': 'cognitive-bias',
  'Cognitive Bias': 'cognitive-bias',

  // Additional standardization (lowercase-with-hyphens)
  'user interface': 'user-interface',
  'User Interface': 'user-interface',
  'user engagement': 'user-engagement',
  'User Engagement': 'user-engagement',
  'visual hierarchy': 'visual-hierarchy',
  'Visual Hierarchy': 'visual-hierarchy',
  'social proof': 'social-proof',
  'Social Proof': 'social-proof',
  'information architecture': 'information-architecture',
  'Information Architecture': 'information-architecture'
};

// Principle recategorization rules based on audit
const RECATEGORIZATION_RULES: Array<{
  titleMatch: string | RegExp;
  newCategory: CategoryName;
  reason: string;
}> = [
  // Move to PERSUASION category
  { titleMatch: /Authority Bias/i, newCategory: 'persuasion', reason: 'Authority is a key persuasion principle' },
  { titleMatch: /Commitment.*Consistency/i, newCategory: 'persuasion', reason: 'Core persuasion principle' },
  { titleMatch: /Reciprocity/i, newCategory: 'persuasion', reason: 'Core persuasion principle' },
  { titleMatch: /Scarcity/i, newCategory: 'persuasion', reason: 'Core persuasion principle' },
  { titleMatch: /Social.*Proof/i, newCategory: 'persuasion', reason: 'Core persuasion principle' },
  { titleMatch: /Social.*Desirability/i, newCategory: 'persuasion', reason: 'Social influence principle' },

  // Move to VISUAL category
  { titleMatch: /Aesthetic.*Usability/i, newCategory: 'visual', reason: 'Visual aesthetic principle' },
  { titleMatch: /Visual.*Hierarchy/i, newCategory: 'visual', reason: 'Visual design principle' },
  { titleMatch: /Contrast.*Principle/i, newCategory: 'visual', reason: 'Visual design principle' },
  { titleMatch: /Cheerleader.*Effect/i, newCategory: 'visual', reason: 'Visual aesthetic principle' },
  { titleMatch: /Color.*Psychology/i, newCategory: 'visual', reason: 'Visual design principle' },

  // Move to USABILITY category
  { titleMatch: /Flow.*State/i, newCategory: 'usability', reason: 'User experience flow principle' },
  { titleMatch: /Delighters/i, newCategory: 'usability', reason: 'User experience principle' },
  { titleMatch: /Trigger/i, newCategory: 'usability', reason: 'User interaction principle' },
  { titleMatch: /Hick.*Law/i, newCategory: 'usability', reason: 'Interaction design principle' },
  { titleMatch: /Fitts.*Law/i, newCategory: 'usability', reason: 'Interaction design principle' },

  // Move to MEMORY category (expand this smaller category)
  { titleMatch: /Spacing.*Effect/i, newCategory: 'memory', reason: 'Memory retention principle' },
  { titleMatch: /Recognition.*Recall/i, newCategory: 'memory', reason: 'Memory principle' },
  { titleMatch: /Serial.*Position/i, newCategory: 'memory', reason: 'Memory principle' },
  { titleMatch: /Primacy.*Effect/i, newCategory: 'memory', reason: 'Memory principle' },
  { titleMatch: /Recency.*Effect/i, newCategory: 'memory', reason: 'Memory principle' },

  // Keep in ATTENTION category (but some may move)
  { titleMatch: /Von.*Restorff/i, newCategory: 'attention', reason: 'Attention/memory principle' },
  { titleMatch: /Cocktail.*Party/i, newCategory: 'attention', reason: 'Attention principle' },

  // Keep in DECISIONS category for true cognitive biases
  { titleMatch: /Anchoring/i, newCategory: 'decisions', reason: 'Decision-making bias' },
  { titleMatch: /Availability.*Heuristic/i, newCategory: 'decisions', reason: 'Decision-making heuristic' },
  { titleMatch: /Confirmation.*Bias/i, newCategory: 'decisions', reason: 'Decision-making bias' }
];

// Universal tags to add where missing (from the plan)
const UNIVERSAL_TAGS = {
  'mobile': ['responsive', 'touch', 'gesture', 'mobile-first'],
  'web': ['desktop', 'browser', 'online', 'website'],
  'accessibility': ['a11y', 'inclusive', 'disability', 'screen-reader'],
  'performance': ['speed', 'load-time', 'optimization', 'fast']
};

async function standardizeTags(currentTags: string[]): Promise<string[]> {
  const standardizedTags = currentTags.map(tag => {
    // Apply direct mappings
    if (TAG_STANDARDIZATION[tag]) {
      return TAG_STANDARDIZATION[tag];
    }

    // Convert to lowercase-with-hyphens format
    return tag.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  });

  // Remove duplicates and empty tags
  return [...new Set(standardizedTags)].filter(tag => tag.length > 0);
}

function categorizeprinciple(principle: any): {
  newCategory: CategoryName | null;
  reason: string
} {
  // Check against recategorization rules
  for (const rule of RECATEGORIZATION_RULES) {
    const titleMatches = typeof rule.titleMatch === 'string'
      ? principle.title.includes(rule.titleMatch)
      : rule.titleMatch.test(principle.title);

    if (titleMatches) {
      return { newCategory: rule.newCategory, reason: rule.reason };
    }
  }

  // Additional logic based on tags and type
  const principleText = `${principle.title} ${principle.type} ${(principle.tags || []).join(' ')}`.toLowerCase();

  // Persuasion patterns
  if (principleText.includes('authority') ||
      principleText.includes('social proof') ||
      principleText.includes('scarcity') ||
      principleText.includes('reciprocity') ||
      principleText.includes('commitment')) {
    return { newCategory: 'persuasion', reason: 'Contains persuasion keywords' };
  }

  // Visual patterns
  if (principleText.includes('aesthetic') ||
      principleText.includes('visual') ||
      principleText.includes('color') ||
      principleText.includes('design') && principleText.includes('visual')) {
    return { newCategory: 'visual', reason: 'Contains visual design keywords' };
  }

  // Memory patterns
  if (principleText.includes('memory') ||
      principleText.includes('recall') ||
      principleText.includes('recognition') ||
      principleText.includes('spacing')) {
    return { newCategory: 'memory', reason: 'Contains memory-related keywords' };
  }

  return { newCategory: null, reason: 'No recategorization needed' };
}

async function addUniversalTags(principle: any): Promise<string[]> {
  const currentTags = principle.tags || [];
  const newTags: string[] = [];

  // Analyze principle content to determine which universal tags to add
  const contentText = `${principle.title} ${principle.definition || ''} ${principle.oneLiner || ''}`.toLowerCase();

  // Check if mobile-related
  if (contentText.includes('mobile') || contentText.includes('touch') || contentText.includes('gesture')) {
    if (!currentTags.some(tag => tag.toLowerCase().includes('mobile'))) {
      newTags.push('mobile');
    }
  }

  // Check if web-related
  if (contentText.includes('web') || contentText.includes('browser') || contentText.includes('online')) {
    if (!currentTags.some(tag => tag.toLowerCase().includes('web'))) {
      newTags.push('web');
    }
  }

  // Check if accessibility-related
  if (contentText.includes('accessibility') || contentText.includes('inclusive') || contentText.includes('a11y')) {
    if (!currentTags.some(tag => ['accessibility', 'a11y', 'inclusive'].includes(tag.toLowerCase()))) {
      newTags.push('accessibility');
    }
  }

  // Check if performance-related
  if (contentText.includes('performance') || contentText.includes('speed') || contentText.includes('optimization')) {
    if (!currentTags.some(tag => ['performance', 'speed', 'optimization'].includes(tag.toLowerCase()))) {
      newTags.push('performance');
    }
  }

  return [...currentTags, ...newTags];
}

async function generateOptimizationPlan(): Promise<Array<{
  principleId: string;
  principleTitle: string;
  currentCategory: string;
  newCategory?: string;
  currentTags: string[];
  newTags: string[];
  changes: string[];
}>> {
  console.log('🔍 Analyzing all principles for optimization...\n');

  const allPrinciples = await DatabaseService.getPrinciples();
  const optimizationPlan: Array<{
    principleId: string;
    principleTitle: string;
    currentCategory: string;
    newCategory?: string;
    currentTags: string[];
    newTags: string[];
    changes: string[];
  }> = [];

  for (const principle of allPrinciples) {
    const changes: string[] = [];

    // Check for recategorization
    const { newCategory, reason } = categorizeprinciple(principle);

    // Standardize tags
    const standardizedTags = await standardizeTags(principle.tags || []);
    const tagsWithUniversal = await addUniversalTags({ ...principle, tags: standardizedTags });

    // Check if changes are needed
    const categoryChanged = newCategory && newCategory !== principle.category;
    const tagsChanged = JSON.stringify(standardizedTags.sort()) !== JSON.stringify((principle.tags || []).sort()) ||
                       JSON.stringify(tagsWithUniversal.sort()) !== JSON.stringify(standardizedTags.sort());

    if (categoryChanged || tagsChanged) {
      if (categoryChanged) {
        changes.push(`Category: ${principle.category} → ${newCategory} (${reason})`);
      }
      if (tagsChanged) {
        const tagChanges = tagsWithUniversal.filter(tag => !principle.tags?.includes(tag));
        if (tagChanges.length > 0) {
          changes.push(`Added tags: ${tagChanges.join(', ')}`);
        }
        const standardizedChanges = standardizedTags.filter(tag => !principle.tags?.includes(tag));
        if (standardizedChanges.length > 0 && standardizedChanges.length !== tagChanges.length) {
          changes.push(`Standardized tags: ${standardizedChanges.join(', ')}`);
        }
      }

      optimizationPlan.push({
        principleId: principle.id,
        principleTitle: principle.title,
        currentCategory: principle.category,
        newCategory: categoryChanged ? newCategory : undefined,
        currentTags: principle.tags || [],
        newTags: tagsWithUniversal,
        changes
      });
    }
  }

  return optimizationPlan;
}

async function previewOptimization(plan: Array<any>): Promise<void> {
  console.log(`📋 Optimization Preview (${plan.length} principles affected)`);
  console.log('='.repeat(60));

  // Group by type of change
  const recategorizations = plan.filter(p => p.newCategory);
  const tagUpdates = plan.filter(p => !p.newCategory);

  if (recategorizations.length > 0) {
    console.log(`\n🔄 Recategorizations (${recategorizations.length}):`);
    for (const item of recategorizations.slice(0, 10)) {
      console.log(`• ${item.principleTitle}`);
      console.log(`  ${item.currentCategory} → ${item.newCategory}`);
    }
    if (recategorizations.length > 10) {
      console.log(`  ... and ${recategorizations.length - 10} more`);
    }
  }

  if (tagUpdates.length > 0) {
    console.log(`\n🏷️  Tag Updates (${tagUpdates.length}):`);
    for (const item of tagUpdates.slice(0, 5)) {
      console.log(`• ${item.principleTitle}: ${item.changes.join('; ')}`);
    }
    if (tagUpdates.length > 5) {
      console.log(`  ... and ${tagUpdates.length - 5} more`);
    }
  }

  // Show category distribution after changes
  console.log('\n📊 New Category Distribution (estimated):');
  const categoryCount = new Map<string, number>();

  // Start with current counts
  const allPrinciples = await DatabaseService.getPrinciples();
  for (const principle of allPrinciples) {
    const currentCount = categoryCount.get(principle.category) || 0;
    categoryCount.set(principle.category, currentCount + 1);
  }

  // Apply planned changes
  for (const change of recategorizations) {
    // Remove from old category
    const oldCount = categoryCount.get(change.currentCategory) || 0;
    categoryCount.set(change.currentCategory, oldCount - 1);

    // Add to new category
    const newCount = categoryCount.get(change.newCategory!) || 0;
    categoryCount.set(change.newCategory!, newCount + 1);
  }

  // Show results
  const sortedCategories = Array.from(categoryCount.entries())
    .sort(([,a], [,b]) => b - a);

  for (const [category, count] of sortedCategories) {
    console.log(`  ${category.padEnd(12)} ${count.toString().padStart(3)} principles`);
  }
}

async function executeOptimization(plan: Array<any>): Promise<void> {
  console.log(`\n🚀 Executing optimization for ${plan.length} principles...`);

  let updated = 0;
  let errors = 0;

  for (const change of plan) {
    try {
      const updateData: any = {
        tags: change.newTags
      };

      if (change.newCategory) {
        updateData.category = change.newCategory;
      }

      await DatabaseService.updatePrinciple(change.principleId, updateData);
      console.log(`✅ Updated: ${change.principleTitle}`);
      updated++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.log(`❌ Failed to update ${change.principleTitle}: ${error}`);
      errors++;
    }
  }

  console.log(`\n📊 Optimization Results:`);
  console.log(`✅ Updated: ${updated} principles`);
  console.log(`❌ Errors: ${errors} principles`);
  console.log(`📈 Success rate: ${((updated / plan.length) * 100).toFixed(1)}%`);
}

async function main() {
  console.log('🎯 Categories & Tags Optimization');
  console.log('=================================\n');
  console.log('Implementing the approved optimization plan:\n');

  for (const [category, description] of Object.entries(NEW_CATEGORIES)) {
    console.log(`📂 ${category}: ${description}`);
  }

  console.log('\n🔧 Key Changes:');
  console.log('• Expand from 4 to 6 categories');
  console.log('• Add "persuasion" and "visual" categories');
  console.log('• Rebalance principle distribution');
  console.log('• Standardize tag naming (lowercase-with-hyphens)');
  console.log('• Merge duplicate tags');
  console.log('• Add universal tags (mobile, web, accessibility, performance)');

  try {
    // Generate optimization plan
    const plan = await generateOptimizationPlan();

    if (plan.length === 0) {
      console.log('\n✅ No optimization needed! Everything is already well-organized.');
      return;
    }

    // Preview changes
    await previewOptimization(plan);

    // Check command line arguments for auto-execution
    const autoExecute = process.argv.includes('--execute');

    if (autoExecute) {
      console.log('\n🚀 Auto-executing optimizations (--execute flag provided)...');
      await executeOptimization(plan);
      console.log('\n🎉 Categories and tags optimization complete!');
      console.log('\nNext steps:');
      console.log('1. Update frontend category filters');
      console.log('2. Test user experience and search');
      console.log('3. Update quiz generation for new categories');
    } else {
      console.log('\n📋 Preview complete. Run with --execute flag to apply changes:');
      console.log('npx tsx scripts/optimize-categories-tags.ts --execute');
    }

  } catch (error) {
    console.error('\n❌ Optimization failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Optimization cancelled!');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}