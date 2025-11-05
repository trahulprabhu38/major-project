-- -- OBE CO/PO Attainment System - PostgreSQL Schema
-- -- Migration: 001_initial_schema

-- -- Enable UUID extension
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- Users table (students and teachers)
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
--     name VARCHAR(255) NOT NULL,
--     usn VARCHAR(50) UNIQUE, -- Unique for students
--     department VARCHAR(100),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Create index on email for faster lookups
-- CREATE INDEX idx_users_email ON users(email);
-- CREATE INDEX idx_users_role ON users(role);
-- CREATE INDEX idx_users_usn ON users(usn);

-- -- Courses table
-- CREATE TABLE IF NOT EXISTS courses (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     code VARCHAR(50) UNIQUE NOT NULL,
--     name VARCHAR(255) NOT NULL,
--     description TEXT,
--     semester INT NOT NULL,
--     year INT NOT NULL,
--     credits INT DEFAULT 3,
--     department VARCHAR(100),
--     teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX idx_courses_teacher ON courses(teacher_id);
-- CREATE INDEX idx_courses_semester_year ON courses(semester, year);

-- -- Program Outcomes (POs) - Global to institution
-- CREATE TABLE IF NOT EXISTS program_outcomes (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     po_number INT UNIQUE NOT NULL,
--     description TEXT NOT NULL,
--     category VARCHAR(100), -- e.g., 'technical', 'professional', 'communication'
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Course Outcomes (COs)
-- CREATE TABLE IF NOT EXISTS course_outcomes (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     co_number INT NOT NULL,
--     description TEXT NOT NULL,
--     bloom_level VARCHAR(50), -- e.g., 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
--     module_number INT, -- Which module this CO belongs to
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(course_id, co_number)
-- );

-- CREATE INDEX idx_cos_course ON course_outcomes(course_id);

-- -- CO-PO Mapping (many-to-many relationship)
-- CREATE TABLE IF NOT EXISTS co_po_mapping (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
--     po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
--     correlation_level INT CHECK (correlation_level BETWEEN 1 AND 3), -- 1=Low, 2=Medium, 3=High
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(co_id, po_id)
-- );

-- CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
-- CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);

-- -- Student-Course enrollment
-- CREATE TABLE IF NOT EXISTS students_courses (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     student_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
--     UNIQUE(student_id, course_id)
-- );

-- CREATE INDEX idx_enrollment_student ON students_courses(student_id);
-- CREATE INDEX idx_enrollment_course ON students_courses(course_id);

-- -- Assessments (Internal exams, assignments, labs)
-- CREATE TABLE IF NOT EXISTS assessments (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     type VARCHAR(50) NOT NULL, -- 'AAT', 'CIE', 'LAB', 'ASSIGNMENT', 'PROJECT'
--     name VARCHAR(255) NOT NULL,
--     description TEXT,
--     assessment_date DATE NOT NULL,
--     max_marks DECIMAL(5,2) NOT NULL,
--     weightage DECIMAL(5,2) DEFAULT 1.0, -- Weight in final calculation
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX idx_assessments_course ON assessments(course_id);
-- CREATE INDEX idx_assessments_type ON assessments(type);

-- -- Questions in each assessment
-- CREATE TABLE IF NOT EXISTS questions (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
--     question_number INT NOT NULL,
--     question_text TEXT,
--     max_marks DECIMAL(5,2) NOT NULL,
--     co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(assessment_id, question_number)
-- );

-- CREATE INDEX idx_questions_assessment ON questions(assessment_id);
-- CREATE INDEX idx_questions_co ON questions(co_id);

-- -- Question-PO mapping (a question can map to multiple POs)
-- CREATE TABLE IF NOT EXISTS question_po_mapping (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
--     po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
--     UNIQUE(question_id, po_id)
-- );

-- CREATE INDEX idx_question_po_question ON question_po_mapping(question_id);
-- CREATE INDEX idx_question_po_po ON question_po_mapping(po_id);

-- -- Student scores for each question
-- CREATE TABLE IF NOT EXISTS student_scores (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     student_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
--     marks_obtained DECIMAL(5,2) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(student_id, question_id)
-- );

-- CREATE INDEX idx_scores_student ON student_scores(student_id);
-- CREATE INDEX idx_scores_question ON student_scores(question_id);

-- -- Calculated CO Attainment (cached results)
-- CREATE TABLE IF NOT EXISTS co_attainment (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
--     assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
--     attainment_percentage DECIMAL(5,2) NOT NULL,
--     total_students INT NOT NULL,
--     students_above_threshold INT NOT NULL,
--     threshold_percentage DECIMAL(5,2) DEFAULT 60.0,
--     calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(course_id, co_id, assessment_id)
-- );

-- CREATE INDEX idx_co_attainment_course ON co_attainment(course_id);
-- CREATE INDEX idx_co_attainment_co ON co_attainment(co_id);

-- -- Calculated PO Attainment (cached results)
-- CREATE TABLE IF NOT EXISTS po_attainment (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
--     attainment_level DECIMAL(5,2) NOT NULL,
--     calculation_method VARCHAR(50), -- 'direct', 'indirect', 'combined'
--     calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(course_id, po_id)
-- );

-- CREATE INDEX idx_po_attainment_course ON po_attainment(course_id);
-- CREATE INDEX idx_po_attainment_po ON po_attainment(po_id);

-- -- Create updated_at trigger function
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- -- Apply triggers to tables with updated_at
-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_student_scores_updated_at BEFORE UPDATE ON student_scores
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==================================================================================
-- OBE CO/PO Attainment System - Complete PostgreSQL Schema
-- Version: 2.0 (Normalized & Refactored)
-- Date: 2025-11-05
-- ==================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- CORE TABLES
-- ==================================================================================

-- ==================== TEACHERS TABLE ====================
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    specialization VARCHAR(100),
    experience_years INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_department ON teachers(department);

COMMENT ON TABLE teachers IS 'Teachers/Faculty in the institution';
COMMENT ON COLUMN teachers.password_hash IS 'Bcrypt hashed password';

-- ==================== STUDENTS TABLE ====================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    usn VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    semester INTEGER,
    department VARCHAR(100),
    batch_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_semester CHECK (semester BETWEEN 1 AND 8)
);

CREATE INDEX idx_students_usn ON students(usn);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_department ON students(department);
CREATE INDEX idx_students_batch ON students(batch_year);

COMMENT ON TABLE students IS 'Students enrolled in the institution';
COMMENT ON COLUMN students.usn IS 'University Serial Number - unique student identifier';

-- ==================== ADMINS TABLE ====================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_email ON admins(email);

COMMENT ON TABLE admins IS 'System administrators';

-- ==================== COURSES TABLE ====================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    credits INTEGER DEFAULT 3,
    department VARCHAR(100),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_semester_range CHECK (semester BETWEEN 1 AND 8),
    CONSTRAINT chk_credits CHECK (credits >= 0)
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_semester_year ON courses(semester, year);
CREATE INDEX idx_courses_department ON courses(department);

COMMENT ON TABLE courses IS 'Courses offered in the institution';
COMMENT ON COLUMN courses.code IS 'Unique course code (e.g., CS101, DS1)';

-- ==================== COURSE OUTCOMES (COs) ====================
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    co_number INTEGER NOT NULL,
    co_text TEXT NOT NULL,
    description TEXT,
    bloom_level VARCHAR(50),
    module_number INTEGER,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, co_number),
    CONSTRAINT chk_co_number CHECK (co_number > 0),
    CONSTRAINT chk_bloom_level CHECK (bloom_level IN (
        'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
    ))
);

