#!/usr/bin/env tsx

/**
 * Categories & Tags Audit Script
 * Analyze current categorization and tag usage for optimization
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

interface CategoryAudit {
  categoryName: string;
  principleCount: number;
  principles: Array<{
    id: string;
    title: string;
    type: string;
    tags: string[];
  }>;
}

interface TagAudit {
  tagName: string;
  usageCount: number;
  categories: string[];
  principles: string[];
}

async function auditCurrentCategories(): Promise<CategoryAudit[]> {
  const allPrinciples = await DatabaseService.getPrinciples();

  // Group principles by category
  const categoryGroups = new Map<string, any[]>();

  for (const principle of allPrinciples) {
    const category = principle.category || 'uncategorized';
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category)!.push(principle);
  }

  // Convert to audit format
  const categoryAudits: CategoryAudit[] = [];
  for (const [categoryName, principles] of categoryGroups.entries()) {
    categoryAudits.push({
      categoryName,
      principleCount: principles.length,
      principles: principles.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        tags: p.tags || []
      }))
    });
  }

  return categoryAudits.sort((a, b) => b.principleCount - a.principleCount);
}

async function auditCurrentTags(): Promise<TagAudit[]> {
  const allPrinciples = await DatabaseService.getPrinciples();

  // Collect all tags and their usage
  const tagUsage = new Map<string, {
    count: number;
    categories: Set<string>;
    principles: Set<string>;
  }>();

  for (const principle of allPrinciples) {
    const tags = principle.tags || [];
    const category = principle.category || 'uncategorized';

    for (const tag of tags) {
      if (!tagUsage.has(tag)) {
        tagUsage.set(tag, {
          count: 0,
          categories: new Set(),
          principles: new Set()
        });
      }

      const usage = tagUsage.get(tag)!;
      usage.count++;
      usage.categories.add(category);
      usage.principles.add(principle.title);
    }
  }

  // Convert to audit format
  const tagAudits: TagAudit[] = [];
  for (const [tagName, usage] of tagUsage.entries()) {
    tagAudits.push({
      tagName,
      usageCount: usage.count,
      categories: Array.from(usage.categories),
      principles: Array.from(usage.principles)
    });
  }

  return tagAudits.sort((a, b) => b.usageCount - a.usageCount);
}

function identifyMisplacedPrinciples(categoryAudits: CategoryAudit[]): Array<{
  principle: any;
  currentCategory: string;
  suggestedCategory: string;
  reason: string;
}> {
  const misplaced: Array<{
    principle: any;
    currentCategory: string;
    suggestedCategory: string;
    reason: string;
  }> = [];

  // Proposed categorization rules based on the plan
  const categorizationRules = {
    'attention': ['visual-hierarchy', 'contrast', 'scanning', 'focal-point', 'visual', 'design'],
    'memory': ['chunking', 'spacing', 'recall', 'memory', 'recognition', 'familiarity'],
    'decisions': ['cognitive-bias', 'heuristic', 'decision-making', 'choice', 'judgment'],
    'usability': ['interaction', 'interface', 'navigation', 'flow', 'user-experience'],
    'persuasion': ['scarcity', 'social-proof', 'authority', 'commitment', 'reciprocity'],
    'visual': ['aesthetic', 'color', 'typography', 'layout', 'composition']
  };

  for (const categoryAudit of categoryAudits) {
    for (const principle of categoryAudit.principles) {
      const currentCategory = categoryAudit.categoryName;
      let suggestedCategory = currentCategory;
      let reason = '';

      // Check if principle might belong to a different category based on tags/type
      const principleText = `${principle.title} ${principle.type} ${principle.tags.join(' ')}`.toLowerCase();

      for (const [category, keywords] of Object.entries(categorizationRules)) {
        const matchCount = keywords.filter(keyword =>
          principleText.includes(keyword.replace('-', ' ')) ||
          principleText.includes(keyword)
        ).length;

        if (matchCount > 0 && category !== currentCategory) {
          // Special cases from the plan
          if (principle.title.includes('Flow State') ||
              principle.title.includes('Trigger') ||
              principle.title.includes('Delighter')) {
            suggestedCategory = 'usability';
            reason = `Contains flow/trigger/delighter concepts (plan suggestion)`;
            break;
          }

          if (principle.title.includes('Aesthetic-Usability') ||
              principle.title.includes('Visual Hierarchy') ||
              principle.title.includes('Contrast')) {
            suggestedCategory = 'visual';
            reason = `Visual design principle (plan suggestion)`;
            break;
          }

          if (matchCount >= 2 || keywords.some(k => principleText.includes(k))) {
            suggestedCategory = category;
            reason = `Strong keyword match: ${keywords.filter(k => principleText.includes(k)).join(', ')}`;
            break;
          }
        }
      }

      if (suggestedCategory !== currentCategory) {
        misplaced.push({
          principle,
          currentCategory,
          suggestedCategory,
          reason
        });
      }
    }
  }

  return misplaced;
}

function identifyDuplicateTags(tagAudits: TagAudit[]): Array<{
  duplicateGroup: string[];
  suggestedTag: string;
  totalUsage: number;
}> {
  const duplicates: Array<{
    duplicateGroup: string[];
    suggestedTag: string;
    totalUsage: number;
  }> = [];

  // Known duplicates from the plan
  const knownDuplicates = [
    {
      group: ['decision making', 'decision-making'],
      suggested: 'decision-making'
    },
    {
      group: ['user experience', 'user-experience', 'ux'],
      suggested: 'user-experience'
    },
    {
      group: ['cognitive bias', 'cognitive-bias'],
      suggested: 'cognitive-bias'
    }
  ];

  for (const duplicate of knownDuplicates) {
    const matchingTags = tagAudits.filter(tag =>
      duplicate.group.includes(tag.tagName.toLowerCase())
    );

    if (matchingTags.length > 1) {
      duplicates.push({
        duplicateGroup: matchingTags.map(t => t.tagName),
        suggestedTag: duplicate.suggested,
        totalUsage: matchingTags.reduce((sum, t) => sum + t.usageCount, 0)
      });
    }
  }

  return duplicates;
}

async function generateAuditReport(): Promise<void> {
  console.log('📊 Categories & Tags Audit Report');
  console.log('=================================\n');

  // Get current state
  const categoryAudits = await auditCurrentCategories();
  const tagAudits = await auditCurrentTags();
  const totalPrinciples = categoryAudits.reduce((sum, c) => sum + c.principleCount, 0);

  // Current category distribution
  console.log('📈 Current Category Distribution');
  console.log('-------------------------------');
  for (const category of categoryAudits) {
    const percentage = ((category.principleCount / totalPrinciples) * 100).toFixed(1);
    console.log(`${category.categoryName.padEnd(15)} ${category.principleCount.toString().padStart(3)} principles (${percentage}%)`);
  }
  console.log(`${'TOTAL'.padEnd(15)} ${totalPrinciples.toString().padStart(3)} principles\n`);

  // Tag analysis
  console.log('🏷️  Tag Usage Analysis');
  console.log('----------------------');
  console.log(`Total unique tags: ${tagAudits.length}`);
  console.log('Top 10 most used tags:');
  tagAudits.slice(0, 10).forEach((tag, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${tag.tagName.padEnd(20)} ${tag.usageCount.toString().padStart(3)} uses`);
  });

  const singleUseTags = tagAudits.filter(t => t.usageCount === 1);
  console.log(`\nTags used only once: ${singleUseTags.length} (${((singleUseTags.length / tagAudits.length) * 100).toFixed(1)}%)`);

  // Show problematic category balance
  console.log('\n⚖️  Category Balance Issues');
  console.log('---------------------------');
  const targetRange = { min: 15, max: 25 }; // Ideal range for balanced categories
  const balanceIssues = categoryAudits.filter(c =>
    c.principleCount < targetRange.min || c.principleCount > targetRange.max
  );

  if (balanceIssues.length > 0) {
    for (const category of balanceIssues) {
      const issue = category.principleCount < targetRange.min ? 'TOO SMALL' : 'TOO LARGE';
      console.log(`${category.categoryName}: ${category.principleCount} principles - ${issue}`);
    }
  } else {
    console.log('✅ All categories are reasonably balanced');
  }

  // Identify misplaced principles
  console.log('\n🔄 Potentially Misplaced Principles');
  console.log('-----------------------------------');
  const misplaced = identifyMisplacedPrinciples(categoryAudits);
  if (misplaced.length > 0) {
    for (const item of misplaced.slice(0, 10)) { // Show first 10
      console.log(`"${item.principle.title}"`);
      console.log(`   ${item.currentCategory} → ${item.suggestedCategory}`);
      console.log(`   Reason: ${item.reason}`);
      console.log('');
    }
    if (misplaced.length > 10) {
      console.log(`... and ${misplaced.length - 10} more principles\n`);
    }
  } else {
    console.log('✅ No obviously misplaced principles detected\n');
  }

  // Identify duplicate tags
  console.log('🔍 Duplicate Tag Analysis');
  console.log('-------------------------');
  const duplicateTags = identifyDuplicateTags(tagAudits);
  if (duplicateTags.length > 0) {
    for (const duplicate of duplicateTags) {
      console.log(`Merge: [${duplicate.duplicateGroup.join(', ')}] → "${duplicate.suggestedTag}"`);
      console.log(`   Total usage: ${duplicate.totalUsage} principles\n`);
    }
  } else {
    console.log('✅ No obvious duplicate tags found\n');
  }

  // Recommendations
  console.log('💡 Optimization Recommendations');
  console.log('-------------------------------');
  console.log('Based on the approved plan:');
  console.log('1. Expand to 6 categories (current: ' + categoryAudits.length + ')');
  console.log('2. Add "persuasion" and "visual" categories');
  console.log('3. Rebalance principles across categories');
  console.log('4. Standardize tag naming (lowercase-with-hyphens)');
  console.log('5. Merge duplicate tags');
  console.log('6. Add missing universal tags (mobile, web, accessibility, performance)');

  console.log('\n📋 Detailed category contents:');
  console.log('------------------------------');
  for (const category of categoryAudits) {
    console.log(`\n${category.categoryName.toUpperCase()} (${category.principleCount} principles):`);
    for (const principle of category.principles.slice(0, 5)) {
      console.log(`   • ${principle.title} (${principle.type})`);
    }
    if (category.principles.length > 5) {
      console.log(`   ... and ${category.principles.length - 5} more`);
    }
  }

  console.log('\n✅ Audit complete! Ready to proceed with optimization.');
}

async function main() {
  console.log('🔍 Starting Categories & Tags Audit...\n');

  try {
    await generateAuditReport();
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}