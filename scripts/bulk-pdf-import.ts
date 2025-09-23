#!/usr/bin/env tsx

/**
 * Bulk PDF Principle Import Script
 *
 * This script processes a PDF of UX principles/laws and automatically generates
 * comprehensive principle entries using AI, then saves them to Supabase.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../lib/supabase';
import { OpenAIService } from '../lib/openai';
import { Principle } from '../lib/types';

// Create readline interface
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

interface BulkImportConfig {
  inputFile: string;
  batchSize: number;
  delayBetweenRequests: number;
  dryRun: boolean;
  startFrom: number;
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
  tags: string[];
  sources: string[];
}

// Parse command line arguments
function parseArguments(): BulkImportConfig {
  const args = process.argv.slice(2);
  const config: BulkImportConfig = {
    inputFile: '',
    batchSize: 5,
    delayBetweenRequests: 3000, // 3 seconds
    dryRun: false,
    startFrom: 0,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--file':
      case '-f':
        config.inputFile = args[++i];
        break;
      case '--batch-size':
      case '-b':
        config.batchSize = parseInt(args[++i]) || config.batchSize;
        break;
      case '--delay':
      case '-d':
        config.delayBetweenRequests = parseInt(args[++i]) || config.delayBetweenRequests;
        break;
      case '--start-from':
      case '-s':
        config.startFrom = parseInt(args[++i]) || config.startFrom;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
📄 Bulk PDF Principle Import Script

Usage: npx tsx scripts/bulk-pdf-import.ts [options]

Options:
  -f, --file <path>           Path to text file containing principles (required)
  -b, --batch-size <number>   Number of principles to process at once (default: 5)
  -d, --delay <number>        Delay between requests in ms (default: 3000)
  -s, --start-from <number>   Start from principle number (for resuming, default: 0)
  --dry-run                   Preview without actually saving to database
  -h, --help                  Show this help message

Input Format:
Your text file should contain principles separated by empty lines, like:

Fitts's Law
The time to acquire a target is a function of distance and size.

Miller's Rule
People can remember about 7 items in short-term memory.

Hick's Law
Decision time increases with the number of options.

Examples:
  npx tsx scripts/bulk-pdf-import.ts --file principles.txt
  npx tsx scripts/bulk-pdf-import.ts --file principles.txt --batch-size 3 --dry-run
  npx tsx scripts/bulk-pdf-import.ts --file principles.txt --start-from 10
  `);
}

// Parse principles from text file
function parsePrinciplesFromFile(filePath: string): { title: string; description?: string }[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split by double newlines (empty lines) to get principle blocks
    const blocks = content.split('\n\n').filter(block => block.trim().length > 0);

    const principles: { title: string; description?: string }[] = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length >= 1) {
        const title = lines[0];
        const description = lines.slice(1).join(' ').trim();

        principles.push({
          title,
          description: description || undefined
        });
      }
    }

    return principles;
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate comprehensive principle using AI
async function generatePrincipleContent(title: string, description?: string): Promise<AIGeneratedPrinciple> {
  const input = description ? `${title}: ${description}` : title;

  const prompt = `Create a comprehensive UX principle entry for: "${input}"

Please analyze this principle and generate a complete, professional entry with the following structure:

{
  "title": "Official name of the principle",
  "type": "ux_law" | "cognitive_bias" | "heuristic",
  "oneLiner": "A clear, memorable one-sentence summary",
  "definition": "Detailed 2-3 sentence explanation of what this principle means",
  "category": "attention" | "memory" | "decisions" | "usability",
  "appliesWhen": ["Situation 1", "Situation 2", "Situation 3"],
  "do": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],
  "dont": ["What to avoid 1", "What to avoid 2", "What to avoid 3"],
  "tags": ["relevant", "searchable", "keywords"],
  "sources": ["Author Name (Year)" | "Research Study" | "Book Title"]
}

Guidelines:
- Make the oneLiner memorable and practical
- Definition should be clear to designers and developers
- Category should be one of: attention, memory, decisions, usability
- Type should be: ux_law (design principles), cognitive_bias (human psychology), heuristic (rules of thumb)
- AppliesWhen should be specific design scenarios
- Do/Dont should be actionable advice
- Tags should be relevant for searching
- Sources should include the original research or key references

Return only valid JSON.`;

  try {
    const completion = await OpenAIService.generateCompletion(prompt, {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating principle content:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Convert AI-generated principle to database format
function aiToDbPrinciple(aiPrinciple: AIGeneratedPrinciple): Omit<Principle, 'id'> {
  return {
    type: aiPrinciple.type,
    title: aiPrinciple.title,
    oneLiner: aiPrinciple.oneLiner,
    definition: aiPrinciple.definition,
    appliesWhen: aiPrinciple.appliesWhen,
    do: aiPrinciple.do,
    dont: aiPrinciple.dont,
    tags: aiPrinciple.tags,
    category: aiPrinciple.category,
    sources: aiPrinciple.sources,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('📄 Bulk PDF Principle Import Script\n');

  try {
    // Parse command line arguments
    const config = parseArguments();

    if (!config.inputFile) {
      console.error('❌ Error: Input file is required. Use --file <path> or see --help');
      process.exit(1);
    }

    if (!fs.existsSync(config.inputFile)) {
      console.error(`❌ Error: File not found: ${config.inputFile}`);
      process.exit(1);
    }

    console.log('Configuration:', {
      inputFile: config.inputFile,
      batchSize: config.batchSize,
      delayBetweenRequests: config.delayBetweenRequests,
      startFrom: config.startFrom,
      dryRun: config.dryRun
    });
    console.log();

    // Parse principles from file
    console.log(`📖 Parsing principles from: ${config.inputFile}`);
    const rawPrinciples = parsePrinciplesFromFile(config.inputFile);
    console.log(`Found ${rawPrinciples.length} potential principles\n`);

    if (rawPrinciples.length === 0) {
      console.error('❌ No principles found in the file');
      process.exit(1);
    }

    // Show preview
    console.log('🔍 Preview of found principles:');
    rawPrinciples.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}${p.description ? ` - ${p.description.slice(0, 60)}...` : ''}`);
    });
    if (rawPrinciples.length > 5) {
      console.log(`... and ${rawPrinciples.length - 5} more`);
    }
    console.log();

    // Apply start-from filter
    const principlesToProcess = rawPrinciples.slice(config.startFrom);
    if (config.startFrom > 0) {
      console.log(`⏭️ Starting from principle #${config.startFrom + 1}`);
      console.log(`Processing ${principlesToProcess.length} remaining principles\n`);
    }

    if (!config.dryRun) {
      const confirmed = await askQuestion(`Do you want to proceed with importing ${principlesToProcess.length} principles? (y/N): `);
      if (confirmed.toLowerCase() !== 'y' && confirmed.toLowerCase() !== 'yes') {
        console.log('❌ Import cancelled.');
        rl.close();
        return;
      }
    }

    // Process principles in batches
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (let i = 0; i < principlesToProcess.length; i += config.batchSize) {
      const batch = principlesToProcess.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(principlesToProcess.length / config.batchSize);

      console.log(`\n📦 Processing Batch ${batchNum}/${totalBatches}`);
      console.log('='.repeat(50));

      for (const [index, rawPrinciple] of batch.entries()) {
        const principleNum = config.startFrom + i + index + 1;
        console.log(`\n🔄 [${principleNum}/${config.startFrom + principlesToProcess.length}] Processing: ${rawPrinciple.title}`);

        if (config.dryRun) {
          console.log('🏃 DRY RUN - Skipping actual processing');
          totalProcessed++;
          continue;
        }

        try {
          // Generate comprehensive content with AI
          const aiPrinciple = await generatePrincipleContent(rawPrinciple.title, rawPrinciple.description);
          console.log(`   ✅ Generated: ${aiPrinciple.type} | ${aiPrinciple.category}`);

          // Convert to database format
          const dbPrinciple = aiToDbPrinciple(aiPrinciple);

          // Save to database
          const savedPrinciple = await DatabaseService.createPrinciple(dbPrinciple);
          console.log(`   💾 Saved to database with ID: ${savedPrinciple.id}`);

          totalSuccess++;

          // Rate limiting delay
          if (index < batch.length - 1 || i + config.batchSize < principlesToProcess.length) {
            console.log(`   ⏳ Waiting ${config.delayBetweenRequests}ms...`);
            await sleep(config.delayBetweenRequests);
          }

        } catch (error) {
          const errorMsg = `${rawPrinciple.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`   ❌ Error: ${errorMsg}`);
          errors.push(errorMsg);
          totalErrors++;
        }

        totalProcessed++;
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary');
    console.log('='.repeat(60));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Successful imports: ${totalSuccess}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Success rate: ${totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : 0}%`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }

    if (!config.dryRun && totalSuccess > 0) {
      console.log('\n🎉 Import completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Generate quiz questions: npm run generate');
      console.log('   2. Test the new principles in your app');
      console.log('   3. Review and refine any problematic entries');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}