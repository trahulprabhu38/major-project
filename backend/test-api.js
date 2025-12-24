import axios from 'axios';
import jwt from 'jsonwebtoken';

async function test() {
  try {
    const courseId = '533c7226-3170-4ce7-95d4-051be9840870';
    const studentId = '492e82f3-a88e-4939-8712-5c12c01fbae8';

    const token = jwt.sign(
      { userId: '6e7d71f5-b764-4a09-9247-7ff0ccd6abcc', role: 'teacher' },
      'supersecretkey',
      { expiresIn: '1h' }
    );

    console.log('\n=== TESTING STUDENT PERFORMANCE API ===');

    const response = await axios.get(
      `http://localhost:8080/api/detailed-calculations/course/${courseId}/student/${studentId}/performance`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      }
    );

    console.log('\nStatus:', response.status);
    console.log('Success:', response.data.success);
    console.log('Has data:', response.data.data ? 'YES' : 'NO');

    if (response.data.data) {
      const data = response.data.data;
      console.log('\n=== DATA STRUCTURE ===');
      console.log('Student:', data.student.name, '(' + data.student.usn + ')');
      console.log('CO Performance entries:', data.coPerformance ? data.coPerformance.length : 0);

      if (data.overallStats) {
        console.log('Avg Performance:', data.overallStats.avg_performance.toFixed(2) + '%');
        console.log('COs Above 60%:', data.overallStats.cos_above_60 + '/' + data.overallStats.total_cos);
      }

      if (data.coPerformance && data.coPerformance.length > 0) {
        console.log('\n=== CO PERFORMANCE DETAILS ===');
        data.coPerformance.forEach(co => {
          console.log(`CO${co.co_number}: ${co.total_marks_obtained.toFixed(1)}/${co.total_max_marks.toFixed(0)} = ${co.percentage.toFixed(1)}%`);
          console.log(`  Assessments: ${co.assessments.length}`);
        });
      } else {
        console.log('\n❌ NO CO PERFORMANCE DATA!');
      }

      console.log('\n✅ API IS RETURNING DATA');
    } else {
      console.log('\n❌ NO DATA IN RESPONSE');
    }

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Error:', err.response.data);
    }
  }
}

test();
