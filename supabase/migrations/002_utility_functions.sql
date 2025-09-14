-- Utility functions for better performance and functionality

-- Function to get random questions efficiently
CREATE OR REPLACE FUNCTION get_random_questions(
  principle_ids UUID[],
  question_count INTEGER DEFAULT 10,
  min_quality_score INTEGER DEFAULT 6
) RETURNS TABLE (
  id UUID,
  principle_id UUID,
  question TEXT,
  options JSONB,
  correct_answer INTEGER,
  explanation TEXT,
  difficulty VARCHAR(10),
  quality_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.principle_id,
    q.question,
    q.options,
    q.correct_answer,
    q.explanation,
    q.difficulty,
    q.quality_score,
    q.created_at,
    q.updated_at
  FROM questions q
  WHERE 
    q.principle_id = ANY(principle_ids)
    AND q.quality_score >= min_quality_score
  ORDER BY RANDOM()
  LIMIT question_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get question statistics
CREATE OR REPLACE FUNCTION get_question_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_questions', COUNT(*),
    'average_quality_score', ROUND(AVG(quality_score), 2),
    'questions_by_difficulty', json_build_object(
      'easy', COUNT(*) FILTER (WHERE difficulty = 'easy'),
      'medium', COUNT(*) FILTER (WHERE difficulty = 'medium'),
      'hard', COUNT(*) FILTER (WHERE difficulty = 'hard')
    ),
    'questions_by_quality', json_build_object(
      'low', COUNT(*) FILTER (WHERE quality_score <= 5),
      'medium', COUNT(*) FILTER (WHERE quality_score BETWEEN 6 AND 8),
      'high', COUNT(*) FILTER (WHERE quality_score >= 9)
    )
  ) INTO result
  FROM questions;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up low-quality questions
CREATE OR REPLACE FUNCTION cleanup_low_quality_questions(
  min_quality_threshold INTEGER DEFAULT 3
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM questions 
  WHERE quality_score < min_quality_threshold;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for question analytics
CREATE OR REPLACE VIEW question_analytics AS
SELECT 
  p.title as principle_title,
  p.type as principle_type,
  p.category,
  COUNT(q.id) as question_count,
  AVG(q.quality_score) as avg_quality_score,
  COUNT(q.id) FILTER (WHERE q.difficulty = 'easy') as easy_questions,
  COUNT(q.id) FILTER (WHERE q.difficulty = 'medium') as medium_questions,
  COUNT(q.id) FILTER (WHERE q.difficulty = 'hard') as hard_questions
FROM principles p
LEFT JOIN questions q ON p.id = q.principle_id
GROUP BY p.id, p.title, p.type, p.category
ORDER BY question_count DESC, avg_quality_score DESC;

-- Index for better random selection performance
CREATE INDEX IF NOT EXISTS idx_questions_random ON questions USING btree (principle_id, quality_score, random());

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_questions_analytics ON questions (principle_id, difficulty, quality_score);