CREATE INDEX idx_cos_course ON course_outcomes(course_id);
CREATE INDEX idx_cos_teacher ON course_outcomes(teacher_id);
CREATE INDEX idx_cos_bloom ON course_outcomes(bloom_level);
CREATE INDEX idx_cos_verified ON course_outcomes(verified);

COMMENT ON TABLE course_outcomes IS 'Course Outcomes - AI-generated or manually created';
COMMENT ON COLUMN course_outcomes.bloom_level IS 'Bloom''s Taxonomy level (1-6)';
COMMENT ON COLUMN course_outcomes.verified IS 'Teacher verification status';

-- ==================== PROGRAM OUTCOMES (POs) ====================
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number INTEGER UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_po_number CHECK (po_number > 0)
);

CREATE INDEX idx_pos_number ON program_outcomes(po_number);

COMMENT ON TABLE program_outcomes IS 'Institution-wide Program Outcomes';
COMMENT ON COLUMN program_outcomes.category IS 'e.g., technical, professional, communication';

-- ==================== CO-PO MAPPING ====================
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level BETWEEN 1 AND 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(co_id, po_id)
);

CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);

COMMENT ON TABLE co_po_mapping IS 'Maps COs to POs with correlation levels';
COMMENT ON COLUMN co_po_mapping.correlation_level IS '1=Low, 2=Medium, 3=High correlation';

