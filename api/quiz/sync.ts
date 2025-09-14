import { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseService } from '../../lib/supabase';
import { SyncQuestionsResponse, ApiError } from '../../lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    } as ApiError);
  }

  try {
    // Parse parameters
    const lastSyncParam = req.method === 'GET' 
      ? req.query.lastSync as string
      : req.body?.lastSync as string;

    const limitParam = req.method === 'GET'
      ? req.query.limit as string
      : req.body?.limit as string;

    const lastSync = lastSyncParam ? new Date(lastSyncParam) : null;
    const limit = limitParam ? parseInt(limitParam) : 100;

    // Validate limit
    if (limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 500',
        code: 'INVALID_LIMIT'
      } as ApiError);
    }

    // Get questions updated since last sync
    const filters: any = {
      limit,
      minQualityScore: 6 // Only sync high-quality questions
    };

    // If lastSync is provided, only get questions updated after that date
    // Note: This would require adding a 'updated_after' filter to DatabaseService
    const questions = await DatabaseService.getQuestions(filters);

    // Filter by last sync date manually if needed
    const filteredQuestions = lastSync 
      ? questions.filter(q => q.updatedAt > lastSync)
      : questions;

    // Get total question count for statistics
    const stats = await DatabaseService.getQuestionStats();

    const response: SyncQuestionsResponse = {
      questions: filteredQuestions,
      lastSyncAt: new Date().toISOString(),
      totalQuestions: stats.totalQuestions,
      success: true,
      message: lastSync 
        ? `Synced ${filteredQuestions.length} questions updated since ${lastSync.toISOString()}`
        : `Initial sync of ${filteredQuestions.length} questions`
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Sync API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to sync questions',
      code: 'SYNC_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ApiError);
  }
}