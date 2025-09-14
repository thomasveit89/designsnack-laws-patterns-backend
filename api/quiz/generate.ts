import { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseService } from '../../lib/supabase';
import { OpenAIService } from '../../lib/openai';
import { GenerateQuestionsRequest, GenerateQuestionsResponse, ApiError, QuizQuestion } from '../../lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    } as ApiError);
  }

  try {
    const requestData: GenerateQuestionsRequest = req.body;

    // Validate request
    if (!requestData.principleIds || requestData.principleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one principle ID is required',
        code: 'MISSING_PRINCIPLE_IDS'
      } as ApiError);
    }

    // Validate limits
    const questionsPerPrinciple = requestData.questionsPerPrinciple || 5;
    if (questionsPerPrinciple < 1 || questionsPerPrinciple > 10) {
      return res.status(400).json({
        success: false,
        error: 'Questions per principle must be between 1 and 10',
        code: 'INVALID_QUESTIONS_COUNT'
      } as ApiError);
    }

    // Validate difficulty
    const difficulty = requestData.difficulty || 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be easy, medium, or hard',
        code: 'INVALID_DIFFICULTY'
      } as ApiError);
    }

    // Get principles from database
    const allPrinciples = await DatabaseService.getPrinciples();
    const requestedPrinciples = allPrinciples.filter(p => 
      requestData.principleIds.includes(p.id)
    );

    if (requestedPrinciples.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid principles found for the provided IDs',
        code: 'PRINCIPLES_NOT_FOUND'
      } as ApiError);
    }

    // Estimate cost before proceeding
    const costEstimate = OpenAIService.estimateTokenCost(requestedPrinciples, questionsPerPrinciple);
    console.log(`Generating questions - Estimated cost: $${costEstimate.estimatedCostUSD}`);

    // Generate questions using OpenAI
    let generatedQuestions;
    try {
      generatedQuestions = await OpenAIService.generateQuestions(
        requestedPrinciples,
        questionsPerPrinciple,
        difficulty
      );
    } catch (openaiError) {
      console.error('OpenAI generation failed, using fallback:', openaiError);
      // Fallback to simple questions
      generatedQuestions = OpenAIService.generateFallbackQuestions(requestedPrinciples);
    }

    // Convert to QuizQuestion format with quality scoring
    const quizQuestions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = generatedQuestions.map(q => ({
      principleId: q.principleId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: difficulty,
      qualityScore: 8 // Default quality score for AI-generated questions
    }));

    // Save to database
    const savedQuestions = await DatabaseService.createQuestions(quizQuestions);

    const response: GenerateQuestionsResponse = {
      questions: savedQuestions,
      totalGenerated: savedQuestions.length,
      success: true,
      message: `Successfully generated ${savedQuestions.length} questions for ${requestedPrinciples.length} principles`
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Generate API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate questions',
      code: 'GENERATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ApiError);
  }
}