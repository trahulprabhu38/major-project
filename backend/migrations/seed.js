import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // 1. Create Program Outcomes (8 POs)
    console.log('Creating Program Outcomes...');
    const poDescriptions = [
      'Engineering knowledge: Apply knowledge of mathematics, science, and engineering fundamentals',
      'Problem analysis: Identify, formulate, and analyze complex engineering problems',
      'Design/development of solutions: Design solutions for complex problems',
      'Investigation: Conduct investigations of complex problems using research-based knowledge',
      'Modern tool usage: Create, select, and apply appropriate techniques and modern tools',
      'Engineer and society: Apply reasoning informed by contextual knowledge',
      'Environment and sustainability: Understand the impact of professional engineering solutions',
      'Ethics: Apply ethical principles and commit to professional ethics'
    ];

    const poIds = [];
    for (let i = 0; i < poDescriptions.length; i++) {
      const result = await query(
        'INSERT INTO program_outcomes (po_number, description) VALUES ($1, $2) RETURNING id',
        [i + 1, poDescriptions[i]]
      );
      poIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${poIds.length} Program Outcomes\n`);

    // 2. Create Teachers
    console.log('Creating Teachers...');
    const hashedPassword = await bcryptjs.hash('password123', 10);
    const teachers = [
      { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@example.edu', dept: 'Computer Science' },
      { name: 'Prof. Anita Sharma', email: 'anita.sharma@example.edu', dept: 'Computer Science' },
      { name: 'Dr. Vikram Singh', email: 'vikram.singh@example.edu', dept: 'Information Science' }
    ];

    const teacherIds = [];
    for (const teacher of teachers) {
      const result = await query(
        'INSERT INTO users (email, password_hash, role, name, department) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [teacher.email, hashedPassword, 'teacher', teacher.name, teacher.dept]
      );
      teacherIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${teacherIds.length} Teachers\n`);

    // 3. Create a Course
    console.log('Creating Course...');
    const courseResult = await query(
      `INSERT INTO courses (code, name, description, semester, year, credits, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'CS301',
        'Data Structures and Algorithms',
        'Introduction to fundamental data structures and algorithms',
        5,
        2024,
        4,
        teacherIds[0]
      ]
    );
    const courseId = courseResult.rows[0].id;
    console.log(`✅ Created course: CS301\n`);

    // 4. Create Course Outcomes (5 COs)
    console.log('Creating Course Outcomes...');
    const cos = [
      { number: 1, desc: 'Understand basic data structures like arrays, linked lists, stacks, and queues', bloom: 'Understand', module: 1 },
      { number: 2, desc: 'Apply tree and graph data structures to solve problems', bloom: 'Apply', module: 2 },
      { number: 3, desc: 'Analyze time and space complexity of algorithms', bloom: 'Analyze', module: 3 },
      { number: 4, desc: 'Design efficient algorithms using divide and conquer, greedy, and dynamic programming', bloom: 'Apply', module: 4 },
      { number: 5, desc: 'Evaluate and select appropriate data structures for specific applications', bloom: 'Evaluate', module: 5 }
    ];

    const coIds = [];
    for (const co of cos) {
      const result = await query(
        `INSERT INTO course_outcomes (course_id, co_number, description, bloom_level, module_number)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [courseId, co.number, co.desc, co.bloom, co.module]
      );
      coIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${coIds.length} Course Outcomes\n`);

    // 5. Create CO-PO Mappings
    console.log('Creating CO-PO Mappings...');
    const coPOMappings = [
      { coIdx: 0, poIdxs: [0, 1], level: 3 }, // CO1 -> PO1(High), PO2(High)
      { coIdx: 1, poIdxs: [0, 1, 4], level: 3 }, // CO2 -> PO1, PO2, PO5
      { coIdx: 2, poIdxs: [1, 2], level: 3 }, // CO3 -> PO2, PO3
      { coIdx: 3, poIdxs: [2, 4], level: 3 }, // CO4 -> PO3, PO5
      { coIdx: 4, poIdxs: [1, 2, 4], level: 2 } // CO5 -> PO2, PO3, PO5
    ];

    for (const mapping of coPOMappings) {
      for (const poIdx of mapping.poIdxs) {
        await query(
          'INSERT INTO co_po_mapping (co_id, po_id, correlation_level) VALUES ($1, $2, $3)',
          [coIds[mapping.coIdx], poIds[poIdx], mapping.level]
        );
      }
    }
    console.log(`✅ Created CO-PO Mappings\n`);

    // 6. Create Students (50 students)
    console.log('Creating Students...');
    const studentIds = [];
    for (let i = 1; i <= 50; i++) {
      const usn = `1MS22CS${String(i).padStart(3, '0')}`;
      const email = `student${i}@example.edu`;
      const name = `Student ${i}`;

      const result = await query(
        'INSERT INTO users (email, password_hash, role, name, usn, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [email, hashedPassword, 'student', name, usn, 'Computer Science']
      );
      studentIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${studentIds.length} Students\n`);

    // 7. Enroll all students in the course
    console.log('Enrolling students in course...');
    for (const studentId of studentIds) {
      await query(
        'INSERT INTO students_courses (student_id, course_id) VALUES ($1, $2)',
        [studentId, courseId]
      );
    }
    console.log(`✅ Enrolled ${studentIds.length} students\n`);

    // 8. Create Assessments
    console.log('Creating Assessments...');
    const assessments = [
      { type: 'AAT', name: 'AAT 1', date: '2024-09-15', maxMarks: 50, weightage: 0.15 },
      { type: 'CIE', name: 'CIE 1', date: '2024-10-20', maxMarks: 100, weightage: 0.25 },
      { type: 'LAB', name: 'Lab Assessment 1', date: '2024-11-10', maxMarks: 50, weightage: 0.10 }
    ];

    const assessmentIds = [];
    for (const assessment of assessments) {
      const result = await query(
        `INSERT INTO assessments (course_id, type, name, assessment_date, max_marks, weightage)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [courseId, assessment.type, assessment.name, assessment.date, assessment.maxMarks, assessment.weightage]
      );
      assessmentIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${assessmentIds.length} Assessments\n`);

    // 9. Create Questions for AAT 1 (10 questions)
    console.log('Creating Questions for AAT 1...');
    const questions = [
      { num: 1, text: 'Explain arrays and their applications', marks: 5, coIdx: 0 },
      { num: 2, text: 'Implement a linked list', marks: 5, coIdx: 0 },
      { num: 3, text: 'Describe stack operations', marks: 5, coIdx: 0 },
      { num: 4, text: 'Implement queue using arrays', marks: 5, coIdx: 0 },
      { num: 5, text: 'Explain binary trees', marks: 5, coIdx: 1 },
      { num: 6, text: 'Implement graph traversal (BFS)', marks: 5, coIdx: 1 },
      { num: 7, text: 'Calculate time complexity of bubble sort', marks: 5, coIdx: 2 },
      { num: 8, text: 'Analyze space complexity of merge sort', marks: 5, coIdx: 2 },
      { num: 9, text: 'Design a solution using greedy algorithm', marks: 5, coIdx: 3 },
      { num: 10, text: 'Compare different sorting algorithms', marks: 5, coIdx: 4 }
    ];

    const questionIds = [];
    for (const q of questions) {
      const result = await query(
        `INSERT INTO questions (assessment_id, question_number, question_text, max_marks, co_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [assessmentIds[0], q.num, q.text, q.marks, coIds[q.coIdx]]
      );
      questionIds.push(result.rows[0].id);

      // Map questions to POs based on their COs
      const coPoMapping = coPOMappings[q.coIdx];
      for (const poIdx of coPoMapping.poIdxs) {
        await query(
          'INSERT INTO question_po_mapping (question_id, po_id) VALUES ($1, $2)',
          [result.rows[0].id, poIds[poIdx]]
        );
      }
    }
    console.log(`✅ Created ${questionIds.length} Questions\n`);

    // 10. Generate random student scores
    console.log('Generating student scores...');
    let scoreCount = 0;
    for (const studentId of studentIds) {
      for (const questionId of questionIds) {
        // Random marks between 0 and 5 (max marks for each question)
        const marksObtained = Math.random() > 0.1 ? Math.floor(Math.random() * 6) : 0;

        await query(
          'INSERT INTO student_scores (student_id, question_id, marks_obtained) VALUES ($1, $2, $3)',
          [studentId, questionId, marksObtained]
        );
        scoreCount++;
      }
    }
    console.log(`✅ Generated ${scoreCount} student scores\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Program Outcomes: ${poIds.length}`);
    console.log(`   - Teachers: ${teacherIds.length}`);
    console.log(`   - Courses: 1`);
    console.log(`   - Course Outcomes: ${coIds.length}`);
    console.log(`   - Students: ${studentIds.length}`);
    console.log(`   - Assessments: ${assessmentIds.length}`);
    console.log(`   - Questions: ${questionIds.length}`);
    console.log(`   - Student Scores: ${scoreCount}`);
    console.log('\n✅ You can now login with:');
    console.log('   Teacher: rajesh.kumar@example.edu / password123');
    console.log('   Student: student1@example.edu / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
