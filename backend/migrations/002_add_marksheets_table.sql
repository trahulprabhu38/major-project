-- ==================================================================================
-- Add Marksheets Table
-- Version: 1.0
-- Date: 2025-11-06
-- Description: Table to store uploaded marksheet metadata
-- ==================================================================================

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- MARKSHEETS TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS marksheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,  -- Name of the table in the upload service database
    columns JSONB,                      -- Store column names as JSON array
    row_count INT DEFAULT 0,            -- Number of students/rows in the marksheet
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_marksheets_course ON marksheets(course_id);
CREATE INDEX idx_marksheets_uploaded_by ON marksheets(uploaded_by);
CREATE INDEX idx_marksheets_created_at ON marksheets(created_at DESC);

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_marksheets_updated_at BEFORE UPDATE ON marksheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- END OF MIGRATION
-- ==================================================================================

\echo '✅ Marksheets table created successfully!';
