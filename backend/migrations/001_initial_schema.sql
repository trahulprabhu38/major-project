-- ==================================================================================
-- OBE CO/PO Attainment System (Complete Unified Schema)
-- Version: 2.1 (Deduplicated Only)
-- Author: T Rahul Prabhu
-- ==================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================================================
-- UTILITY FUNCTION
-- ==================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- USERS
-- ==================================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    name VARCHAR(255) NOT NULL,
    usn VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_usn ON users(usn);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- COURSES
-- ==================================================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semester INT CHECK (semester BETWEEN 1 AND 8),
    year INT CHECK (year >= 2020),
    credits INT DEFAULT 3 CHECK (credits BETWEEN 1 AND 6),
    department VARCHAR(100),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester_year ON courses(semester, year);

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- PROGRAM OUTCOMES
-- ==================================================================================
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed POs (unchanged)
INSERT INTO program_outcomes (po_number, description, category) VALUES
(1,'Engineering knowledge','technical'),
(2,'Problem analysis','technical'),
(3,'Design/development of solutions','technical'),
(4,'Conduct investigations','technical'),
(5,'Modern tool usage','technical'),
(6,'Engineer and society','professional'),
(7,'Environment and sustainability','professional'),
(8,'Ethics','professional'),
(9,'Individual and team work','communication'),
(10,'Communication','communication'),
(11,'Project management and finance','professional'),
(12,'Life-long learning','professional')
ON CONFLICT (po_number) DO NOTHING;

-- ==================================================================================
-- COURSE OUTCOMES
-- ==================================================================================
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    description TEXT NOT NULL,
    bloom_level VARCHAR(50),

    is_ai_generated BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_number)
);

CREATE INDEX IF NOT EXISTS idx_course_outcomes_course ON course_outcomes(course_id);

CREATE TRIGGER update_course_outcomes_updated_at
BEFORE UPDATE ON course_outcomes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- CO–PO MAPPING
-- ==================================================================================
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INT CHECK (correlation_level BETWEEN 1 AND 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(co_id, po_id)
);

-- ==================================================================================
-- STUDENT ENROLLMENT
-- ==================================================================================
CREATE TABLE IF NOT EXISTS students_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(student_id, course_id)
);

-- ==================================================================================
-- ASSESSMENTS
-- ==================================================================================
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    max_marks DECIMAL(7,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, name)
);

CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- RAW MARKS COLUMNS
-- ==================================================================================
CREATE TABLE IF NOT EXISTS raw_marks_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    column_name VARCHAR(100),
    co_number INT,
    max_marks DECIMAL(7,2),
    UNIQUE(assessment_id, column_name)
);

-- ==================================================================================
-- STUDENT SCORES
-- ==================================================================================
CREATE TABLE IF NOT EXISTS student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    column_name VARCHAR(100),
    marks_obtained DECIMAL(7,2),
    co_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assessment_id, column_name)
);

CREATE TRIGGER update_student_scores_updated_at
BEFORE UPDATE ON student_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- MARKSHEETS
-- ==================================================================================
CREATE TABLE IF NOT EXISTS marksheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255),
    file_name VARCHAR(255),
    file_hash VARCHAR(64) UNIQUE,
    processing_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_marksheets_updated_at
BEFORE UPDATE ON marksheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- QUESTION → CO MAPPINGS (KEPT)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS question_co_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    marksheet_id UUID REFERENCES marksheets(id) ON DELETE CASCADE,
    question_column VARCHAR(255),
    co_number INT CHECK (co_number BETWEEN 1 AND 10),
    co_id UUID REFERENCES course_outcomes(id),
    max_marks DECIMAL(10,2) DEFAULT 10.0,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(marksheet_id, question_column)
);

-- ==================================================================================
-- STUDENT OVERALL SCORES (SINGLE INDEX KEPT)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS student_overall_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    total_obtained DECIMAL(9,2),
    total_max DECIMAL(9,2),
    percentage DECIMAL(5,2),
    letter_grade VARCHAR(4),
    grade_points DECIMAL(3,1),
    credits INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_overall_grade
ON student_overall_scores(letter_grade);

