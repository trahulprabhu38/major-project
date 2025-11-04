-- OBE CO/PO Attainment System - PostgreSQL Schema
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (students and teachers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    name VARCHAR(255) NOT NULL,
    usn VARCHAR(50) UNIQUE, -- Unique for students
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_usn ON users(usn);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semester INT NOT NULL,
    year INT NOT NULL,
    credits INT DEFAULT 3,
    department VARCHAR(100),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_semester_year ON courses(semester, year);

-- Program Outcomes (POs) - Global to institution
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- e.g., 'technical', 'professional', 'communication'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Outcomes (COs)
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_number INT NOT NULL,
    description TEXT NOT NULL,
    bloom_level VARCHAR(50), -- e.g., 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
    module_number INT, -- Which module this CO belongs to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_number)
);

CREATE INDEX idx_cos_course ON course_outcomes(course_id);

-- CO-PO Mapping (many-to-many relationship)
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INT CHECK (correlation_level BETWEEN 1 AND 3), -- 1=Low, 2=Medium, 3=High
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(co_id, po_id)
);

CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);

-- Student-Course enrollment
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

-- Assessments (Internal exams, assignments, labs)
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'AAT', 'CIE', 'LAB', 'ASSIGNMENT', 'PROJECT'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_date DATE NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    weightage DECIMAL(5,2) DEFAULT 1.0, -- Weight in final calculation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_type ON assessments(type);

-- Questions in each assessment
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT,
    max_marks DECIMAL(5,2) NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, question_number)
);

CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_questions_co ON questions(co_id);

-- Question-PO mapping (a question can map to multiple POs)
CREATE TABLE IF NOT EXISTS question_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    UNIQUE(question_id, po_id)
);

CREATE INDEX idx_question_po_question ON question_po_mapping(question_id);
CREATE INDEX idx_question_po_po ON question_po_mapping(po_id);

-- Student scores for each question
CREATE TABLE IF NOT EXISTS student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, question_id)
);

CREATE INDEX idx_scores_student ON student_scores(student_id);
CREATE INDEX idx_scores_question ON student_scores(question_id);

-- Calculated CO Attainment (cached results)
CREATE TABLE IF NOT EXISTS co_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    attainment_percentage DECIMAL(5,2) NOT NULL,
    total_students INT NOT NULL,
    students_above_threshold INT NOT NULL,
    threshold_percentage DECIMAL(5,2) DEFAULT 60.0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, co_id, assessment_id)
);

CREATE INDEX idx_co_attainment_course ON co_attainment(course_id);
CREATE INDEX idx_co_attainment_co ON co_attainment(co_id);

-- Calculated PO Attainment (cached results)
CREATE TABLE IF NOT EXISTS po_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    attainment_level DECIMAL(5,2) NOT NULL,
    calculation_method VARCHAR(50), -- 'direct', 'indirect', 'combined'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, po_id)
);

CREATE INDEX idx_po_attainment_course ON po_attainment(course_id);
CREATE INDEX idx_po_attainment_po ON po_attainment(po_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_scores_updated_at BEFORE UPDATE ON student_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
