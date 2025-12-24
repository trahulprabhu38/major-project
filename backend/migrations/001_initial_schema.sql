-- ==================================================================================
-- OBE CO/PO Attainment System (Complete Unified Schema)
-- Version: 2.0 (Cleaned & Deduplicated)
-- Author: T Rahul Prabhu
-- Date: 2025-12-02
-- ==================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- UTILITY FUNCTION: update_updated_at_column()
-- ==================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ==================================================================================
-- USERS TABLE
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

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- COURSES TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    year INT NOT NULL CHECK (year >= 2020),
    credits INT DEFAULT 3 CHECK (credits BETWEEN 1 AND 6),
    department VARCHAR(100),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester_year ON courses(semester, year);

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- PROGRAM OUTCOMES (POs)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INT UNIQUE NOT NULL CHECK (po_number > 0),
    description TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_program_outcomes_number ON program_outcomes(po_number);

-- Seed default POs (AICTE/NBA)
INSERT INTO program_outcomes (po_number, description, category) VALUES
(1, 'Engineering knowledge: Apply the knowledge of mathematics, science, engineering fundamentals, and specialization to solve complex problems.', 'technical'),
(2, 'Problem analysis: Identify, formulate, and analyze complex engineering problems using first principles.', 'technical'),
(3, 'Design/development of solutions: Design systems and processes meeting specified needs with consideration for health, safety, society, and environment.', 'technical'),
(4, 'Conduct investigations of complex problems using research-based knowledge and methods.', 'technical'),
(5, 'Modern tool usage: Apply modern engineering and IT tools to engineering activities with understanding of limitations.', 'technical'),
(6, 'The engineer and society: Assess societal, health, safety, and cultural issues relevant to professional engineering.', 'professional'),
(7, 'Environment and sustainability: Understand the impact of engineering solutions on environment and sustainable development.', 'professional'),
(8, 'Ethics: Commit to professional ethics and responsibilities in engineering practice.', 'professional'),
(9, 'Individual and team work: Function effectively as an individual or leader in diverse teams.', 'communication'),
(10, 'Communication: Communicate effectively on complex engineering activities and write effective reports.', 'communication'),
(11, 'Project management and finance: Apply management principles to one''s own work as member and leader in teams.', 'professional'),
(12, 'Life-long learning: Engage in independent and lifelong learning in context of technological change.', 'professional')
ON CONFLICT (po_number) DO NOTHING;

-- ==================================================================================
-- COURSE OUTCOMES (COs) with AI Generation Support
-- ==================================================================================
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    description TEXT NOT NULL,
    bloom_level VARCHAR(50),
    module_number INT,

    -- AI Generation Metadata
    is_ai_generated BOOLEAN DEFAULT FALSE,
    generation_session_id VARCHAR(255),
    quality_score DECIMAL(4,3) CHECK (quality_score BETWEEN 0 AND 1),
    vtu_compliance_score DECIMAL(4,3) CHECK (vtu_compliance_score BETWEEN 0 AND 1),
    obe_alignment_score DECIMAL(4,3) CHECK (obe_alignment_score BETWEEN 0 AND 1),
    bloom_accuracy DECIMAL(4,3) CHECK (bloom_accuracy BETWEEN 0 AND 1),
    conciseness_score DECIMAL(4,3) CHECK (conciseness_score BETWEEN 0 AND 1),
    word_count INT,
    has_action_verb BOOLEAN DEFAULT TRUE,
    has_specific_concepts BOOLEAN DEFAULT TRUE,
    topics_covered TEXT[],
    po_mappings_raw TEXT,
    approved BOOLEAN DEFAULT FALSE,
    feedback_text TEXT,
    regeneration_count INT DEFAULT 0,
    generated_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_number)
);

