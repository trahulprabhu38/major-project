-- Migration: 003_add_co_generator_fields
-- Add fields required for AI-powered CO generation

-- Add teacher_id column to course_outcomes
ALTER TABLE course_outcomes
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add co_text column (for AI-generated text)
-- Keep existing 'description' column for backward compatibility
ALTER TABLE course_outcomes
ADD COLUMN IF NOT EXISTS co_text TEXT;

-- Add verified flag for teacher verification of AI-generated COs
ALTER TABLE course_outcomes
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Add updated_at column if it doesn't exist
ALTER TABLE course_outcomes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for updated_at on course_outcomes
DROP TRIGGER IF EXISTS update_course_outcomes_updated_at ON course_outcomes;
CREATE TRIGGER update_course_outcomes_updated_at BEFORE UPDATE ON course_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index on teacher_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_cos_teacher ON course_outcomes(teacher_id);

-- Create index on verified flag for filtering
CREATE INDEX IF NOT EXISTS idx_cos_verified ON course_outcomes(verified);

-- Migrate existing data: copy description to co_text where co_text is null
UPDATE course_outcomes
SET co_text = description
WHERE co_text IS NULL AND description IS NOT NULL;

-- Add comment to clarify the dual columns
COMMENT ON COLUMN course_outcomes.description IS 'Original CO description (legacy)';
COMMENT ON COLUMN course_outcomes.co_text IS 'AI-generated CO text from CO Generator service';
COMMENT ON COLUMN course_outcomes.verified IS 'Whether the CO has been verified by the teacher';