-- ==================================================================================
-- FINAL CIE COMPOSITION (Required for grade calculation)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS final_cie_composition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usn VARCHAR(50),
    student_name VARCHAR(255),

    -- Scaled CIE marks (each out of 30)
    scaled_cie1 DECIMAL(10,2),
    scaled_cie2 DECIMAL(10,2),
    scaled_cie3 DECIMAL(10,2),

    -- Average of scaled CIE
    avg_cie_scaled DECIMAL(10,2), -- (cie1 + cie2 + cie3) / 3

    -- AAT and QUIZ marks
    aat_marks DECIMAL(10,2),
    quiz_marks DECIMAL(10,2),

    -- Final CIE total
    final_cie_total DECIMAL(10,2), -- avg_cie_scaled + aat + quiz
    final_cie_percentage DECIMAL(5,2), -- If total max is known
    final_cie_max DECIMAL(10,2) DEFAULT 50.00, -- Maximum possible (e.g., 30 + 10 + 10 = 50 or 100)

    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_final_cie_course ON final_cie_composition(course_id);
CREATE INDEX IF NOT EXISTS idx_final_cie_student ON final_cie_composition(student_id);

COMMENT ON TABLE final_cie_composition IS 'Final CIE marks composition across all assessments';

-- ==================================================================================
-- SEE MARKS AND FINAL GRADES TABLES
-- Description: Creates tables for SEE marks upload and final grade calculation
-- Date: 2025-01-08

-- =============================================================================
-- TABLE 1: SEE Marks
-- =============================================================================
-- Stores Semester End Examination marks for each student per course