CREATE INDEX IF NOT EXISTS idx_course_outcomes_course ON course_outcomes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_ai_generated ON course_outcomes(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_session ON course_outcomes(generation_session_id);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_approved ON course_outcomes(approved);

DROP TRIGGER IF EXISTS update_course_outcomes_updated_at ON course_outcomes;
CREATE TRIGGER update_course_outcomes_updated_at BEFORE UPDATE ON course_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- CO-PO MAPPING TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INT CHECK (correlation_level BETWEEN 1 AND 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(co_id, po_id)
);

CREATE INDEX IF NOT EXISTS idx_co_po_co ON co_po_mapping(co_id);
CREATE INDEX IF NOT EXISTS idx_co_po_po ON co_po_mapping(po_id);

-- ==================================================================================
-- STUDENTS-COURSES (ENROLLMENT)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS students_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_students_courses_student ON students_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_students_courses_course ON students_courses(course_id);

-- ==================================================================================
-- ASSESSMENTS TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_date DATE DEFAULT CURRENT_DATE,
    max_marks DECIMAL(7,2) NOT NULL,
    weightage DECIMAL(7,2) DEFAULT 1.0,
    is_cie_component BOOLEAN DEFAULT TRUE,
    is_see_component BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- RAW MARKS COLUMNS (metadata for Q1A / Q1B style columns)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS raw_marks_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    column_name VARCHAR(100) NOT NULL,
    co_number INT,
    max_marks DECIMAL(7,2) NOT NULL DEFAULT 0,
    column_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, column_name)
);

CREATE INDEX IF NOT EXISTS idx_raw_marks_columns_assessment ON raw_marks_columns(assessment_id);
CREATE INDEX IF NOT EXISTS idx_raw_marks_columns_co ON raw_marks_columns(co_number);

-- ==================================================================================
-- STUDENT SCORES (normalized long format)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    column_name VARCHAR(100),
    marks_obtained DECIMAL(7,2) NOT NULL CHECK (marks_obtained >= 0),
    max_marks DECIMAL(7,2) NOT NULL CHECK (max_marks >= 0),
    co_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assessment_id, column_name)
);

CREATE INDEX IF NOT EXISTS idx_student_scores_assessment ON student_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_co_number ON student_scores(co_number);

DROP TRIGGER IF EXISTS update_student_scores_updated_at ON student_scores;
CREATE TRIGGER update_student_scores_updated_at BEFORE UPDATE ON student_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- STUDENT CO SCORES (aggregated per student per CO per assessment)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS student_co_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    obtained_marks DECIMAL(9,2) NOT NULL CHECK (obtained_marks >= 0),
    max_marks DECIMAL(9,2) NOT NULL CHECK (max_marks > 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assessment_id, co_id)
);

CREATE INDEX IF NOT EXISTS idx_student_co_course ON student_co_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_student_co_assessment ON student_co_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_student_co_student ON student_co_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_co_co ON student_co_scores(co_id);

-- ==================================================================================
-- CO ATTAINMENT (cached per course, co, assessment)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS co_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id),
    co_id UUID REFERENCES course_outcomes(id),
    assessment_id UUID REFERENCES assessments(id),
    attainment_percentage DECIMAL(5,2) NOT NULL CHECK (attainment_percentage BETWEEN 0 AND 100),
    total_students INT NOT NULL CHECK (total_students >= 0),
    students_above_threshold INT NOT NULL CHECK (students_above_threshold >= 0),
    threshold_percentage DECIMAL(5,2) DEFAULT 60.0 CHECK (threshold_percentage BETWEEN 0 AND 100),
    obtained_marks DECIMAL(12,2) DEFAULT 0,
    max_marks DECIMAL(12,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_co_attainment_course ON co_attainment(course_id);
CREATE INDEX IF NOT EXISTS idx_co_attainment_co ON co_attainment(co_id);

-- ==================================================================================
-- PO ATTAINMENT (cached per course, per PO)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS po_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id),
    po_id UUID REFERENCES program_outcomes(id),
    attainment_level DECIMAL(5,2) NOT NULL CHECK (attainment_level BETWEEN 0 AND 3),
    po_percentage DECIMAL(5,2) CHECK (po_percentage BETWEEN 0 AND 100),
    calculation_method VARCHAR(50) DEFAULT 'combined',
    calculation_details JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, po_id)
);

CREATE INDEX IF NOT EXISTS idx_po_attainment_course ON po_attainment(course_id);
CREATE INDEX IF NOT EXISTS idx_po_attainment_po ON po_attainment(po_id);

