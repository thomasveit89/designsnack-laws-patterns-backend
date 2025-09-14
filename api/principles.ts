import { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseService } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get all principles from database
    const principles = await DatabaseService.getPrinciples();
    
    // Get unique categories from principles
    const categories = Array.from(new Set(principles.map(p => p.category)))
      .map(categoryName => ({
        id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        name: categoryName,
        description: `${categoryName} principles and concepts`,
        icon: getCategoryIcon(categoryName)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get question counts for each principle
    const principlesWithStats = await Promise.all(
      principles.map(async (principle) => {
        const questions = await DatabaseService.getQuestions({
          principleIds: [principle.id],
          minQualityScore: 0
        });
        
        return {
          ...principle,
          questionCount: questions.length,
          lastUpdated: new Date().toISOString()
        };
      })
    );

    const response = {
      success: true,
      data: {
        principles: principlesWithStats,
        categories,
        meta: {
          totalPrinciples: principles.length,
          totalCategories: categories.length,
          lastSynced: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Principles API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch principles',
      code: 'DATABASE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to get category icons
function getCategoryIcon(categoryName: string): string {
  const iconMap: Record<string, string> = {
    'Cognitive Biases': '🧠',
    'Design Heuristics': '🎨', 
    'Usability Principles': '👆',
    'Visual Design': '👁️',
    'Information Architecture': '🏗️',
    'Interaction Design': '⚡',
    'Accessibility': '♿',
    'Performance': '⚡',
    'Psychology': '🧠',
    'Business': '💼'
  };

  return iconMap[categoryName] || '📋';
}