-- ==================================================================================
-- ENROLLMENT & ASSESSMENT TABLES
-- ==================================================================================

-- ==================== STUDENT ENROLLMENTS ====================
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    enrolled_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_on TIMESTAMP,

    UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollment_student ON enrollments(student_id);
CREATE INDEX idx_enrollment_course ON enrollments(course_id);
CREATE INDEX idx_enrollment_status ON enrollments(status);

COMMENT ON TABLE enrollments IS 'Student-Course enrollment tracking';

-- ==================== ASSESSMENTS ====================
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    total_questions INTEGER,
    max_marks NUMERIC(5,2) NOT NULL,
    weightage NUMERIC(5,2) DEFAULT 1.0,
    assessment_date DATE,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_max_marks CHECK (max_marks > 0),
    CONSTRAINT chk_weightage CHECK (weightage >= 0),
    CONSTRAINT chk_assessment_type CHECK (type IN ('AAT', 'CIE', 'LAB', 'ASSIGNMENT', 'PROJECT', 'SEE'))
);

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_type ON assessments(type);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);

COMMENT ON TABLE assessments IS 'Assessment/Examination master';
COMMENT ON COLUMN assessments.type IS 'AAT=Alt Assessment Test, CIE=Continuous Internal Eval, SEE=Semester End Exam';

-- ==================== QUESTIONS ====================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_code VARCHAR(50) NOT NULL,
    question_text TEXT,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
    max_marks NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(assessment_id, question_code),
    CONSTRAINT chk_question_marks CHECK (max_marks > 0)
);

CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_questions_co ON questions(co_id);

COMMENT ON TABLE questions IS 'Individual questions in each assessment';
COMMENT ON COLUMN questions.question_code IS 'e.g., Q1A, Q2B, etc.';

-- ==================== STUDENT MARKS (ROW-BASED) ====================
CREATE TABLE IF NOT EXISTS student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5,2) NOT NULL,
    uploaded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, question_id),
    CONSTRAINT chk_marks_obtained CHECK (marks_obtained >= 0)
);

CREATE INDEX idx_student_marks_student ON student_marks(student_id);
CREATE INDEX idx_student_marks_question ON student_marks(question_id);
CREATE INDEX idx_student_marks_uploaded_by ON student_marks(uploaded_by);

COMMENT ON TABLE student_marks IS 'Student marks - normalized row-based design';

-- ==================== QUESTION-PO MAPPING ====================
CREATE TABLE IF NOT EXISTS question_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,

    UNIQUE(question_id, po_id)
);

CREATE INDEX idx_question_po_question ON question_po_mapping(question_id);
CREATE INDEX idx_question_po_po ON question_po_mapping(po_id);

COMMENT ON TABLE question_po_mapping IS 'Maps questions directly to POs';

-- ==================================================================================
-- ATTAINMENT CACHE TABLES
-- ==================================================================================

-- ==================== CO ATTAINMENT ====================
CREATE TABLE IF NOT EXISTS co_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    attainment_percentage NUMERIC(5,2) NOT NULL,
    total_students INTEGER NOT NULL,
    students_above_threshold INTEGER NOT NULL,
    threshold_percentage NUMERIC(5,2) DEFAULT 60.0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, co_id, assessment_id),
    CONSTRAINT chk_attainment_percentage CHECK (attainment_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_threshold CHECK (threshold_percentage BETWEEN 0 AND 100)
);

CREATE INDEX idx_co_attainment_course ON co_attainment(course_id);
CREATE INDEX idx_co_attainment_co ON co_attainment(co_id);
CREATE INDEX idx_co_attainment_assessment ON co_attainment(assessment_id);

COMMENT ON TABLE co_attainment IS 'CO attainment calculation cache';