-- ==================================================================================
-- STUDENT OVERALL SCORES (per student per course)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS student_overall_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_obtained DECIMAL(9,2) NOT NULL CHECK (total_obtained >= 0),
    total_max DECIMAL(9,2) NOT NULL CHECK (total_max > 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    grade VARCHAR(4),
    cie_obtained DECIMAL(9,2) DEFAULT 0,
    cie_max DECIMAL(9,2) DEFAULT 0,
    cie_percentage DECIMAL(5,2) DEFAULT 0,
    see_obtained DECIMAL(9,2) DEFAULT 0,
    see_max DECIMAL(9,2) DEFAULT 0,
    see_percentage DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_overall_student ON student_overall_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_overall_course ON student_overall_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_student_overall_grade ON student_overall_scores(grade);

-- ==================================================================================
-- CO CALCULATION SNAPSHOT (audit)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS co_calculation_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    cie_percent DECIMAL(5,2) DEFAULT 0,
    see_percent DECIMAL(5,2) DEFAULT 0,
    ces_percent DECIMAL(5,2) DEFAULT 0,
    final_percent DECIMAL(5,2) NOT NULL CHECK (final_percent BETWEEN 0 AND 100),
    calculation_method VARCHAR(50) DEFAULT 'weighted_average',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_co_snapshot_course ON co_calculation_snapshot(course_id);
CREATE INDEX IF NOT EXISTS idx_co_snapshot_co ON co_calculation_snapshot(co_id);
CREATE INDEX IF NOT EXISTS idx_co_snapshot_calculated ON co_calculation_snapshot(calculated_at DESC);

-- ==================================================================================
-- MARKSHEETS TABLE (file metadata + idempotency)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS marksheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255),
    columns JSONB DEFAULT '[]',
    row_count INT DEFAULT 0,
    file_hash VARCHAR(64) UNIQUE,
    processed_at TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed')),
    error_details TEXT,
    warnings JSONB DEFAULT '[]',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marksheets_course ON marksheets(course_id);
CREATE INDEX IF NOT EXISTS idx_marksheets_file_hash ON marksheets(file_hash);
CREATE INDEX IF NOT EXISTS idx_marksheets_status ON marksheets(processing_status);

DROP TRIGGER IF EXISTS update_marksheets_updated_at ON marksheets;
CREATE TRIGGER update_marksheets_updated_at BEFORE UPDATE ON marksheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- COURSE CONFIG (weights, thresholds)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS course_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID UNIQUE NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assessment_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    cie_weight DECIMAL(4,2) DEFAULT 0.70 CHECK (cie_weight BETWEEN 0 AND 1),
    see_weight DECIMAL(4,2) DEFAULT 0.20 CHECK (see_weight BETWEEN 0 AND 1),
    ces_weight DECIMAL(4,2) DEFAULT 0.10 CHECK (ces_weight BETWEEN 0 AND 1),
    attainment_threshold DECIMAL(5,2) DEFAULT 60.0 CHECK (attainment_threshold BETWEEN 0 AND 100),
    grade_boundaries JSONB NOT NULL DEFAULT '{"S": 90, "A": 80, "B": 70, "C": 60, "D": 50, "E": 40, "F": 0}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_config_course ON course_config(course_id);

DROP TRIGGER IF EXISTS update_course_config_updated_at ON course_config;
CREATE TRIGGER update_course_config_updated_at BEFORE UPDATE ON course_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default course_config for existing courses (idempotent)
INSERT INTO course_config (course_id, assessment_weights, cie_weight, see_weight, ces_weight, attainment_threshold, grade_boundaries)
SELECT id,
       '{"Test1": 20, "Test2": 20, "Test3": 20, "AAT": 10, "Quiz": 10, "SEE": 20}'::jsonb,
       0.70, 0.20, 0.10, 60.0,
       '{"S": 90, "A": 80, "B": 70, "C": 60, "D": 50, "E": 40, "F": 0}'::jsonb
FROM courses
WHERE id NOT IN (SELECT course_id FROM course_config)
ON CONFLICT (course_id) DO NOTHING;

