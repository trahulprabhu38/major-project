-- Migration: Add department column to courses table
-- This is needed for the enrollment system to work correctly

-- Add department column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'courses'
        AND column_name = 'department'
    ) THEN
        ALTER TABLE courses ADD COLUMN department VARCHAR(100);
        RAISE NOTICE 'Added department column to courses table';
    ELSE
        RAISE NOTICE 'Department column already exists in courses table';
    END IF;
END $$;
