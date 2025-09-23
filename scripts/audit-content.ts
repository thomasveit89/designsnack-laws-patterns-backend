#!/usr/bin/env tsx

/**
 * AI-Powered Content Quality Audit
 * Review and improve existing principles and questions
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

interface ContentQualityReport {
  principleId: string;
  principleTitle: string;
  issues: string[];
  suggestions: string[];
  qualityScore: number;
  recommendations: {
    updatePrinciple?: boolean;
    addQuestions?: boolean;
    improveQuestions?: boolean;
  };
}

function checkStructuralQuality(principle: any): string[] {
  const issues: string[] = [];
  
  // Check for missing or empty required fields
  if (!principle.appliesWhen || principle.appliesWhen.length === 0) {
    issues.push('Missing appliesWhen contexts');
  }
  
  if (!principle.tags || principle.tags.length === 0) {
    issues.push('Missing tags');
  }
  
  if (!principle.sources || principle.sources.length === 0) {
    issues.push('Missing sources/references');
  }
  
  if (!principle.do || principle.do.length < 3) {
    issues.push(`Insufficient do items (${principle.do?.length || 0}/4 recommended)`);
  }
  
  if (!principle.dont || principle.dont.length < 3) {
    issues.push(`Insufficient dont items (${principle.dont?.length || 0}/4 recommended)`);
  }
  
  // Check for inconsistent formatting
  if (principle.category && principle.category !== principle.category.toLowerCase()) {
    issues.push(`Category should be lowercase: "${principle.category}" → "${principle.category.toLowerCase()}"`);
  }
  
  // Check for proper category values
  const validCategories = ['usability', 'decisions', 'attention', 'memory', 'persuasion', 'visual'];
  if (principle.category && !validCategories.includes(principle.category.toLowerCase())) {
    const suggestion = getSuggestedCategory(principle.category, principle.type);
    issues.push(`Invalid category "${principle.category}" → suggested: "${suggestion}"`);
  }
  
  // Check oneLiner length
  if (principle.oneLiner && principle.oneLiner.length > 100) {
    issues.push(`One-liner too long (${principle.oneLiner.length}/100 chars)`);
  }
  
  // Check if example exists but is incomplete
  if (principle.example && (!principle.example.caption || principle.example.caption.length < 10)) {
    issues.push('Incomplete or too short example caption');
  }
  
  return issues;
}

function getSuggestedCategory(currentCategory: string, principleType: string): string {
  const categoryLower = currentCategory.toLowerCase();
  
  // Map common category names to our standard ones
  if (categoryLower.includes('cognitive') || categoryLower.includes('bias')) {
    return 'decisions';
  }
  if (categoryLower.includes('heuristic') || categoryLower.includes('usability')) {
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

async function auditPrinciple(principle: any): Promise<ContentQualityReport> {
  const questions = await DatabaseService.getQuestions({
    principleIds: [principle.id],
    minQualityScore: 0
  });

  // First check for structural data quality issues
  const structuralIssues = checkStructuralQuality(principle);

  const auditPrompt = `You are a UX education quality auditor. Review this UX principle and its quiz questions for educational quality.

PRINCIPLE TO AUDIT:
Title: ${principle.title}
Type: ${principle.type}
Category: ${principle.category}
One-liner: ${principle.oneLiner}
Definition: ${principle.definition}

Do Items: ${JSON.stringify(principle.do_items)}
Don't Items: ${JSON.stringify(principle.dont_items)}
Examples: ${JSON.stringify(principle.examples)}

ASSOCIATED QUESTIONS (${questions.length} total):
${questions.map(q => `Q: ${q.question}\nOptions: ${q.options.join(', ')}\nCorrect: ${q.options[q.correctAnswer]}\nDifficulty: ${q.difficulty}`).join('\n\n')}

Please provide a comprehensive quality audit in JSON format:
{
  "qualityScore": 1-10,
  "issues": [
    "Specific issues found (e.g., unclear definition, weak examples, confusing questions)"
  ],
  "suggestions": [
    "Specific improvement suggestions"
  ],
  "recommendations": {
    "updatePrinciple": boolean,
    "addQuestions": boolean,
    "improveQuestions": boolean
  }
}

Focus on:
- Clarity and accuracy of definitions
- Quality of examples and practical guidance
- Question difficulty appropriateness
- Answer option quality (not too obvious, not misleading)
- Educational value and real-world applicability`;

  try {
    const completion = await OpenAIService.generateCompletion(auditPrompt, {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No audit content received');
    }

    const auditData = JSON.parse(content);
    
    // Combine structural issues with AI-generated issues
    const allIssues = [...structuralIssues, ...(auditData.issues || [])];
    
    // Reduce quality score for structural issues (each structural issue reduces score by 0.5)
    const structuralPenalty = Math.min(3, structuralIssues.length * 0.5);
    const adjustedScore = Math.max(1, (auditData.qualityScore || 5) - structuralPenalty);
    
    return {
      principleId: principle.id,
      principleTitle: principle.title,
      issues: allIssues,
      suggestions: auditData.suggestions || [],
      qualityScore: adjustedScore,
      recommendations: auditData.recommendations || {}
    };

  } catch (error) {
    console.warn(`⚠️ Audit failed for ${principle.title}:`, error);
    return {
      principleId: principle.id,
      principleTitle: principle.title,
      issues: ['Audit failed - manual review needed'],
      suggestions: [],
      qualityScore: 5,
      recommendations: {}
    };
  }
}

async function generateImprovements(report: ContentQualityReport, principle: any): Promise<any> {
  const improvementPrompt = `Based on this quality audit, generate improved content for the UX principle.

ORIGINAL PRINCIPLE:
${JSON.stringify(principle, null, 2)}

QUALITY AUDIT RESULTS:
Quality Score: ${report.qualityScore}/10
Issues: ${report.issues.join(', ')}
Suggestions: ${report.suggestions.join(', ')}

Generate improved content addressing the identified issues. Return JSON in this format:
{
  "title": "Improved title (if needed)",
  "oneLiner": "Improved one-liner (under 100 chars)",
  "definition": "Clearer, more comprehensive definition",
  "do_items": ["Improved actionable do items"],
  "dont_items": ["Improved actionable don't items"],  
  "examples": [
    {
      "title": "Better Example 1",
      "description": "More concrete example",
      "context": "Specific context"
    }
  ],
  "improvements_made": ["List of specific improvements"]
}

Keep the core concept intact while improving clarity, examples, and practical guidance.`;

  try {
    const completion = await OpenAIService.generateCompletion(improvementPrompt, {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No improvement content received');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to generate improvements:', error);
    return null;
  }
}

async function selectAuditScope(): Promise<{
  principles: any[];
  auditType: 'quick' | 'detailed';
}> {
  console.log('📊 Content Quality Audit Options:');
  console.log('=================================');
  console.log('1. Quick audit (quality scores only)');
  console.log('2. Detailed audit (with improvement suggestions)');
  
  const auditTypeInput = await askQuestion('\nSelect audit type (1-2, default: 1): ');
  const auditType = auditTypeInput === '2' ? 'detailed' : 'quick';

  const allPrinciples = await DatabaseService.getPrinciples();
  console.log(`\nFound ${allPrinciples.length} principles to audit`);

  console.log('\nAudit scope options:');
  console.log('1. All principles');
  console.log('2. Low quality only (will identify after quick scan)');
  console.log('3. Select specific principles');
  console.log('4. Search by name/category');

  const scopeInput = await askQuestion('Select scope (1-4, default: 1): ');
  
  let selectedPrinciples = allPrinciples;
  
  if (scopeInput === '2') {
    // For now, audit all - we'll filter by quality score after audit
    console.log('Will focus on principles that score below 7/10');
  } else if (scopeInput === '3') {
    selectedPrinciples = await selectSpecificPrinciples(allPrinciples);
  } else if (scopeInput === '4') {
    selectedPrinciples = await searchAndSelectPrinciples(allPrinciples);
  }

  return { principles: selectedPrinciples, auditType };
}

async function selectSpecificPrinciples(allPrinciples: any[]): Promise<any[]> {
  console.log('\nAvailable principles:');
  console.log('====================');
  
  allPrinciples.forEach((p, i) => {
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${p.title} (${p.type})`);
    console.log(`    Category: ${p.category}`);
  });

  console.log('\nSelection options:');
  console.log('- Enter numbers (e.g., "1,3,5" for multiple principles)');
  console.log('- Enter ranges (e.g., "1-5" for principles 1 through 5)');
  console.log('- Enter "all" for all principles');
  
  const selection = await askQuestion('\nSelect principles: ');
  
  if (selection.toLowerCase() === 'all') {
    return allPrinciples;
  }
  
  // Handle ranges and numbers
  const selectedPrinciples: any[] = [];
  const parts = selection.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    if (trimmed.includes('-')) {
      // Handle range like "1-5"
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()) - 1);
      for (let i = start; i <= end && i < allPrinciples.length; i++) {
        if (i >= 0 && !selectedPrinciples.find(p => p.id === allPrinciples[i].id)) {
          selectedPrinciples.push(allPrinciples[i]);
        }
      }
    } else {
      // Handle single number
      const index = parseInt(trimmed) - 1;
      if (index >= 0 && index < allPrinciples.length) {
        if (!selectedPrinciples.find(p => p.id === allPrinciples[index].id)) {
          selectedPrinciples.push(allPrinciples[index]);
        }
      }
    }
  }
  
  return selectedPrinciples;
}

async function searchAndSelectPrinciples(allPrinciples: any[]): Promise<any[]> {
  const searchTerm = await askQuestion('\nEnter search term (title or category): ');
  const searchLower = searchTerm.toLowerCase();
  
  const matchingPrinciples = allPrinciples.filter(p => 
    p.title.toLowerCase().includes(searchLower) ||
    p.category.toLowerCase().includes(searchLower) ||
    p.type.toLowerCase().includes(searchLower)
  );

  if (matchingPrinciples.length === 0) {
    console.log(`❌ No principles found matching "${searchTerm}"`);
    return [];
  }

  console.log(`\n🔍 Found ${matchingPrinciples.length} matching principles:`);
  console.log('=============================================');
  
  matchingPrinciples.forEach((p, i) => {
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${p.title} (${p.type})`);
    console.log(`    Category: ${p.category}`);
  });

  console.log('\nSelection options:');
  console.log('- Enter numbers (e.g., "1,3" for specific matches)');
  console.log('- Enter "all" to audit all matches');
  console.log('- Press Enter to audit all matches');
  
  const selection = await askQuestion('\nSelect from matches: ');
  
  if (!selection || selection.toLowerCase() === 'all') {
    return matchingPrinciples;
  }

  const numbers = selection.split(',').map(n => parseInt(n.trim()) - 1);
  return numbers.map(i => matchingPrinciples[i]).filter(Boolean);
}

async function runContentAudit(): Promise<void> {
  const { principles, auditType } = await selectAuditScope();
  
  console.log(`\n🔍 Starting ${auditType} audit of ${principles.length} principles...\n`);

  const reports: ContentQualityReport[] = [];
  let processed = 0;

  for (const principle of principles) {
    try {
      console.log(`📝 Auditing: ${principle.title}`);
      const report = await auditPrinciple(principle);
      reports.push(report);
      
      console.log(`   Quality Score: ${report.qualityScore}/10`);
      if (report.issues.length > 0) {
        console.log(`   Issues: ${report.issues.length}`);
      }
      
      processed++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Generate summary report
  console.log('\n📊 Content Quality Audit Results');
  console.log('=================================');
  
  const avgScore = reports.reduce((sum, r) => sum + r.qualityScore, 0) / reports.length;
  const lowQuality = reports.filter(r => r.qualityScore < 7);
  const highQuality = reports.filter(r => r.qualityScore >= 8);
  
  console.log(`✅ Audited: ${processed} principles`);
  console.log(`📈 Average Quality: ${avgScore.toFixed(1)}/10`);
  console.log(`🔴 Low Quality (<7): ${lowQuality.length}`);
  console.log(`🟢 High Quality (8+): ${highQuality.length}`);

  // Show detailed results for low quality items
  if (lowQuality.length > 0) {
    console.log('\n🔴 Principles Needing Improvement:');
    console.log('==================================');
    
    for (const report of lowQuality) {
      console.log(`\n${report.principleTitle} (${report.qualityScore}/10)`);
      if (report.issues.length > 0) {
        console.log(`   Issues: ${report.issues.slice(0, 2).join(', ')}${report.issues.length > 2 ? '...' : ''}`);
      }
      if (report.suggestions.length > 0) {
        console.log(`   Suggestions: ${report.suggestions.slice(0, 1).join('')}`);
      }
    }

    if (auditType === 'detailed') {
      const improveInput = await askQuestion('\n🔧 Generate improvements for low-quality principles? (y/n): ');
      if (improveInput.toLowerCase().startsWith('y')) {
        await generateImprovementsForPrinciples(lowQuality, principles);
      }
    }
  }

  // Show top performers
  if (highQuality.length > 0) {
    console.log('\n🟢 Top Quality Principles:');
    console.log('==========================');
    highQuality
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 5)
      .forEach(report => {
        console.log(`   ${report.principleTitle} (${report.qualityScore}/10)`);
      });
  }
}

async function generateImprovementsForPrinciples(reports: ContentQualityReport[], allPrinciples: any[]): Promise<void> {
  console.log(`\n🔧 Generating improvements for ${reports.length} principles...\n`);

  const improvedPrinciples: Array<{
    originalPrinciple: any;
    improvements: any;
    report: ContentQualityReport;
  }> = [];

  for (const report of reports) {
    try {
      const principle = allPrinciples.find(p => p.id === report.principleId);
      if (!principle) continue;

      console.log(`💡 Improving: ${report.principleTitle}`);
      const improvements = await generateImprovements(report, principle);
      
      if (improvements) {
        console.log(`   ✅ Generated improvements`);
        console.log(`   📝 Changes: ${improvements.improvements_made?.join(', ') || 'Content enhanced'}`);
        
        improvedPrinciples.push({
          originalPrinciple: principle,
          improvements,
          report
        });
        
        console.log(`   📋 (Ready for review and saving)`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // After generating all improvements, offer to save them
  if (improvedPrinciples.length > 0) {
    await reviewAndSaveImprovements(improvedPrinciples);
  }
}

async function reviewAndSaveImprovements(improvedPrinciples: Array<{
  originalPrinciple: any;
  improvements: any;
  report: ContentQualityReport;
}>): Promise<void> {
  console.log(`\n🔍 Review Generated Improvements:`);
  console.log('===================================');
  
  for (let i = 0; i < improvedPrinciples.length; i++) {
    const { originalPrinciple, improvements, report } = improvedPrinciples[i];
    
    console.log(`\n${i + 1}/${improvedPrinciples.length} - ${originalPrinciple.title} (Quality: ${report.qualityScore}/10)`);
    console.log('─'.repeat(50));
    
    // Show key improvements
    if (improvements.oneLiner !== originalPrinciple.oneLiner) {
      console.log(`📝 One-liner: "${originalPrinciple.oneLiner}" → "${improvements.oneLiner}"`);
    }
    
    if (improvements.definition !== originalPrinciple.definition) {
      console.log(`📖 Definition improved (${improvements.definition.length} chars)`);
    }
    
    if (improvements.do_items?.length !== originalPrinciple.do?.length) {
      console.log(`✅ Do items: ${originalPrinciple.do?.length || 0} → ${improvements.do_items?.length || 0}`);
    }
    
    if (improvements.dont_items?.length !== originalPrinciple.dont?.length) {
      console.log(`❌ Don't items: ${originalPrinciple.dont?.length || 0} → ${improvements.dont_items?.length || 0}`);
    }

    // Ask for confirmation for this specific principle
    const saveThis = await askQuestion(`\n💾 Save improvements for "${originalPrinciple.title}"? (y/n/s=skip): `);
    
    if (saveThis.toLowerCase().startsWith('y')) {
      try {
        // Convert improvements to the correct format for database
        const updateData: Partial<Omit<any, 'id'>> = {
          title: improvements.title || originalPrinciple.title,
          oneLiner: improvements.oneLiner || originalPrinciple.oneLiner,
          definition: improvements.definition || originalPrinciple.definition,
          appliesWhen: improvements.appliesWhen || originalPrinciple.appliesWhen,
          do: improvements.do_items || originalPrinciple.do,
          dont: improvements.dont_items || originalPrinciple.dont,
          tags: improvements.tags || originalPrinciple.tags,
          sources: improvements.sources || originalPrinciple.sources
        };

        await DatabaseService.updatePrinciple(originalPrinciple.id, updateData);
        console.log(`   ✅ Saved improvements for "${originalPrinciple.title}"`);
      } catch (error) {
        console.log(`   ❌ Failed to save: ${error instanceof Error ? error.message : error}`);
      }
    } else if (saveThis.toLowerCase().startsWith('s')) {
      console.log(`   ⏭️  Skipped "${originalPrinciple.title}"`);
    } else {
      console.log(`   🚫 Not saving "${originalPrinciple.title}"`);
    }
  }
  
  console.log(`\n🎉 Improvement review complete!`);
}

async function main() {
  console.log('🔍 AI-Powered Content Quality Audit');
  console.log('====================================\n');

  try {
    await runContentAudit();
    
    console.log('\n🎉 Content audit complete!');
    console.log('\nNext steps:');
    console.log('1. Review flagged content manually');
    console.log('2. Use generated improvements to update principles'); 
    console.log('3. Run "expand-questions" for principles with few questions');
    console.log('4. Re-run audit after improvements');

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Audit cancelled!');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}