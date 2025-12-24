-- Migration: Add Semester Progression Tracking System
-- Description: Adds SEE marks, final grades, SGPA/CGPA tracking, and semester progression
-- Author: System Generated
-- Date: 2025-01-08

-- =============================================================================
-- TABLE 1: SEE Marks
-- =============================================================================
-- Stores Semester End Examination marks for each student per course

CREATE TABLE IF NOT EXISTS see_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- SEE marks (out of 100)
    see_marks_obtained DECIMAL(5,2) NOT NULL CHECK (see_marks_obtained BETWEEN 0 AND 100),
    see_max_marks DECIMAL(5,2) DEFAULT 100.00 CHECK (see_max_marks > 0),

    -- Metadata
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One SEE entry per student per course
    UNIQUE(student_id, course_id)
);

-- Indexes for performance
CREATE INDEX idx_see_marks_student ON see_marks(student_id);
CREATE INDEX idx_see_marks_course ON see_marks(course_id);
CREATE INDEX idx_see_marks_student_course ON see_marks(student_id, course_id);
CREATE INDEX idx_see_marks_upload_date ON see_marks(upload_date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_see_marks_updated_at ON see_marks;
CREATE TRIGGER update_see_marks_updated_at BEFORE UPDATE ON see_marks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE see_marks IS 'Stores Semester End Examination marks for students';
COMMENT ON COLUMN see_marks.see_marks_obtained IS 'SEE marks obtained out of 100';
COMMENT ON COLUMN see_marks.uploaded_by IS 'Teacher who uploaded the SEE marks';

-- =============================================================================
-- TABLE 2: Student Final Grades
-- =============================================================================
-- Stores final computed grades combining CIE and SEE marks

CREATE TABLE IF NOT EXISTS student_final_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- CIE component (max 50)
    cie_total DECIMAL(7,2) NOT NULL DEFAULT 0 CHECK (cie_total BETWEEN 0 AND 50),
    cie_max DECIMAL(7,2) DEFAULT 50.00,

    -- SEE component (max 50, scaled from 100)
    see_total DECIMAL(7,2) NOT NULL DEFAULT 0 CHECK (see_total BETWEEN 0 AND 50),
    see_max DECIMAL(7,2) DEFAULT 50.00,

    -- Final marks (CIE + SEE, max 100)
    final_total DECIMAL(7,2) NOT NULL CHECK (final_total BETWEEN 0 AND 100),
    final_max DECIMAL(7,2) DEFAULT 100.00,
    final_percentage DECIMAL(5,2) NOT NULL CHECK (final_percentage BETWEEN 0 AND 100),

    -- Grade assignment
    letter_grade VARCHAR(4) NOT NULL, -- A+, A, B+, B, C+, C, D, E, F
    grade_points DECIMAL(3,1) NOT NULL CHECK (grade_points BETWEEN 0 AND 10), -- 10-point scale

    -- Course credits (copied from courses.credits for historical tracking)
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 6),

    -- Pass/Fail status
    is_passed BOOLEAN DEFAULT FALSE,

    -- Calculation metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculation_method VARCHAR(50) DEFAULT 'cie_see_combined',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, course_id)
);

-- Indexes for performance
CREATE INDEX idx_final_grades_student ON student_final_grades(student_id);
CREATE INDEX idx_final_grades_course ON student_final_grades(course_id);
CREATE INDEX idx_final_grades_grade ON student_final_grades(letter_grade);
CREATE INDEX idx_final_grades_student_course ON student_final_grades(student_id, course_id);
CREATE INDEX idx_final_grades_is_passed ON student_final_grades(is_passed);
CREATE INDEX idx_final_grades_calculated_at ON student_final_grades(calculated_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_final_grades_updated_at ON student_final_grades;
CREATE TRIGGER update_final_grades_updated_at BEFORE UPDATE ON student_final_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE student_final_grades IS 'Stores final grades combining CIE and SEE marks';
COMMENT ON COLUMN student_final_grades.final_total IS 'Final marks = (CIE total / 2) + (SEE marks / 2)';
COMMENT ON COLUMN student_final_grades.grade_points IS 'Grade points on 10-point scale for CGPA calculation';

-- =============================================================================
-- TABLE 3: Semester Results
-- =============================================================================
-- Stores semester-wise SGPA and aggregated results for each student

CREATE TABLE IF NOT EXISTS semester_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Semester info
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year INT NOT NULL CHECK (academic_year >= 2020), -- e.g., 2024

    -- Semester metrics
    total_credits_registered INT NOT NULL DEFAULT 0,
    total_credits_earned INT NOT NULL DEFAULT 0, -- Credits for passed courses only

    -- Grade points calculation
    total_grade_points DECIMAL(10,2) NOT NULL DEFAULT 0, -- Sum(grade_points × credits)
    sgpa DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (sgpa BETWEEN 0 AND 10), -- Semester GPA

    -- Course counts
    courses_registered INT NOT NULL DEFAULT 0,
    courses_passed INT NOT NULL DEFAULT 0,
    courses_failed INT NOT NULL DEFAULT 0,

    -- Status
    semester_status VARCHAR(20) DEFAULT 'in_progress' CHECK (semester_status IN ('in_progress', 'completed', 'detained')),

    -- Metadata
    result_date TIMESTAMP,
    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, semester, academic_year)
);

