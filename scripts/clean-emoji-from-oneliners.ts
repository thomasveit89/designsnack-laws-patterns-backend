#!/usr/bin/env tsx

/**
 * Clean Emojis from One-Liners Script
 *
 * This script removes emojis that were incorrectly added to the oneLiner field
 * and restores the clean text descriptions.
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

async function cleanEmojiFromOneliners() {
  console.log('🧹 Starting emoji cleanup from one-liners...\n');

  try {
    // Get all principles
    const principles = await DatabaseService.getPrinciples();
    console.log(`Found ${principles.length} principles to clean\n`);

    let updatedCount = 0;
    const errors: string[] = [];

    for (const principle of principles) {
      try {
        // Remove emoji from the beginning of oneLiner (including common emojis and spaces)
        const cleanOneLiner = principle.oneLiner
          .replace(/^[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}]+\s*/u, '')
          .trim();

        // Only update if there was actually an emoji to remove
        if (cleanOneLiner !== principle.oneLiner) {
          await DatabaseService.updatePrinciple(principle.id, {
            oneLiner: cleanOneLiner
          });

          console.log(`✅ Cleaned "${principle.title}"`);
          console.log(`   Before: ${principle.oneLiner}`);
          console.log(`   After:  ${cleanOneLiner}\n`);
          updatedCount++;
        } else {
          console.log(`⚪ No emoji found in "${principle.title}"`);
        }

      } catch (error) {
        const errorMsg = `${principle.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ Error: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🧹 Emoji Cleanup Summary');
    console.log('='.repeat(50));
    console.log(`Total processed: ${principles.length}`);
    console.log(`Successfully cleaned: ${updatedCount}`);
    console.log(`No changes needed: ${principles.length - updatedCount - errors.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Success rate: ${principles.length > 0 ? (((updatedCount + principles.length - updatedCount - errors.length) / principles.length) * 100).toFixed(1) : 0}%`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }

    if (updatedCount > 0) {
      console.log('\n🎉 Emoji cleanup completed successfully!');
      console.log('💡 Next step: Update frontend emoji mapping');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  cleanEmojiFromOneliners().catch(console.error);
}