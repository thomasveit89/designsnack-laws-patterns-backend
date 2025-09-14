-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create principles table
CREATE TABLE principles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('ux_law', 'cognitive_bias', 'heuristic')),
  title VARCHAR(255) NOT NULL,
  one_liner TEXT NOT NULL,
  definition TEXT NOT NULL,
  applies_when JSONB NOT NULL DEFAULT '[]',
  do JSONB NOT NULL DEFAULT '[]',
  dont JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(100) NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principle_id UUID NOT NULL REFERENCES principles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation TEXT,
  difficulty VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  quality_score INTEGER NOT NULL DEFAULT 5 CHECK (quality_score >= 1 AND quality_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_questions_principle_id ON questions(principle_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_quality_score ON questions(quality_score);
CREATE INDEX idx_questions_created_at ON questions(created_at);
CREATE INDEX idx_principles_type ON principles(type);
CREATE INDEX idx_principles_category ON principles(category);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_principles_updated_at 
  BEFORE UPDATE ON principles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at 
  BEFORE UPDATE ON questions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies for API access
ALTER TABLE principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to principles" ON principles FOR SELECT USING (true);
CREATE POLICY "Allow read access to questions" ON questions FOR SELECT USING (true);

-- Allow insert/update for service role only (backend API)
CREATE POLICY "Allow insert for service role" ON principles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service role" ON principles FOR UPDATE USING (true);
CREATE POLICY "Allow insert for service role" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service role" ON questions FOR UPDATE USING (true);