import OpenAI from 'openai';
import { Principle, OpenAIQuestionData, OpenAIResponse } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {

  static async generateCompletion(prompt: string, options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { model = 'gpt-4', temperature = 0.7, maxTokens = 2000 } = options;

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return completion;
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      throw error;
    }
  }
  
  static async generateQuestions(
    principles: Principle[],
    questionsPerPrinciple: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<OpenAIQuestionData[]> {
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const prompt = this.createPrompt(principles, questionsPerPrinciple, difficulty);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedResponse: OpenAIResponse = JSON.parse(content);
      
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Validate questions
      return this.validateQuestions(parsedResponse.questions);

    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateBatchQuestions(
    principleGroups: Principle[][],
    questionsPerPrinciple: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<OpenAIQuestionData[]> {
    
    const batchPromises = principleGroups.map(group => 
      this.generateQuestions(group, questionsPerPrinciple, difficulty)
    );

    try {
      const results = await Promise.allSettled(batchPromises);
      
      const allQuestions: OpenAIQuestionData[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allQuestions.push(...result.value);
        } else {
          errors.push(`Batch ${index + 1}: ${result.reason}`);
        }
      });

      if (errors.length > 0) {
        console.warn('Some batches failed:', errors);
      }

      return allQuestions;

    } catch (error) {
      throw new Error(`Batch generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static getSystemPrompt(): string {
    return `You are an expert UX designer and educator who creates high-quality quiz questions about UX principles, cognitive biases, and design heuristics. 

Your questions should be:
- Clear and unambiguous
- Test practical understanding, not just memorization
- Have exactly 4 multiple choice options
- Include 1 correct answer and 3 plausible but clearly incorrect options
- Focus on real-world application and scenarios
- Be appropriate for the specified difficulty level

Always respond with valid JSON in the exact format requested.`;
  }

  private static createPrompt(
    principles: Principle[],
    questionsPerPrinciple: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): string {
    
    const difficultyInstructions = {
      easy: 'Focus on basic definitions and simple recognition. Questions should be straightforward for beginners.',
      medium: 'Include application scenarios and slightly complex situations. Suitable for intermediate learners.',
      hard: 'Create complex scenarios requiring deep understanding and critical thinking. For advanced practitioners.'
    };

    const principleData = principles.map(p => ({
      id: p.id,
      title: p.title,
      type: p.type,
      oneLiner: p.oneLiner,
      definition: p.definition,
      category: p.category,
      tags: p.tags
    }));

    return `Create exactly ${questionsPerPrinciple} multiple choice quiz questions for each of the following UX principles, cognitive biases, and heuristics.

Difficulty Level: ${difficulty}
${difficultyInstructions[difficulty]}

Principles to create questions for:
${JSON.stringify(principleData, null, 2)}

Question Types to Include:
1. Definition questions: "What is [principle]?"
2. Application questions: "When should you apply [principle]?"
3. Scenario questions: "Which principle is demonstrated in this scenario?"
4. Recognition questions: "This example shows which cognitive bias?"

Requirements for each question:
- Exactly 4 answer options (A, B, C, D)
- Only 1 correct answer
- 3 plausible but incorrect options
- IMPORTANT: Randomize the position of the correct answer (don't always put it first!)
- The correctAnswer index should vary between 0, 1, 2, and 3 across questions
- Optional brief explanation of the correct answer
- Must reference the correct principle ID

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Clear, specific question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct (optional)",
      "principleId": "principle_id_from_above"
    }
  ]
}

Make sure the incorrect options are believable but clearly wrong to someone who understands the principle.`;
  }

  private static validateQuestions(questions: OpenAIQuestionData[]): OpenAIQuestionData[] {
    const validQuestions = questions.filter(question => {
      // Validate question structure
      if (!question.question || typeof question.question !== 'string') {
        console.warn('Invalid question text:', question);
        return false;
      }

      if (!Array.isArray(question.options) || question.options.length !== 4) {
        console.warn('Invalid options array:', question);
        return false;
      }

      if (typeof question.correctAnswer !== 'number' || 
          question.correctAnswer < 0 || 
          question.correctAnswer > 3) {
        console.warn('Invalid correct answer index:', question);
        return false;
      }

      if (!question.principleId || typeof question.principleId !== 'string') {
        console.warn('Invalid principle ID:', question);
        return false;
      }

      // Check for empty options
      if (question.options.some(option => !option || typeof option !== 'string' || option.trim().length === 0)) {
        console.warn('Empty or invalid option found:', question);
        return false;
      }

      return true;
    });

    // Shuffle answer positions to prevent all correct answers being at position A
    return validQuestions.map(question => this.shuffleAnswerPosition(question));
  }

  private static shuffleAnswerPosition(question: OpenAIQuestionData): OpenAIQuestionData {
    // If correct answer is already not in position 0, randomly decide whether to shuffle
    if (question.correctAnswer !== 0 && Math.random() > 0.3) {
      return question; // Keep as is 70% of the time if not position A
    }

    // Generate a random position for the correct answer
    const newCorrectIndex = Math.floor(Math.random() * 4);
    
    // If it's already in the right position, return as is
    if (newCorrectIndex === question.correctAnswer) {
      return question;
    }

    // Create new options array with shuffled positions
    const newOptions = [...question.options];
    const correctOption = newOptions[question.correctAnswer];
    const targetOption = newOptions[newCorrectIndex];

    // Swap the correct answer to the new position
    newOptions[question.correctAnswer] = targetOption;
    newOptions[newCorrectIndex] = correctOption;

    return {
      ...question,
      options: newOptions,
      correctAnswer: newCorrectIndex
    };
  }

  // Generate fallback questions if OpenAI fails
  static generateFallbackQuestions(principles: Principle[]): OpenAIQuestionData[] {
    return principles.map(principle => {
      const options = [
        principle.oneLiner,
        "Users prefer complex interfaces with many options",
        "Design should always prioritize aesthetics over functionality", 
        "All users behave exactly the same way"
      ];
      
      // Randomize the position of the correct answer
      const correctIndex = Math.floor(Math.random() * 4);
      const correctAnswer = options[0]; // The principle's oneLiner
      
      // Swap to put correct answer at random position
      if (correctIndex !== 0) {
        options[0] = options[correctIndex];
        options[correctIndex] = correctAnswer;
      }

      return {
        question: `What is the main idea behind ${principle.title}?`,
        options,
        correctAnswer: correctIndex,
        explanation: `The correct answer reflects the core concept: "${principle.oneLiner}"`,
        principleId: principle.id
      };
    });
  }

  // Utility function to calculate estimated cost
  static estimateTokenCost(principles: Principle[], questionsPerPrinciple: number = 5): {
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    estimatedCostUSD: number;
  } {
    const averageTokensPerPrinciple = 150; // Rough estimate
    const tokensPerQuestion = 100; // Rough estimate for output
    
    const promptTokens = principles.length * averageTokensPerPrinciple + 500; // Base prompt
    const completionTokens = principles.length * questionsPerPrinciple * tokensPerQuestion;
    
    // GPT-4 pricing (as of 2024): $0.03/1K prompt tokens, $0.06/1K completion tokens
    const cost = (promptTokens * 0.03 / 1000) + (completionTokens * 0.06 / 1000);
    
    return {
      estimatedPromptTokens: promptTokens,
      estimatedCompletionTokens: completionTokens,
      estimatedCostUSD: Math.round(cost * 100) / 100 // Round to 2 decimal places
    };
  }
}