-- ==================================================================================
-- AI CO Generation Sessions
-- ==================================================================================
CREATE TABLE IF NOT EXISTS ai_co_generation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    num_apply INT NOT NULL DEFAULT 2,
    num_analyze INT NOT NULL DEFAULT 2,
    use_chromadb BOOLEAN DEFAULT FALSE,
    file_names TEXT[],
    extracted_text_length INT,
    files_processed INT,
    document_processing_ms DECIMAL(10,2),
    embedding_generation_ms DECIMAL(10,2),
    graph_construction_ms DECIMAL(10,2),
    vector_search_ms DECIMAL(10,2),
    graph_traversal_ms DECIMAL(10,2),
    llm_inference_ms DECIMAL(10,2),
    refinement_ms DECIMAL(10,2),
    total_pipeline_ms DECIMAL(10,2),
    average_quality_score DECIMAL(4,3),
    average_vtu_compliance DECIMAL(4,3),
    average_obe_alignment DECIMAL(4,3),
    bloom_classification_accuracy DECIMAL(4,3),
    po_coverage DECIMAL(4,3),
    inference_latency_ms DECIMAL(10,2),
    throughput_cos_per_sec DECIMAL(10,2),
    cache_hit_rate DECIMAL(4,3),
    model_type VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_course ON ai_co_generation_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_teacher ON ai_co_generation_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created ON ai_co_generation_sessions(created_at DESC);

DROP TRIGGER IF EXISTS update_ai_sessions_updated_at ON ai_co_generation_sessions;
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_co_generation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- AI CO Feedback
-- ==================================================================================
CREATE TABLE IF NOT EXISTS ai_co_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    approved BOOLEAN NOT NULL,
    feedback_text TEXT,
    edited_text TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_session ON ai_co_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_co ON ai_co_feedback(co_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_co_feedback(user_id);

-- ==================================================================================
-- AI CO Regeneration History
-- ==================================================================================
CREATE TABLE IF NOT EXISTS ai_co_regeneration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    previous_text TEXT NOT NULL,
    previous_quality_score DECIMAL(4,3),
    feedback TEXT,
    bloom_level VARCHAR(50),
    new_text TEXT NOT NULL,
    new_quality_score DECIMAL(4,3),
    new_vtu_compliance DECIMAL(4,3),
    new_obe_alignment DECIMAL(4,3),
    new_bloom_accuracy DECIMAL(4,3),
    regenerated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    regenerated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_regen_co ON ai_co_regeneration_history(co_id);
CREATE INDEX IF NOT EXISTS idx_ai_regen_user ON ai_co_regeneration_history(regenerated_by);

-- ==================================================================================
-- END OF SCHEMA
-- ==================================================================================

\echo '✅ OBE Attainment System schema created successfully!';
\echo '✅ All duplicate definitions removed and consolidated!';


-- ============================================================================
-- DETAILED ATTAINMENT CALCULATIONS SCHEMA
-- Based on vertical/horizontal calculation methodology
-- ============================================================================

-- Table 1: Per-Question Vertical Analysis
-- Stores vertical (column-wise) calculations for each question in each assessment
CREATE TABLE IF NOT EXISTS question_vertical_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  question_column VARCHAR(100) NOT NULL, -- e.g., "Q1A", "Q1B"
  co_number INTEGER, -- CO this question maps to
  max_marks DECIMAL(10,2) NOT NULL,

  -- Vertical calculations
  attempts_count INTEGER NOT NULL, -- A: students who attempted (non-null, > 0)
  vertical_sum DECIMAL(10,2) NOT NULL, -- Sum of all marks for this question
  vertical_avg DECIMAL(10,2), -- Average marks for this question

  -- CO attainment for this question
  threshold_60pct DECIMAL(10,2) NOT NULL, -- 60% of max_marks
  students_above_threshold INTEGER NOT NULL, -- B: count of students scoring > 60%
  co_attainment_percent DECIMAL(5,2), -- (B/A) * 100

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marksheet_id, question_column)
);

CREATE INDEX idx_question_vertical_course ON question_vertical_analysis(course_id);
CREATE INDEX idx_question_vertical_marksheet ON question_vertical_analysis(marksheet_id);
CREATE INDEX idx_question_vertical_co ON question_vertical_analysis(co_number);

