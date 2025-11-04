-- CO Generator Schema Updates
-- Migration: 002_co_generator_schema
-- Ensures courses and course_outcomes tables support manual creation and CO generation

-- Update courses table to ensure it has all required fields
-- Add course_code column if it doesn't exist (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='courses' AND column_name='course_code') THEN
        -- If course_code doesn't exist but 'code' does, we're good
        -- Just add an alias view or ensure code is the primary field
        ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(50);
        -- Copy data from code to course_code if needed
        UPDATE courses SET course_code = code WHERE course_code IS NULL;
    END IF;
END $$;

-- Add co_text column as alias/duplicate of description for CO generator compatibility
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS co_text TEXT;

-- Copy data from description to co_text for existing records
UPDATE course_outcomes SET co_text = description WHERE co_text IS NULL AND description IS NOT NULL;

-- Ensure course_outcomes table has teacher_id for tracking who generated COs
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id);

-- Ensure course_outcomes has verified flag
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Ensure course_outcomes has created_at if missing
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at to course_outcomes
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for course_outcomes updated_at
DROP TRIGGER IF EXISTS update_course_outcomes_updated_at ON course_outcomes;
CREATE TRIGGER update_course_outcomes_updated_at
    BEFORE UPDATE ON course_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index on course_outcomes teacher_id for faster queries
CREATE INDEX IF NOT EXISTS idx_course_outcomes_teacher ON course_outcomes(teacher_id);

-- Create index on course_outcomes verified status
CREATE INDEX IF NOT EXISTS idx_course_outcomes_verified ON course_outcomes(verified);

-- Create a view for easy CO statistics
CREATE OR REPLACE VIEW co_statistics AS
SELECT
    co.course_id,
    c.code as course_code,
    c.name as course_name,
    co.teacher_id,
    COUNT(co.id) as total_cos,
    COUNT(CASE WHEN co.verified = TRUE THEN 1 END) as verified_cos,
    COUNT(CASE WHEN co.verified = FALSE THEN 1 END) as unverified_cos,
    jsonb_object_agg(
        COALESCE(co.bloom_level, 'Unknown'),
        COUNT(co.id)
    ) FILTER (WHERE co.bloom_level IS NOT NULL) as bloom_distribution,
    MAX(co.created_at) as last_generated
FROM course_outcomes co
JOIN courses c ON co.course_id = c.id
GROUP BY co.course_id, c.code, c.name, co.teacher_id;

-- Grant necessary permissions (if using specific roles)
-- GRANT SELECT, INSERT, UPDATE ON course_outcomes TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON courses TO app_user;

-- Add comment to track migration
COMMENT ON TABLE course_outcomes IS 'Course Outcomes with AI generation support - Updated in migration 002';