-- ==================== PO ATTAINMENT ====================
CREATE TABLE IF NOT EXISTS po_attainment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    attainment_level NUMERIC(5,2) NOT NULL,
    calculation_method VARCHAR(50),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, po_id),
    CONSTRAINT chk_po_attainment_level CHECK (attainment_level BETWEEN 0 AND 3),
    CONSTRAINT chk_calculation_method CHECK (calculation_method IN ('direct', 'indirect', 'combined'))
);

CREATE INDEX idx_po_attainment_course ON po_attainment(course_id);
CREATE INDEX idx_po_attainment_po ON po_attainment(po_id);

COMMENT ON TABLE po_attainment IS 'PO attainment calculation cache';

-- ==================================================================================
-- VIEWS FOR COMMON QUERIES
-- ==================================================================================

-- View: Course with Teacher Details
CREATE OR REPLACE VIEW v_courses_with_teachers AS
SELECT
    c.id,
    c.code,
    c.name,
    c.semester,
    c.year,
    c.credits,
    c.department,
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id;

-- View: Student Enrollment Summary
CREATE OR REPLACE VIEW v_student_enrollments AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.usn,
    c.id as course_id,
    c.code as course_code,
    c.name as course_name,
    e.status,
    e.enrolled_on
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id;

-- View: CO Summary with Course Details
CREATE OR REPLACE VIEW v_cos_with_course AS
SELECT
    co.id,
    co.co_number,
    co.co_text,
    co.bloom_level,
    co.verified,
    c.id as course_id,
    c.code as course_code,
    c.name as course_name,
    t.name as teacher_name
FROM course_outcomes co
JOIN courses c ON co.course_id = c.id
LEFT JOIN teachers t ON co.teacher_id = t.id;

-- ==================================================================================
-- SEED DATA (Program Outcomes)
-- ==================================================================================

-- Insert standard POs (AICTE/NBA standard)
INSERT INTO program_outcomes (po_number, description, category) VALUES
(1, 'Engineering knowledge: Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.', 'technical'),
(2, 'Problem analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.', 'technical'),
(3, 'Design/development of solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations.', 'technical'),
(4, 'Conduct investigations of complex problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.', 'technical'),
(5, 'Modern tool usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations.', 'technical'),
(6, 'The engineer and society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice.', 'professional'),
(7, 'Environment and sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.', 'professional'),
(8, 'Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.', 'professional'),
(9, 'Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.', 'communication'),
(10, 'Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.', 'communication'),
(11, 'Project management and finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to one''s own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.', 'professional'),
(12, 'Life-long learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.', 'professional')
ON CONFLICT (po_number) DO NOTHING;

-- ==================================================================================
-- FUNCTIONS & TRIGGERS
-- ==================================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_outcomes_updated_at BEFORE UPDATE ON course_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================================
-- GRANT PERMISSIONS (adjust as needed)
-- ==================================================================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ==================================================================================
-- END OF SCHEMA
-- ==================================================================================


-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS course_outcomes CASCADE;

-- Create course_outcomes table
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    co_number INT NOT NULL,
    co_text TEXT NOT NULL,
    bloom_level VARCHAR(50) NOT NULL,
    module_number INT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique CO numbers per course
    CONSTRAINT unique_course_co_number UNIQUE (course_id, co_number),

    -- Ensure positive CO numbers
    CONSTRAINT positive_co_number CHECK (co_number > 0),

    -- Ensure valid Bloom levels
    CONSTRAINT valid_bloom_level CHECK (bloom_level IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'))
);

-- Create indexes for performance
CREATE INDEX idx_course_outcomes_course_id ON course_outcomes(course_id);
CREATE INDEX idx_course_outcomes_teacher_id ON course_outcomes(teacher_id);
CREATE INDEX idx_course_outcomes_verified ON course_outcomes(verified);
CREATE INDEX idx_course_outcomes_bloom_level ON course_outcomes(bloom_level);
CREATE INDEX idx_course_outcomes_created_at ON course_outcomes(created_at DESC);

-- Grant permissions (adjust username as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON course_outcomes TO eduuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eduuser;

-- Display success message
\echo '✅ course_outcomes table created successfully!'
\echo ''
\echo 'Table structure:'
\d course_outcomes
\echo ''
\echo 'Indexes:'
\di idx_course_outcomes_*
