#!/usr/bin/env tsx

/**
 * Update Principle Emojis Script
 *
 * This script assigns unique, relevant emojis to each principle based on their content
 * and category, replacing the generic book emoji with more engaging icons.
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import { Principle } from '../lib/types';

// Emoji mapping based on principle themes and content
const EMOJI_MAP: Record<string, string> = {
  // Attention-based principles
  'Von Restorff Effect': '🌟',
  'Visual Hierarchy': '📊',
  'Visual Anchors': '⚓',
  'Selective Attention': '🎯',
  'Attentional Bias': '👀',
  'Contrast': '⚡',
  'Signifiers': '🚩',
  'Juxtaposition': '🔗',
  'Spotlight Effect': '💡',
  'Cheerleader Effect': '👥',
  'Curiosity Gap': '🕳️',
  'Barnum-Forer Effect': '🔮',
  'Aha! Moment': '💡',

  // Decision-making principles
  'Hick\'s Law': '⚖️',
  'Confirmation Bias': '🔍',
  'Anchoring Bias': '⚓',
  'Decoy Effect': '🎭',
  'Centre-Stage Effect': '🎪',
  'Framing': '🖼️',
  'Aesthetic-Usability Effect': '✨',
  'Authority Bias': '👑',
  'Affect Heuristic': '❤️',
  'Cashless Effect': '💳',
  'Backfire Effect': '🔙',
  'Choice Overload': '🤯',
  'Cognitive Dissonance': '🤔',
  'Commitment and Consistency Principle': '🤝',
  'Decision Fatigue': '😴',
  'Reactance': '🛑',
  'Hyperbolic Discounting': '📉',
  'Self-serving Bias': '🪞',
  'Fresh Start Effect': '🌱',
  'Default Bias': '⭐',
  'Expectations Bias': '🔮',
  'Survivorship Bias': '🏆',
  'Empathy Gap': '💭',
  'Hindsight Bias': '👁️',
  'Temptation Coupling': '🍯',
  'Noble Edge Effect': '🌍',
  'Observer-Expectancy Effect': '🔬',
  'False Consensus Effect': '👫',
  'Negativity Bias': '⚠️',
  'Social Proof': '👥',
  'Scarcity': '⏰',
  'Reciprocity': '🤝',
  'Availability Heuristic': '🧠',

  // Memory-based principles
  'Miller\'s Law': '7️⃣',
  'Chunking': '📦',
  'Picture Superiority Effect': '🖼️',
  'Method of Loci': '🗺️',
  'Spacing Effect': '📅',
  'Serial Position Effect': '📝',
  'Zeigarnik Effect': '⏸️',
  'Recognition Over Recall': '👁️',
  'Storytelling Effect': '📚',

  // Usability principles
  'Fitts\'s Law': '🎯',
  'Tesler\'s Law': '⚖️',
  'Progressive Disclosure': '📖',
  'Nudge': '👉',
  'Feedback Loop': '🔄',
  'Flow State': '🌊',
  'Skeuomorphism': '📱',
  'Spark Effect': '⚡',
  'Provide Exit Points': '🚪',
  'Sensory Appeal': '✨',
  'Endowment Effect': '💎',
  'Delighters': '🎉',
  'Internal Trigger': '🔔',
  'External Trigger': '📢',
  'Self-Initiated Triggers': '⏰',
  'Shaping': '🎨',
  'Consistency & Standards': '📏',
  'Cognitive Load': '🧠',
  'Curse of Knowledge': '🎓',
  'Discoverability': '🔍',
  'Mental Model': '🧠',
  'Familiarity Bias': '🏠',
  'Halo Effect': '😇',
  'Unit Bias': '1️⃣',
  'Labor Illusion': '🔨',
  'Investment Loops': '💰',
  'Loss Aversion': '📉',
  'Sunk Cost Effect': '💸',
  'Weber\'s Law': '📊',
  'Law of the Instrument': '🔨',
  'Dunning-Kruger Effect': '🎭',
  'Parkinson\'s Law': '⏱️',
  'Pareto Principle': '📈',
  'Peak-End Rule': '🎢',
  'IKEA Effect': '🛠️',

  // New psychology principles
  'Planning Fallacy': '📅',
  'Goal Gradient Effect': '🏁',
  'Feedforward': '📡',
  'Occam\'s Razor': '🗡️',
  'Law of Similarity': '🔗',
  'Law of Prägnanz': '🎯',
  'Law of Proximity': '📍',
  'Pseudo-Set Framing': '📦',
  'Variable Reward': '🎰',
  'Survey Bias': '📊',
  'Sensory Adaptation': '👂',
  'Priming': '🎭'
};

// Fallback emojis for categories if specific principle doesn't have one
const CATEGORY_FALLBACKS: Record<string, string[]> = {
  attention: ['👀', '🎯', '💡', '⚡', '🌟', '📊', '🔍', '👁️'],
  decisions: ['🤔', '⚖️', '🎯', '🧠', '💭', '🔮', '⭐', '🤝'],
  memory: ['🧠', '💭', '📚', '🗂️', '💾', '📝', '🎯', '📖'],
  usability: ['🚀', '⚡', '🎨', '🔧', '📱', '💎', '🎉', '🔄']
};

async function getUnusedEmojiForCategory(category: string, usedEmojis: Set<string>): Promise<string> {
  const fallbacks = CATEGORY_FALLBACKS[category] || ['📚'];

  for (const emoji of fallbacks) {
    if (!usedEmojis.has(emoji)) {
      return emoji;
    }
  }

  // If all fallbacks are used, return the first one (some duplication is okay)
  return fallbacks[0];
}

async function updatePrincipleEmojis() {
  console.log('🎨 Starting emoji update process...\n');

  try {
    // Get all principles
    const principles = await DatabaseService.getPrinciples();
    console.log(`Found ${principles.length} principles to update\n`);

    const usedEmojis = new Set<string>();
    let updatedCount = 0;
    const errors: string[] = [];

    for (const principle of principles) {
      try {
        // Get emoji from map or generate one for the category
        let emoji = EMOJI_MAP[principle.title];

        if (!emoji) {
          emoji = await getUnusedEmojiForCategory(principle.category, usedEmojis);
        }

        usedEmojis.add(emoji);

        // Update principle with emoji
        const updatedPrinciple: Partial<Principle> = {
          id: principle.id,
          // Add emoji to the one-liner or create a separate field
          oneLiner: `${emoji} ${principle.oneLiner.replace(/^[📚📋🔧⚡🎯👀💭🚀]\s*/, '')}`
        };

        await DatabaseService.updatePrinciple(principle.id, updatedPrinciple);
        console.log(`✅ Updated "${principle.title}" with ${emoji}`);
        updatedCount++;

      } catch (error) {
        const errorMsg = `${principle.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ Error: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎨 Emoji Update Summary');
    console.log('='.repeat(50));
    console.log(`Total processed: ${principles.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Success rate: ${principles.length > 0 ? ((updatedCount / principles.length) * 100).toFixed(1) : 0}%`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }

    if (updatedCount > 0) {
      console.log('\n🎉 Emoji update completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Deploy the updated API to see changes');
      console.log('   2. Test the app to see the new emojis');
      console.log('   3. Adjust any emojis that don\'t look right');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  updatePrincipleEmojis().catch(console.error);
}