-- Table 2: Per-Student Horizontal Analysis (Per File)
-- Stores horizontal (row-wise) calculations for each student in each assessment
CREATE TABLE IF NOT EXISTS student_horizontal_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usn VARCHAR(50),
  student_name VARCHAR(255),

  -- Horizontal totals (per file/assessment)
  total_marks_raw DECIMAL(10,2) NOT NULL, -- Sum of all questions for this student
  max_marks_possible DECIMAL(10,2) NOT NULL, -- Total max marks for this assessment
  percentage DECIMAL(5,2), -- (total_marks_raw / max_marks_possible) * 100

  -- Scaled marks (for CIE files: 50 -> 30)
  scaled_marks DECIMAL(10,2), -- total_marks_raw * (30/50) for CIE files

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marksheet_id, student_id)
);

CREATE INDEX idx_student_horizontal_course ON student_horizontal_analysis(course_id);
CREATE INDEX idx_student_horizontal_marksheet ON student_horizontal_analysis(marksheet_id);
CREATE INDEX idx_student_horizontal_student ON student_horizontal_analysis(student_id);

-- Table 3: File-Level Summary
-- Stores aggregate statistics for each assessment file
CREATE TABLE IF NOT EXISTS file_level_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  assessment_name VARCHAR(255) NOT NULL,
  assessment_type VARCHAR(50), -- CIE1, CIE2, CIE3, AAT, QUIZ

  -- File-level statistics
  total_students INTEGER NOT NULL,
  max_marks_possible DECIMAL(10,2) NOT NULL,
  avg_marks DECIMAL(10,2), -- Mean of student horizontal totals
  avg_percentage DECIMAL(5,2), -- Mean of student percentages

  -- Scaling info
  original_max DECIMAL(10,2), -- Original max (e.g., 50 for CIE)
  scaled_max DECIMAL(10,2), -- Scaled max (e.g., 30 for CIE)
  scaling_factor DECIMAL(5,4), -- e.g., 0.6 for 30/50

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marksheet_id)
);

CREATE INDEX idx_file_summary_course ON file_level_summary(course_id);
CREATE INDEX idx_file_summary_type ON file_level_summary(assessment_type);

-- Table 4: CO-Level Aggregated Analysis (Per Assessment)
-- Aggregates all questions mapped to each CO within an assessment
CREATE TABLE IF NOT EXISTS co_level_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
  co_number INTEGER NOT NULL,

  -- CO-level aggregated data
  co_max_marks DECIMAL(10,2) NOT NULL, -- Sum of max marks of all questions for this CO
  co_vertical_sum DECIMAL(10,2) NOT NULL, -- Sum of all student marks for this CO
  co_attempts INTEGER NOT NULL, -- Total attempts across all CO questions

  -- CO attainment (aggregated)
  co_threshold_60pct DECIMAL(10,2) NOT NULL, -- 60% of co_max_marks
  co_students_above_threshold INTEGER NOT NULL, -- Students whose CO total >= threshold
  co_attainment_percent DECIMAL(5,2), -- (B/A) * 100 at CO level

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marksheet_id, co_id)
);

CREATE INDEX idx_co_level_course ON co_level_analysis(course_id);
CREATE INDEX idx_co_level_marksheet ON co_level_analysis(marksheet_id);
CREATE INDEX idx_co_level_co ON co_level_analysis(co_id);

-- Table 5: Final CIE Composition (Combined across CIE1, CIE2, CIE3, AAT, QUIZ)
-- Stores the final computed CIE marks for each student
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
  final_cie_max DECIMAL(10,2), -- Maximum possible (e.g., 30 + 10 + 10 = 50)

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_final_cie_course ON final_cie_composition(course_id);
CREATE INDEX idx_final_cie_student ON final_cie_composition(student_id);

-- Table 6: Question-CO Mapping
-- Stores which questions map to which COs (extracted from column headers)
CREATE TABLE IF NOT EXISTS question_co_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  question_column VARCHAR(100) NOT NULL,
  co_number INTEGER NOT NULL,
  max_marks DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marksheet_id, question_column)
);

CREATE INDEX idx_question_co_mapping_course ON question_co_mapping(course_id);
CREATE INDEX idx_question_co_mapping_marksheet ON question_co_mapping(marksheet_id);

