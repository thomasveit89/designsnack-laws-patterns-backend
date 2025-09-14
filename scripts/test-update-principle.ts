#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

async function testUpdatePrinciple() {
  console.log('🧪 Testing principle update functionality...');

  try {
    // Get all principles to find one to test with
    const principles = await DatabaseService.getPrinciples();
    const testPrinciple = principles[0]; // Just use the first principle
    
    if (!testPrinciple) {
      console.log('❌ No principles found in database');
      return;
    }

    console.log(`📝 Found test principle: "${testPrinciple.title}"`);
    console.log(`📋 Current one-liner: "${testPrinciple.oneLiner}"`);

    // Test updating the one-liner
    const updates = {
      oneLiner: 'Updated test one-liner for demonstration purposes'
    };

    console.log('\n🔄 Updating principle...');
    const updatedPrinciple = await DatabaseService.updatePrinciple(testPrinciple.id, updates);

    console.log(`✅ Successfully updated principle!`);
    console.log(`📝 New one-liner: "${updatedPrinciple.oneLiner}"`);

    // Verify the change persisted
    const verifyPrinciples = await DatabaseService.getPrinciples();
    const verifyPrinciple = verifyPrinciples.find(p => p.id === testPrinciple.id);
    
    if (verifyPrinciple?.oneLiner === updates.oneLiner) {
      console.log(`✅ Update verified in database`);
    } else {
      console.log(`❌ Update verification failed`);
    }

  } catch (error) {
    console.error('❌ Update test failed:', error);
  }
}

testUpdatePrinciple().catch(console.error);