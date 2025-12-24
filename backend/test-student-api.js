import jwt from 'jsonwebtoken';

async function testAPI() {
  try {
    const courseId = '533c7226-3170-4ce7-95d4-051be9840870';
    const studentId = '492e82f3-a88e-4939-8712-5c12c01fbae8';

    // Generate a valid JWT token
    const token = jwt.sign(
      { userId: '6e7d71f5-b764-4a09-9247-7ff0ccd6abcc', role: 'teacher' },
      'supersecretkey',
      { expiresIn: '1h' }
    );

    console.log('\n=== TESTING STUDENT PERFORMANCE API ===\n');

    const response = await fetch(
      `http://localhost:8080/api/detailed-calculations/course/${courseId}/student/${studentId}/performance`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      }
    );

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Success:', data.success);

    if (data.data) {
      console.log('\n✅ RESPONSE DATA:');
      console.log('Student:', data.data.student.name, `(${data.data.student.usn})`);
      console.log('CO Performance entries:', data.data.coPerformance ? data.data.coPerformance.length : 0);

      if (data.data.overallStats) {
        console.log('\nOverall Performance:', data.data.overallStats.avg_performance.toFixed(2) + '%');
        console.log('COs Above 60%:', data.data.overallStats.cos_above_60, '/', data.data.overallStats.total_cos);
      }

      if (data.data.coPerformance && data.data.coPerformance.length > 0) {
        console.log('\n=== CO PERFORMANCE DETAILS ===');
        data.data.coPerformance.slice(0, 3).forEach(co => {
          console.log(`\nCO${co.co_number}:`);
          console.log(`  Total: ${co.total_marks_obtained}/${co.total_max_marks} = ${co.percentage.toFixed(1)}%`);
          console.log(`  Assessments: ${co.assessments.length}`);
          if (co.assessments.length > 0) {
            co.assessments.forEach(a => {
              console.log(`    - ${a.assessment_name}: ${a.obtained}/${a.max} = ${a.percentage.toFixed(1)}%`);
            });
          }
        });

        console.log('\n✅✅✅ API IS NOW WORKING! CO Performance data is being returned! ✅✅✅');
      } else {
        console.log('\n❌ STILL NO CO PERFORMANCE DATA');
      }
    } else {
      console.log('\n❌ NO DATA IN RESPONSE');
      console.log('Error:', data.error);
    }

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Error:', err.response.data);
    }
  }
}

testAPI();