-- Indexes for performance
CREATE INDEX idx_semester_results_student ON semester_results(student_id);
CREATE INDEX idx_semester_results_semester ON semester_results(semester);
CREATE INDEX idx_semester_results_year ON semester_results(academic_year);
CREATE INDEX idx_semester_results_student_sem ON semester_results(student_id, semester);
CREATE INDEX idx_semester_results_sgpa ON semester_results(sgpa DESC);
CREATE INDEX idx_semester_results_status ON semester_results(semester_status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_semester_results_updated_at ON semester_results;
CREATE TRIGGER update_semester_results_updated_at BEFORE UPDATE ON semester_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE semester_results IS 'Stores semester-wise SGPA and course statistics';
COMMENT ON COLUMN semester_results.sgpa IS 'Semester GPA = Sum(grade_points × credits) / total_credits';
COMMENT ON COLUMN semester_results.total_credits_earned IS 'Credits earned from passed courses only';

-- =============================================================================
-- TABLE 4: Student CGPA
-- =============================================================================
-- Stores cumulative CGPA across all semesters for each student

CREATE TABLE IF NOT EXISTS student_cgpa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Cumulative metrics (across all completed semesters)
    total_credits_completed INT NOT NULL DEFAULT 0,
    total_grade_points DECIMAL(12,2) NOT NULL DEFAULT 0, -- Sum(grade_points × credits) across all semesters
    cgpa DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (cgpa BETWEEN 0 AND 10), -- Cumulative GPA

    -- Tracking
    semesters_completed INT NOT NULL DEFAULT 0,
    current_semester INT CHECK (current_semester BETWEEN 1 AND 8),

    -- Overall performance
    total_courses_completed INT NOT NULL DEFAULT 0,
    total_courses_failed INT NOT NULL DEFAULT 0,

    -- Historical tracking
    cgpa_history JSONB DEFAULT '[]'::jsonb, -- Array of {semester, sgpa, cgpa, date}

    -- Last update
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id)
);

-- Indexes for performance
CREATE INDEX idx_student_cgpa_student ON student_cgpa(student_id);
CREATE INDEX idx_student_cgpa_cgpa ON student_cgpa(cgpa DESC); -- For ranking
CREATE INDEX idx_student_cgpa_current_semester ON student_cgpa(current_semester);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_student_cgpa_updated_at ON student_cgpa;
CREATE TRIGGER update_student_cgpa_updated_at BEFORE UPDATE ON student_cgpa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE student_cgpa IS 'Stores cumulative CGPA and historical progression for students';
COMMENT ON COLUMN student_cgpa.cgpa IS 'Cumulative GPA = Sum(all grade_points × credits) / total_credits';
COMMENT ON COLUMN student_cgpa.cgpa_history IS 'JSON array of historical SGPA and CGPA values per semester';

-- =============================================================================
-- TABLE 5: Grade Point Mapping
-- =============================================================================
-- Reference table for letter grade to grade point conversion (10-point scale)

CREATE TABLE IF NOT EXISTS grade_point_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_grade VARCHAR(4) UNIQUE NOT NULL,
    grade_points DECIMAL(3,1) NOT NULL CHECK (grade_points BETWEEN 0 AND 10),
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_percentage_range CHECK (min_percentage < max_percentage)
);

