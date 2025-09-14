#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';
import { Principle } from '../lib/types';
import { randomUUID } from 'crypto';

async function testPrincipleCreation() {
  console.log('🧪 Testing principle creation...');

  const testPrinciple: Omit<Principle, 'id'> = {
    title: 'Test Nudging Principle',
    type: 'heuristic', // Valid type from our schema
    oneLiner: 'Influencing user behavior subtly to guide decision-making.',
    definition: 'Nudging is a UX principle where users can be subtly influenced into making certain decisions.',
    category: 'Interaction Design',
    appliesWhen: ['User needs guidance', 'Multiple options available'],
    do: ['Use subtle visual cues', 'Guide towards beneficial choices', 'Maintain user autonomy'],
    dont: ['Force specific actions', 'Use manipulative techniques', 'Override user preferences'],
    example: {
      image: '',
      caption: 'Amazon\'s Add to Cart button prominence nudges continued shopping'
    },
    tags: ['behavioral', 'psychology', 'decision-making'],
    sources: ['Nudge by Thaler and Sunstein']
  };

  try {
    console.log('📝 Creating principle with type:', testPrinciple.type);
    const createdPrinciple = await DatabaseService.createPrinciple(testPrinciple);
    console.log('✅ Successfully created principle:', createdPrinciple.title);
    console.log('🆔 ID:', createdPrinciple.id);

    // Test getting principles to verify it's there
    const allPrinciples = await DatabaseService.getPrinciples();
    console.log(`📊 Total principles in database: ${allPrinciples.length}`);

    const foundPrinciple = allPrinciples.find(p => p.id === createdPrinciple.id);
    if (foundPrinciple) {
      console.log('✅ Principle found in database list');
    } else {
      console.log('❌ Principle not found in database list');
    }

  } catch (error) {
    console.error('❌ Failed to create principle:', error);
  }
}

testPrincipleCreation().catch(console.error);