CREATE TABLE IF NOT EXISTS see_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_see_marks_student ON see_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_see_marks_course ON see_marks(course_id);
CREATE INDEX IF NOT EXISTS idx_see_marks_student_course ON see_marks(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_see_marks_upload_date ON see_marks(upload_date DESC);

COMMENT ON TABLE see_marks IS 'Stores Semester End Examination marks for students';
COMMENT ON COLUMN see_marks.see_marks_obtained IS 'SEE marks obtained out of 100';
COMMENT ON COLUMN see_marks.uploaded_by IS 'Teacher who uploaded the SEE marks';

-- =============================================================================
-- TABLE 2: Student Final Grades
-- =============================================================================
-- Stores final computed grades combining CIE and SEE marks

CREATE TABLE IF NOT EXISTS student_final_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- CIE component (max 50)
    cie_total DECIMAL(7,2) NOT NULL DEFAULT 0 CHECK (cie_total >= 0),
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
CREATE INDEX IF NOT EXISTS idx_final_grades_student ON student_final_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_final_grades_course ON student_final_grades(course_id);
CREATE INDEX IF NOT EXISTS idx_final_grades_grade ON student_final_grades(letter_grade);
CREATE INDEX IF NOT EXISTS idx_final_grades_student_course ON student_final_grades(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_final_grades_is_passed ON student_final_grades(is_passed);
CREATE INDEX IF NOT EXISTS idx_final_grades_calculated_at ON student_final_grades(calculated_at DESC);

COMMENT ON TABLE student_final_grades IS 'Stores final grades combining CIE and SEE marks';
COMMENT ON COLUMN student_final_grades.final_total IS 'Final marks = CIE (out of 50) + SEE (scaled to 50)';
COMMENT ON COLUMN student_final_grades.grade_points IS 'Grade points on 10-point scale for CGPA calculation';

-- =============================================================================
-- TABLE 3: Semester Results
-- =============================================================================
-- Stores semester-wise SGPA and aggregated results for each student

CREATE TABLE IF NOT EXISTS semester_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_semester_results_student ON semester_results(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_semester ON semester_results(semester);
CREATE INDEX IF NOT EXISTS idx_semester_results_year ON semester_results(academic_year);
CREATE INDEX IF NOT EXISTS idx_semester_results_student_sem ON semester_results(student_id, semester);
CREATE INDEX IF NOT EXISTS idx_semester_results_sgpa ON semester_results(sgpa DESC);
CREATE INDEX IF NOT EXISTS idx_semester_results_status ON semester_results(semester_status);

COMMENT ON TABLE semester_results IS 'Stores semester-wise SGPA and course statistics';
COMMENT ON COLUMN semester_results.sgpa IS 'Semester GPA = Sum(grade_points × credits) / total_credits';
COMMENT ON COLUMN semester_results.total_credits_earned IS 'Credits earned from passed courses only';

-- =============================================================================
-- TABLE 4: Student CGPA
-- =============================================================================
-- Stores cumulative CGPA across all semesters for each student

CREATE TABLE IF NOT EXISTS student_cgpa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_student_cgpa_student ON student_cgpa(student_id);
CREATE INDEX IF NOT EXISTS idx_student_cgpa_cgpa ON student_cgpa(cgpa DESC); -- For ranking
CREATE INDEX IF NOT EXISTS idx_student_cgpa_current_semester ON student_cgpa(current_semester);

COMMENT ON TABLE student_cgpa IS 'Stores cumulative CGPA and historical progression for students';
COMMENT ON COLUMN student_cgpa.cgpa IS 'Cumulative GPA = Sum(all grade_points × credits) / total_credits';
COMMENT ON COLUMN student_cgpa.cgpa_history IS 'JSON array of historical SGPA and CGPA values per semester';

-- =============================================================================
-- TABLE 5: Grade Point Mapping
-- =============================================================================
-- Reference table for letter grade to grade point conversion (10-point scale)

CREATE TABLE IF NOT EXISTS grade_point_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_grade VARCHAR(4) UNIQUE NOT NULL,
    grade_points DECIMAL(3,1) NOT NULL CHECK (grade_points BETWEEN 0 AND 10),
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_percentage_range CHECK (min_percentage < max_percentage)
);

-- Index for range queries
CREATE INDEX IF NOT EXISTS idx_grade_mapping_range ON grade_point_mapping(min_percentage, max_percentage);

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
-- MIGRATION COMPLETE
-- =============================================================================

SELECT 'Migration 001 completed successfully!' AS status;
SELECT 'Created core tables and grade tracking system' AS info;

-- Migration: Add semester_subjects table for dynamic subject management
-- VTU Regulation: Each semester must have exactly 20 credits

CREATE TABLE IF NOT EXISTS semester_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  academic_year INTEGER NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  credits INTEGER NOT NULL CHECK (credits >= 1 AND credits <= 4),
  grade_point DECIMAL(4,2) CHECK (grade_point >= 0 AND grade_point <= 10),
  letter_grade VARCHAR(2),
  is_passed BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique subject codes per student per semester
  UNIQUE(student_id, semester, subject_code)
);

-- Create index for faster queries
CREATE INDEX idx_semester_subjects_student_semester ON semester_subjects(student_id, semester);

-- Add comment explaining VTU credit system
COMMENT ON TABLE semester_subjects IS 'Stores semester subjects with dynamic credit management. VTU regulation requires exactly 20 credits per semester.';
COMMENT ON COLUMN semester_subjects.credits IS 'Credits for the subject (1, 3, or 4 as per VTU regulations)';
COMMENT ON COLUMN semester_subjects.grade_point IS 'Grade point on 10-point scale (VTU system)';
COMMENT ON COLUMN semester_subjects.is_passed IS 'TRUE if grade_point >= 4 (VTU passing grade)';

-- Create function to validate total credits per semester
CREATE OR REPLACE FUNCTION validate_semester_credits()
RETURNS TRIGGER AS $$
DECLARE
  total_credits INTEGER;
BEGIN
  -- Calculate total credits for this student's semester
  SELECT COALESCE(SUM(credits), 0) INTO total_credits
  FROM semester_subjects
  WHERE student_id = NEW.student_id
    AND semester = NEW.semester
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Add the new/updated credits
  total_credits := total_credits + NEW.credits;

  -- Check if exceeds 20
  IF total_credits > 20 THEN
    RAISE EXCEPTION 'Total credits for semester % cannot exceed 20. Current total: %, Trying to add: %',
      NEW.semester, total_credits - NEW.credits, NEW.credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce credit limit
CREATE TRIGGER check_semester_credits
  BEFORE INSERT OR UPDATE ON semester_subjects
  FOR EACH ROW
  EXECUTE FUNCTION validate_semester_credits();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON semester_subjects TO admin;
GRANT SELECT ON semester_subjects TO student;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003: semester_subjects table created successfully';
  RAISE NOTICE '   - VTU credit validation enabled (max 20 credits per semester)';
  RAISE NOTICE '   - Automatic credit limit enforcement via trigger';
END $$;
