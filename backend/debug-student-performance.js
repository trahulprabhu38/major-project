import pool from './config/db.js';

async function debug() {
  try {
    const courseId = '533c7226-3170-4ce7-95d4-051be9840870';
    const studentUSN = '1DS23AI017';

    console.log('\n=== DEBUGGING WHY CO PERFORMANCE IS EMPTY ===\n');

    // Step 1: Get COs
    const cosResult = await pool.query(
      'SELECT id, co_number FROM course_outcomes WHERE course_id = $1 ORDER BY co_number',
      [courseId]
    );
    console.log('✅ Total COs:', cosResult.rows.length);

    // Step 2: Get marksheets
    const marksheetsResult = await pool.query(`
      SELECT m.id, m.assessment_name, m.table_name
      FROM marksheets m
      WHERE m.course_id = $1 AND m.processing_status = 'completed'
      ORDER BY m.created_at
    `, [courseId]);
    console.log('✅ Total Marksheets:', marksheetsResult.rows.length);
    marksheetsResult.rows.forEach(m => console.log('   -', m.assessment_name));

    // Step 3: For CO1, check if mappings exist
    const co1 = cosResult.rows[0];
    console.log('\n=== Checking CO1 ===');

    for (const marksheet of marksheetsResult.rows) {
      const mappingsResult = await pool.query(`
        SELECT question_column, co_number, max_marks
        FROM question_co_mappings
        WHERE marksheet_id = $1 AND co_number = $2
      `, [marksheet.id, co1.co_number]);

      console.log(`\n${marksheet.assessment_name}:`);
      console.log('  Mappings for CO1:', mappingsResult.rows.length);

      if (mappingsResult.rows.length > 0) {
        console.log('  Questions:', mappingsResult.rows.map(m => m.question_column).join(', '));

        // Try to get student marks
        const questionColumns = mappingsResult.rows.map(m => `"${m.question_column.toUpperCase()}"`).join(', ');
        const marksQuery = `SELECT ${questionColumns} FROM "${marksheet.table_name}" WHERE UPPER("USN") = UPPER($1) LIMIT 1`;

        try {
          const studentMarksResult = await pool.query(marksQuery, [studentUSN]);
          console.log('  Student marks found:', studentMarksResult.rows.length > 0 ? 'YES' : 'NO');

          if (studentMarksResult.rows.length > 0) {
            const marksRow = studentMarksResult.rows[0];
            console.log('  Marks data:', marksRow);

            // Calculate total
            let total = 0;
            let maxTotal = 0;
            mappingsResult.rows.forEach(mapping => {
              const colName = mapping.question_column.toUpperCase();
              const marks = parseFloat(marksRow[colName] || 0);
              const maxMarks = parseFloat(mapping.max_marks || 0);
              if (!isNaN(marks) && marks !== 0) {
                total += marks;
                maxTotal += maxMarks;
              }
            });
            console.log('  Total:', total, '/', maxTotal, '=', (total/maxTotal*100).toFixed(1) + '%');
          }
        } catch (err) {
          console.log('  ❌ Error fetching marks:', err.message);
        }
      } else {
        console.log('  ❌ NO MAPPINGS FOUND FOR CO1!');
      }
    }

    await pool.end();
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

debug();
