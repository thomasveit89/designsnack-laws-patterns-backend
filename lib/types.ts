// Shared types between mobile app and backend
export type PrincipleType = "ux_law" | "cognitive_bias" | "heuristic";

export interface Principle {
  id: string;
  type: PrincipleType;
  title: string;
  oneLiner: string;
  definition: string;
  appliesWhen: string[];
  do: string[];
  dont: string[];
  example?: {
    image: string;
    caption: string;
  };
  tags: string[];
  category: string;
  sources: string[];
}

export interface QuizQuestion {
  id: string;
  principleId: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  qualityScore: number; // 1-10 rating for question quality
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  mode: 'all' | 'favorites';
  principlesUsed: string[];
  createdAt: Date;
}

// Database table interfaces
export interface DbQuestion {
  id: string;
  principle_id: string;
  question: string;
  options: string[]; // JSON array
  correct_answer: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface DbPrinciple {
  id: string;
  type: PrincipleType;
  title: string;
  one_liner: string;
  definition: string;
  applies_when: string[]; // JSON array
  do_items: string[]; // JSON array
  dont_items: string[]; // JSON array
  tags: string[]; // JSON array
  category: string;
  sources: string[]; // JSON array
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface GenerateQuestionsRequest {
  principleIds: string[];
  questionsPerPrinciple?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuestionsResponse {
  questions: QuizQuestion[];
  totalGenerated: number;
  success: boolean;
  message?: string;
}

export interface GetQuestionsRequest {
  principleIds: string[];
  limit?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeIds?: string[];
}

export interface GetQuestionsResponse {
  questions: QuizQuestion[];
  totalAvailable: number;
  success: boolean;
  message?: string;
}

export interface SyncQuestionsResponse {
  questions: QuizQuestion[];
  lastSyncAt: string;
  totalQuestions: number;
  success: boolean;
  message?: string;
}

// OpenAI specific types
export interface OpenAIQuestionData {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  principleId: string;
}

export interface OpenAIResponse {
  questions: OpenAIQuestionData[];
}

// Error types
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}