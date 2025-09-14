#!/usr/bin/env tsx

/**
 * Quick Seeding Script
 * Seeds the database with principles from the mobile app
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import { Principle } from '../lib/types';

// Import principles from the mobile app  
const PRINCIPLES_FILE = path.resolve(__dirname, '../../designsnack-laws-patterns/src/data/principles.json');

async function main() {
  console.log('🌱 Quick seeding database with principles...\n');

  try {
    // Check if principles file exists
    if (!fs.existsSync(PRINCIPLES_FILE)) {
      console.error(`❌ Principles file not found at: ${PRINCIPLES_FILE}`);
      console.error('❌ Could not locate principles.json file');
      process.exit(1);
    } else {
      console.log(`✅ Found principles file at: ${PRINCIPLES_FILE}`);
      await seedFromFile(PRINCIPLES_FILE);
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function seedFromFile(filePath: string) {
  // Load principles from mobile app
  console.log(`📚 Loading principles from: ${filePath}`);
  const principlesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const principles: Principle[] = Array.isArray(principlesData) ? principlesData : principlesData.principles;

  if (!principles || principles.length === 0) {
    console.error('❌ No principles found in the data file.');
    process.exit(1);
  }

  console.log(`Found ${principles.length} principles to seed\n`);

  // Check existing principles
  console.log('🔍 Checking existing principles...');
  const existingPrinciples = await DatabaseService.getPrinciples();
  
  if (existingPrinciples.length > 0) {
    console.log(`Found ${existingPrinciples.length} existing principles`);
  }

  // Add new principles
  const existingIds = new Set(existingPrinciples.map(p => p.id));
  const newPrinciples = principles.filter(p => !existingIds.has(p.id));
  
  if (newPrinciples.length === 0) {
    console.log('✅ All principles already exist in database.');
    
    // Show stats
    const stats = await DatabaseService.getQuestionStats();
    console.log(`\nDatabase contains: ${existingPrinciples.length} principles, ${stats.totalQuestions} questions`);
    return;
  }

  console.log(`\n🌱 Adding ${newPrinciples.length} new principles...`);

  let successCount = 0;
  let errorCount = 0;

  for (const principle of newPrinciples) {
    try {
      await DatabaseService.createPrinciple(principle);
      successCount++;
      console.log(`  ✅ ${principle.title}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ ${principle.title}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\n📊 Results: ${successCount} added, ${errorCount} failed`);
  
  // Final stats
  const finalPrinciples = await DatabaseService.getPrinciples();
  const stats = await DatabaseService.getQuestionStats();
  
  console.log('\n📈 Database Summary:');
  console.log(`  Principles: ${finalPrinciples.length}`);
  console.log(`  Questions: ${stats.totalQuestions}`);
  
  console.log('\n🎉 Database seeding completed!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}