-- View: Combined CO Attainment Across All CIE Assessments
-- Aggregates CO attainment from CIE1, CIE2, CIE3
CREATE OR REPLACE VIEW combined_co_attainment AS
SELECT
  cla.course_id,
  cla.co_id,
  cla.co_number,
  co.description as co_description,
  co.bloom_level,

  -- Aggregate across all CIE assessments
  SUM(cla.co_max_marks) as total_co_max_marks,
  SUM(cla.co_vertical_sum) as total_co_marks_obtained,
  SUM(cla.co_attempts) as total_co_attempts,
  SUM(cla.co_students_above_threshold) as total_students_above_threshold,

  -- Average CO attainment across assessments
  AVG(cla.co_attainment_percent) as avg_co_attainment_percent,

  -- Overall CO attainment (aggregated)
  CASE
    WHEN SUM(cla.co_attempts) > 0
    THEN (SUM(cla.co_students_above_threshold)::DECIMAL / SUM(cla.co_attempts)) * 100
    ELSE 0
  END as overall_co_attainment_percent,

  MAX(cla.calculated_at) as last_calculated
FROM co_level_analysis cla
JOIN course_outcomes co ON cla.co_id = co.id
JOIN file_level_summary fls ON cla.marksheet_id = fls.marksheet_id
WHERE fls.assessment_type IN ('CIE1', 'CIE2', 'CIE3')
GROUP BY cla.course_id, cla.co_id, cla.co_number, co.description, co.bloom_level;

-- View: Student Performance Summary
-- Shows complete student performance across all assessments
CREATE OR REPLACE VIEW student_performance_summary AS
SELECT
  sha.course_id,
  sha.student_id,
  u.usn,
  u.name as student_name,
  fls.assessment_name,
  fls.assessment_type,
  sha.total_marks_raw,
  sha.scaled_marks,
  sha.percentage,
  fls.max_marks_possible,
  fls.scaled_max,
  sha.calculated_at
FROM student_horizontal_analysis sha
JOIN users u ON sha.student_id = u.id
JOIN file_level_summary fls ON sha.marksheet_id = fls.marksheet_id
ORDER BY sha.course_id, u.usn, fls.assessment_type;

COMMENT ON TABLE question_vertical_analysis IS 'Per-question vertical (column-wise) analysis for each assessment';
COMMENT ON TABLE student_horizontal_analysis IS 'Per-student horizontal (row-wise) analysis for each assessment';
COMMENT ON TABLE file_level_summary IS 'File-level aggregate statistics for each assessment';
COMMENT ON TABLE co_level_analysis IS 'CO-level aggregated analysis within each assessment';
COMMENT ON TABLE final_cie_composition IS 'Final CIE marks composition across all assessments';
COMMENT ON TABLE question_co_mapping IS 'Mapping of questions to COs extracted from headers';


CREATE TABLE IF NOT EXISTS question_co_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  question_column VARCHAR(255) NOT NULL,
  co_number INTEGER NOT NULL CHECK (co_number BETWEEN 1 AND 10),
  co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one mapping per question per marksheet
  UNIQUE(marksheet_id, question_column)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_co_mappings_marksheet ON question_co_mappings(marksheet_id);
CREATE INDEX IF NOT EXISTS idx_co_mappings_course ON question_co_mappings(course_id);

-- Table to store CO mapping file metadata
CREATE TABLE IF NOT EXISTS co_mapping_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  marksheet_id UUID NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  mappings_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One CO mapping file per marksheet
  UNIQUE(marksheet_id)
);

-- Comments
COMMENT ON TABLE question_co_mappings IS 'Stores explicit question-to-CO mappings uploaded by teachers';
COMMENT ON TABLE co_mapping_files IS 'Metadata for uploaded CO mapping files';


ALTER TABLE question_co_mappings
ADD COLUMN IF NOT EXISTS max_marks DECIMAL(10, 2) DEFAULT 10.0;

-- Update comment
COMMENT ON COLUMN question_co_mappings.max_marks IS 'Maximum marks for this question. Questions with max_marks = 0 are ignored.';

