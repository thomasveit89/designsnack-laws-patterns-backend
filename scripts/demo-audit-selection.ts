#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../lib/supabase';

async function demoAuditSelection() {
  console.log('🔍 Audit Selection Options Demo');
  console.log('================================\n');

  try {
    const allPrinciples = await DatabaseService.getPrinciples();
    console.log(`📊 Total principles in database: ${allPrinciples.length}\n`);

    console.log('🎯 New audit selection features:');
    console.log('=================================');

    console.log('\n1️⃣ **Select Specific Principles**:');
    console.log('   - Choose exact principles by number: "1,3,5"');
    console.log('   - Use ranges: "1-5" or "10-15"');
    console.log('   - Mix both: "1,3,7-10,15"');

    console.log('\n2️⃣ **Search and Select**:');
    console.log('   - Search by name: "fitts" → finds "Fitts\'s Law"');
    console.log('   - Search by category: "usability" → finds all usability principles');
    console.log('   - Search by type: "cognitive_bias" → finds all biases');

    console.log('\n3️⃣ **Quick Examples**:');
    
    // Show some search examples
    const cognitivebiases = allPrinciples.filter(p => p.type === 'cognitive_bias');
    const usabilityPrinciples = allPrinciples.filter(p => p.category === 'usability');
    const lawPrinciples = allPrinciples.filter(p => p.type === 'ux_law');

    console.log(`   • Cognitive biases: ${cognitivebiases.length} found`);
    cognitivebiases.slice(0, 3).forEach(p => console.log(`     - ${p.title}`));
    if (cognitivebiases.length > 3) console.log(`     ... and ${cognitivebiases.length - 3} more`);

    console.log(`   • Usability principles: ${usabilityPrinciples.length} found`);
    usabilityPrinciples.slice(0, 3).forEach(p => console.log(`     - ${p.title}`));
    if (usabilityPrinciples.length > 3) console.log(`     ... and ${usabilityPrinciples.length - 3} more`);

    console.log(`   • UX laws: ${lawPrinciples.length} found`);
    lawPrinciples.slice(0, 3).forEach(p => console.log(`     - ${p.title}`));
    if (lawPrinciples.length > 3) console.log(`     ... and ${lawPrinciples.length - 3} more`);

    console.log('\n🚀 **Ready to use!**');
    console.log('   Run: npm run audit-content');
    console.log('   Then choose option 3 or 4 for targeted auditing');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

demoAuditSelection().catch(console.error);