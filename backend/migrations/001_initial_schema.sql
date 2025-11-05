-- ==================================================================================
-- OBE CO/PO Attainment System - PostgreSQL Schema
-- Version: 1.5 (Unified Users Model for Node Backend)
-- Author: T Rahul Prabhu
-- Date: 2025-11-06
-- ==================================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- USERS TABLE (Unified for teachers, students, admins)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    name VARCHAR(255) NOT NULL,
    usn VARCHAR(50) UNIQUE,               -- Unique for students only
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_usn ON users(usn);

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
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- from unified users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_semester_year ON courses(semester, year);

-- ==================================================================================
-- PROGRAM OUTCOMES (POs)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INT UNIQUE NOT NULL CHECK (po_number > 0),
    description TEXT NOT NULL,
    category VARCHAR(100) CHECK (category IN ('technical', 'professional', 'communication')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_program_outcomes_number ON program_outcomes(po_number);

-- ==================================================================================
-- COURSE OUTCOMES (COs)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    co_number INT NOT NULL CHECK (co_number > 0),
    description TEXT NOT NULL,
    bloom_level VARCHAR(50) CHECK (
        bloom_level IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')
    ),
    module_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_number)
);

CREATE INDEX idx_cos_course ON course_outcomes(course_id);

-- ==================================================================================
-- CO-PO MAPPING TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INT CHECK (correlation_level BETWEEN 1 AND 3),  -- 1=Low, 2=Medium, 3=High
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(co_id, po_id)
);

CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);

-- ==================================================================================
-- STUDENT-COURSE ENROLLMENT
-- ==================================================================================

CREATE TABLE IF NOT EXISTS students_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollment_student ON students_courses(student_id);
CREATE INDEX idx_enrollment_course ON students_courses(course_id);

-- ==================================================================================
-- ASSESSMENTS TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('AAT', 'CIE', 'LAB', 'ASSIGNMENT', 'PROJECT', 'SEE')
    ),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_date DATE NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL CHECK (max_marks > 0),
    weightage DECIMAL(5,2) DEFAULT 1.0 CHECK (weightage >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_type ON assessments(type);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);

-- ==================================================================================
-- QUESTIONS TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL CHECK (max_marks > 0),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, question_number)
);

CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_questions_co ON questions(co_id);

-- ==================================================================================
-- QUESTION-PO MAPPING TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS question_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    UNIQUE(question_id, po_id)
);

CREATE INDEX idx_question_po_question ON question_po_mapping(question_id);
CREATE INDEX idx_question_po_po ON question_po_mapping(po_id);

-- ==================================================================================
-- STUDENT SCORES TABLE
-- ==================================================================================

CREATE TABLE IF NOT EXISTS student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, question_id)
);

CREATE INDEX idx_scores_student ON student_scores(student_id);
CREATE INDEX idx_scores_question ON student_scores(question_id);

-- ==================================================================================
-- CO ATTAINMENT TABLE (Cached Results)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS co_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    attainment_percentage DECIMAL(5,2) NOT NULL CHECK (attainment_percentage BETWEEN 0 AND 100),
    total_students INT NOT NULL CHECK (total_students >= 0),
    students_above_threshold INT NOT NULL CHECK (students_above_threshold >= 0),
    threshold_percentage DECIMAL(5,2) DEFAULT 60.0 CHECK (threshold_percentage BETWEEN 0 AND 100),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_id, assessment_id)
);

CREATE INDEX idx_co_attainment_course ON co_attainment(course_id);
CREATE INDEX idx_co_attainment_co ON co_attainment(co_id);

-- ==================================================================================
-- PO ATTAINMENT TABLE (Cached Results)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS po_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    attainment_level DECIMAL(5,2) NOT NULL CHECK (attainment_level BETWEEN 0 AND 3),
    calculation_method VARCHAR(50) CHECK (calculation_method IN ('direct', 'indirect', 'combined')),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, po_id)
);

CREATE INDEX idx_po_attainment_course ON po_attainment(course_id);
CREATE INDEX idx_po_attainment_po ON po_attainment(po_id);

-- ==================================================================================
-- TRIGGERS: Auto-update `updated_at` columns
-- ==================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_scores_updated_at BEFORE UPDATE ON student_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- SEED DATA: Default Program Outcomes (AICTE/NBA)
-- ==================================================================================

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
(11, 'Project management and finance: Apply management principles to one’s own work as member and leader in teams.', 'professional'),
(12, 'Life-long learning: Engage in independent and lifelong learning in context of technological change.', 'professional')
ON CONFLICT (po_number) DO NOTHING;

-- ==================================================================================
-- GRANTS (optional for controlled DB users)
-- ==================================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ==================================================================================
-- END OF SCHEMA
-- ==================================================================================

\echo '✅ Unified OBE CO/PO schema created successfully!'