-- Index for range queries
CREATE INDEX idx_grade_mapping_range ON grade_point_mapping(min_percentage, max_percentage);

-- Insert standard VTU 10-point grading scale
INSERT INTO grade_point_mapping (letter_grade, grade_points, min_percentage, max_percentage, description) VALUES
('A+', 10.0, 91.00, 100.00, 'Outstanding'),
('A', 9.0, 81.00, 90.99, 'Excellent'),
('B+', 8.0, 71.00, 80.99, 'Very Good'),
('B', 7.0, 61.00, 70.99, 'Good'),
('C+', 6.0, 51.00, 60.99, 'Above Average'),
('C', 5.0, 41.00, 50.99, 'Average'),
('D', 4.0, 40.00, 40.99, 'Pass'),
('E', 0.0, 35.00, 39.99, 'Fail - Reappear'),
('F', 0.0, 0.00, 34.99, 'Fail - Detained')
ON CONFLICT (letter_grade) DO NOTHING;

COMMENT ON TABLE grade_point_mapping IS 'Reference table for 10-point grade scale conversion';

-- =============================================================================
-- MODIFY EXISTING TABLE: student_overall_scores
-- =============================================================================
-- Add SEE and final marks fields if not already present

DO $$
BEGIN
    -- Add see_obtained column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'see_obtained'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN see_obtained DECIMAL(9,2) DEFAULT 0;
    END IF;

    -- Add see_max column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'see_max'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN see_max DECIMAL(9,2) DEFAULT 0;
    END IF;

    -- Add see_percentage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'see_percentage'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN see_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Add final_marks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'final_marks'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN final_marks DECIMAL(9,2) DEFAULT 0;
    END IF;

    -- Add final_percentage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'final_percentage'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN final_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Add letter_grade column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'letter_grade'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN letter_grade VARCHAR(4);
    END IF;

    -- Add grade_points column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'grade_points'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN grade_points DECIMAL(3,1);
    END IF;

    -- Add credits column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_overall_scores' AND column_name = 'credits'
    ) THEN
        ALTER TABLE student_overall_scores ADD COLUMN credits INT;
    END IF;
END $$;

-- Add index for faster lookups on letter_grade
CREATE INDEX IF NOT EXISTS idx_student_overall_grade ON student_overall_scores(letter_grade);

COMMENT ON COLUMN student_overall_scores.see_obtained IS 'SEE marks obtained (out of 100, scaled to 50)';
COMMENT ON COLUMN student_overall_scores.final_marks IS 'Final marks = (CIE total / 2) + (SEE marks / 2)';
COMMENT ON COLUMN student_overall_scores.letter_grade IS 'Letter grade assigned based on final percentage';
COMMENT ON COLUMN student_overall_scores.grade_points IS 'Grade points on 10-point scale';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify tables were created successfully

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Count newly created tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('see_marks', 'student_final_grades', 'semester_results', 'student_cgpa', 'grade_point_mapping');

    RAISE NOTICE 'Successfully created % new tables', table_count;

    -- Verify grade_point_mapping has data
    SELECT COUNT(*) INTO table_count FROM grade_point_mapping;
    RAISE NOTICE 'Grade point mapping table has % entries', table_count;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '================================================================================';
RAISE NOTICE 'Migration 002_add_semester_progression.sql completed successfully!';
RAISE NOTICE '================================================================================';
RAISE NOTICE 'Created tables:';
RAISE NOTICE '  1. see_marks - Stores SEE marks for students';
RAISE NOTICE '  2. student_final_grades - Stores final grades (CIE + SEE)';
RAISE NOTICE '  3. semester_results - Stores semester-wise SGPA';
RAISE NOTICE '  4. student_cgpa - Stores cumulative CGPA';
RAISE NOTICE '  5. grade_point_mapping - 10-point grade scale reference';
RAISE NOTICE '';
RAISE NOTICE 'Modified tables:';
RAISE NOTICE '  - student_overall_scores (added SEE and grade fields)';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '  1. Deploy backend services (seeMarksService, gradeCalculationService, etc.)';
RAISE NOTICE '  2. Deploy backend routes (seeMarks, grades, cgpa, progression)';
RAISE NOTICE '  3. Deploy frontend components (SEEUpload, StudentProgression)';
RAISE NOTICE '================================================================================';
