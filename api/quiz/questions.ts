import { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseService } from '../../lib/supabase';
import { GetQuestionsRequest, GetQuestionsResponse, ApiError } from '../../lib/types';

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
    let requestData: GetQuestionsRequest;

    if (req.method === 'GET') {
      // Parse query parameters
      const {
        principleIds,
        limit = '10',
        difficulty,
        excludeIds
      } = req.query;

      requestData = {
        principleIds: typeof principleIds === 'string' 
          ? principleIds.split(',').filter(id => id.trim().length > 0)
          : Array.isArray(principleIds) 
          ? principleIds.filter(id => typeof id === 'string' && id.trim().length > 0) as string[]
          : [],
        limit: parseInt(limit as string) || 10,
        difficulty: difficulty as 'easy' | 'medium' | 'hard' | undefined,
        excludeIds: typeof excludeIds === 'string' 
          ? excludeIds.split(',').filter(id => id.trim().length > 0)
          : Array.isArray(excludeIds)
          ? excludeIds.filter(id => typeof id === 'string' && id.trim().length > 0) as string[]
          : undefined
      };
    } else {
      // POST request with JSON body
      requestData = req.body as GetQuestionsRequest;
    }

    // Validate request
    if (!requestData.principleIds || requestData.principleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one principle ID is required',
        code: 'MISSING_PRINCIPLE_IDS'
      } as ApiError);
    }

    // Validate limit
    if (requestData.limit && (requestData.limit < 1 || requestData.limit > 50)) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 50',
        code: 'INVALID_LIMIT'
      } as ApiError);
    }

    // Validate difficulty
    if (requestData.difficulty && !['easy', 'medium', 'hard'].includes(requestData.difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be easy, medium, or hard',
        code: 'INVALID_DIFFICULTY'
      } as ApiError);
    }

    // Get questions from database
    const questions = await DatabaseService.getRandomQuestions(
      requestData.principleIds,
      requestData.limit || 10
    );

    // Filter by difficulty if specified
    const filteredQuestions = requestData.difficulty
      ? questions.filter(q => q.difficulty === requestData.difficulty)
      : questions;

    // Exclude specific questions if requested
    const finalQuestions = requestData.excludeIds
      ? filteredQuestions.filter(q => !requestData.excludeIds!.includes(q.id))
      : filteredQuestions;

    // Get total count for this query
    const totalAvailable = await DatabaseService.getQuestions({
      principleIds: requestData.principleIds,
      difficulty: requestData.difficulty,
      minQualityScore: 6
    }).then(allQuestions => allQuestions.length);

    const response: GetQuestionsResponse = {
      questions: finalQuestions.slice(0, requestData.limit || 10),
      totalAvailable,
      success: true,
      message: `Retrieved ${finalQuestions.length} questions`
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Questions API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      code: 'DATABASE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ApiError);
  }
}