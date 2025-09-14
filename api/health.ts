import { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseService } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    // Test database connection and get basic stats
    const [principles, stats] = await Promise.all([
      DatabaseService.getPrinciples(),
      DatabaseService.getQuestionStats().catch(() => null)
    ]);

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        connected: true,
        principlesCount: principles.length,
        questionsCount: stats?.totalQuestions || 0,
        averageQualityScore: stats?.averageQualityScore || 0
      },
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY
      },
      uptime: process.uptime()
    };

    return res.status(200).json(healthData);

  } catch (error) {
    console.error('Health check failed:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY
      }
    });
  }
}