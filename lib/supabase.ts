import { createClient } from '@supabase/supabase-js';
import { DbQuestion, DbPrinciple, QuizQuestion, Principle } from './types';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Client for read operations (uses anon key)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client for write operations (uses service role key)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Database helper functions
export class DatabaseService {
  
  // Principles CRUD operations
  static async getPrinciples(): Promise<Principle[]> {
    const { data, error } = await supabase
      .from('principles')
      .select('*')
      .order('title');

    if (error) {
      throw new Error(`Failed to fetch principles: ${error.message}`);
    }

    return data.map(this.dbPrincipleToApiPrinciple);
  }

  static async getPrincipleById(id: string): Promise<Principle | null> {
    const { data, error } = await supabase
      .from('principles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch principle: ${error.message}`);
    }

    return this.dbPrincipleToApiPrinciple(data);
  }

  static async createPrinciple(principle: Omit<Principle, 'id'>): Promise<Principle> {
    const dbPrinciple: Omit<DbPrinciple, 'id' | 'created_at' | 'updated_at'> = {
      type: principle.type,
      title: principle.title,
      one_liner: principle.oneLiner,
      definition: principle.definition,
      applies_when: principle.appliesWhen,
      do_items: principle.do,
      dont_items: principle.dont,
      tags: principle.tags,
      category: principle.category,
      sources: principle.sources,
    };

    const { data, error } = await supabaseAdmin
      .from('principles')
      .insert(dbPrinciple)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create principle: ${error.message}`);
    }

    return this.dbPrincipleToApiPrinciple(data);
  }

  // Update existing principle
  static async updatePrinciple(id: string, updates: Partial<Omit<Principle, 'id'>>): Promise<Principle> {
    const dbUpdates: Partial<Omit<DbPrinciple, 'id' | 'created_at' | 'updated_at'>> = {};
    
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.oneLiner) dbUpdates.one_liner = updates.oneLiner;
    if (updates.definition) dbUpdates.definition = updates.definition;
    if (updates.appliesWhen) dbUpdates.applies_when = updates.appliesWhen;
    if (updates.do) dbUpdates.do_items = updates.do;
    if (updates.dont) dbUpdates.dont_items = updates.dont;
    if (updates.tags) dbUpdates.tags = updates.tags;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.sources) dbUpdates.sources = updates.sources;

    const { data, error } = await supabaseAdmin
      .from('principles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update principle: ${error.message}`);
    }

    return this.dbPrincipleToApiPrinciple(data);
  }

  // Questions CRUD operations
  static async getQuestions(filters?: {
    principleIds?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    limit?: number;
    excludeIds?: string[];
    minQualityScore?: number;
  }): Promise<QuizQuestion[]> {
    let query = supabase.from('questions').select('*');

    if (filters?.principleIds?.length) {
      query = query.in('principle_id', filters.principleIds);
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }

    if (filters?.excludeIds?.length) {
      query = query.not('id', 'in', `(${filters.excludeIds.join(',')})`);
    }

    if (filters?.minQualityScore) {
      query = query.gte('quality_score', filters.minQualityScore);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    // Order by quality score and creation date for best questions first
    query = query.order('quality_score', { ascending: false })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return data.map(this.dbQuestionToApiQuestion);
  }

  static async createQuestions(questions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<QuizQuestion[]> {
    const dbQuestions = questions.map(q => ({
      principle_id: q.principleId,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      quality_score: q.qualityScore,
    }));

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(dbQuestions)
      .select();

    if (error) {
      throw new Error(`Failed to create questions: ${error.message}`);
    }

    return data.map(this.dbQuestionToApiQuestion);
  }

  static async getRandomQuestions(principleIds: string[], count: number = 10): Promise<QuizQuestion[]> {
    // Get random questions using a more efficient approach
    const { data, error } = await supabase.rpc('get_random_questions', {
      principle_ids: principleIds,
      question_count: count,
      min_quality_score: 6 // Only high-quality questions
    });

    if (error) {
      // Fallback to regular query if stored procedure doesn't exist
      console.warn('Random questions RPC failed, using fallback:', error.message);
      return this.getQuestions({
        principleIds,
        limit: count * 2, // Get more to randomize
        minQualityScore: 6
      }).then(questions => {
        // Client-side randomization as fallback
        return questions.sort(() => Math.random() - 0.5).slice(0, count);
      });
    }

    return data.map(this.dbQuestionToApiQuestion);
  }

  // Statistics and analytics
  static async getQuestionStats(): Promise<{
    totalQuestions: number;
    questionsByDifficulty: Record<string, number>;
    questionsByPrinciple: Record<string, number>;
    averageQualityScore: number;
  }> {
    const [questionsResult, statsResult] = await Promise.all([
      supabase.from('questions').select('difficulty, principle_id, quality_score'),
      supabase.rpc('get_question_statistics')
    ]);

    if (questionsResult.error) {
      throw new Error(`Failed to fetch question stats: ${questionsResult.error.message}`);
    }

    const questions = questionsResult.data;
    
    return {
      totalQuestions: questions.length,
      questionsByDifficulty: questions.reduce((acc, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      questionsByPrinciple: questions.reduce((acc, q) => {
        acc[q.principle_id] = (acc[q.principle_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageQualityScore: questions.reduce((sum, q) => sum + q.quality_score, 0) / questions.length
    };
  }

  static async getQuestionCountsForPrinciples(principleIds: string[]): Promise<Record<string, number>> {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('principle_id')
      .in('principle_id', principleIds);

    if (error) {
      throw new Error(`Failed to fetch question counts: ${error.message}`);
    }

    return questions.reduce((acc, q) => {
      acc[q.principle_id] = (acc[q.principle_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Type conversion helpers
  private static dbPrincipleToApiPrinciple(dbPrinciple: DbPrinciple): Principle {
    return {
      id: dbPrinciple.id,
      type: dbPrinciple.type,
      title: dbPrinciple.title,
      oneLiner: dbPrinciple.one_liner,
      definition: dbPrinciple.definition,
      appliesWhen: dbPrinciple.applies_when,
      do: dbPrinciple.do_items,
      dont: dbPrinciple.dont_items,
      tags: dbPrinciple.tags,
      category: dbPrinciple.category,
      sources: dbPrinciple.sources,
    };
  }

  private static dbQuestionToApiQuestion(dbQuestion: DbQuestion): QuizQuestion {
    return {
      id: dbQuestion.id,
      principleId: dbQuestion.principle_id,
      question: dbQuestion.question,
      options: dbQuestion.options,
      correctAnswer: dbQuestion.correct_answer,
      explanation: dbQuestion.explanation,
      difficulty: dbQuestion.difficulty,
      qualityScore: dbQuestion.quality_score,
      createdAt: new Date(dbQuestion.created_at),
      updatedAt: new Date(dbQuestion.updated_at),
    };
  }
}