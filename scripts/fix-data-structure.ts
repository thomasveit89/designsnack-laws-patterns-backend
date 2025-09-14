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
  
  // Check partial matches
  if (categoryLower.includes('cognitive') || categoryLower.includes('bias')) {
    return 'decisions';
  }
  if (categoryLower.includes('usability') || categoryLower.includes('heuristic')) {
    return 'usability';
  }
  if (categoryLower.includes('attention') || categoryLower.includes('visual') || categoryLower.includes('design')) {
    return 'attention';
  }
  if (categoryLower.includes('memory') || categoryLower.includes('recall')) {
    return 'memory';
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
  
  // Remove duplicates and return
  return Array.from(new Set(tags));
}

function generateMissingAppliesWhen(principle: any): string[] {
  const contexts: string[] = [];
  
  // Add contexts based on type and common UX scenarios
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
  
  // Add specific contexts based on the principle name
  const title = principle.title.toLowerCase();
  if (title.includes('fitts')) {
    contexts.push('buttons', 'touch targets', 'navigation', 'mobile interfaces');
  } else if (title.includes('hick')) {
    contexts.push('menus', 'navigation', 'product catalogs', 'option selection');
  } else if (title.includes('miller')) {
    contexts.push('lists', 'menus', 'grouping', 'navigation');
  } else if (title.includes('anchoring')) {
    contexts.push('pricing', 'first impressions', 'comparisons', 'ratings');
  }
  
  return contexts.slice(0, 4); // Limit to 4 contexts
}

async function fixDataStructure() {
  console.log('🔧 Data Structure Fix Tool');
  console.log('===========================\n');

  try {
    const principles = await DatabaseService.getPrinciples();
    console.log(`📊 Found ${principles.length} principles to check\n`);

    const issuesFound: Array<{
      principle: any;
      issues: string[];
      fixes: any;
    }> = [];

    // Check each principle for structural issues
    for (const principle of principles) {
      const issues: string[] = [];
      const fixes: any = {};

      // Check category formatting and validity
      if (principle.category !== principle.category.toLowerCase()) {
        issues.push(`Category case: "${principle.category}" → "${principle.category.toLowerCase()}"`);
        fixes.category = fixCategory(principle.category, principle.type);
      } else if (!['usability', 'decisions', 'attention', 'memory'].includes(principle.category)) {
        const fixedCategory = fixCategory(principle.category, principle.type);
        issues.push(`Invalid category: "${principle.category}" → "${fixedCategory}"`);
        fixes.category = fixedCategory;
      }

      // Check for missing appliesWhen
      if (!principle.appliesWhen || principle.appliesWhen.length === 0) {
        issues.push('Missing appliesWhen contexts');
        fixes.appliesWhen = generateMissingAppliesWhen(principle);
      }

      // Check for missing tags
      if (!principle.tags || principle.tags.length === 0) {
        issues.push('Missing tags');
        fixes.tags = generateMissingTags(principle);
      }

      // Check for insufficient do/don't items
      if (!principle.do || principle.do.length < 3) {
        issues.push(`Insufficient do items: ${principle.do?.length || 0}`);
      }

      if (!principle.dont || principle.dont.length < 3) {
        issues.push(`Insufficient dont items: ${principle.dont?.length || 0}`);
      }

      // Check for missing sources
      if (!principle.sources || principle.sources.length === 0) {
        issues.push('Missing sources/references');
      }

      if (issues.length > 0) {
        issuesFound.push({ principle, issues, fixes });
      }
    }

    if (issuesFound.length === 0) {
      console.log('✅ No structural issues found! All principles have consistent data structure.');
      return;
    }

    console.log(`🔍 Found ${issuesFound.length} principles with structural issues:\n`);

    // Show issues summary
    issuesFound.forEach((item, i) => {
      console.log(`${i + 1}. ${item.principle.title}`);
      item.issues.forEach(issue => console.log(`   • ${issue}`));
    });

    console.log('\n🔧 Available fixes:');
    console.log('===================');

    const autoFixable = issuesFound.filter(item => Object.keys(item.fixes).length > 0);
    if (autoFixable.length > 0) {
      console.log(`\n📝 ${autoFixable.length} principles can be auto-fixed:`);
      autoFixable.forEach(item => {
        console.log(`\n• ${item.principle.title}:`);
        if (item.fixes.category) {
          console.log(`  - Category: "${item.principle.category}" → "${item.fixes.category}"`);
        }
        if (item.fixes.appliesWhen) {
          console.log(`  - Add appliesWhen: ${item.fixes.appliesWhen.join(', ')}`);
        }
        if (item.fixes.tags) {
          console.log(`  - Add tags: ${item.fixes.tags.join(', ')}`);
        }
      });

      const autoFix = await askQuestion('\n💾 Apply auto-fixes to these principles? (y/n): ');
      
      if (autoFix.toLowerCase().startsWith('y')) {
        console.log('\n🔄 Applying fixes...');
        
        for (const item of autoFixable) {
          try {
            await DatabaseService.updatePrinciple(item.principle.id, item.fixes);
            console.log(`✅ Fixed: ${item.principle.title}`);
          } catch (error) {
            console.log(`❌ Failed to fix ${item.principle.title}: ${error}`);
          }
        }
        
        console.log('\n🎉 Auto-fixes applied!');
      }
    }

    const manualFixNeeded = issuesFound.filter(item => 
      item.issues.some(issue => 
        issue.includes('Insufficient do items') || 
        issue.includes('Insufficient dont items') || 
        issue.includes('Missing sources')
      )
    );
    
    if (manualFixNeeded.length > 0) {
      console.log(`\n⚠️  ${manualFixNeeded.length} principles need manual content improvement:`);
      manualFixNeeded.forEach(item => console.log(`• ${item.principle.title}`));
      console.log('\n💡 Use "npm run audit-content" to generate AI improvements for these.');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Fix cancelled!');
  rl.close();
  process.exit(0);
});

fixDataStructure().catch(console.error);