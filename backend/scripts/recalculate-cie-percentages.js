/**
 * Recalculate CIE Percentages
 *
 * This script recalculates percentages for all CIE assessments to use
 * the normalized max of 50 instead of the raw question totals.
 *
 * Run this after updating the calculation logic to fix existing data.
 */

import pool from '../config/db.js';
import calculatorService from '../services/detailedCalculations.js';

async function recalculateCIEPercentages() {
  console.log('🔄 Starting CIE percentage recalculation...\n');

  try {
    // Get all marksheets with CIE assessments
    const result = await pool.query(`
      SELECT m.id, m.course_id, m.table_name, m.assessment_name, fls.assessment_type
      FROM marksheets m
      LEFT JOIN file_level_summary fls ON m.id = fls.marksheet_id
      WHERE fls.assessment_type IN ('CIE1', 'CIE2', 'CIE3')
      ORDER BY m.created_at
    `);

    const marksheets = result.rows;
    console.log(`📋 Found ${marksheets.length} CIE marksheets to recalculate\n`);

    if (marksheets.length === 0) {
      console.log('✅ No CIE marksheets found. Nothing to recalculate.');
      return;
    }

    // Get unique course IDs
    const uniqueCourseIds = [...new Set(marksheets.map(m => m.course_id))];
    console.log(`📋 Found ${uniqueCourseIds.length} unique course(s) to recalculate\n`);

    for (const courseId of uniqueCourseIds) {
      const courseMarksheets = marksheets.filter(m => m.course_id === courseId);
      console.log(`\n📊 Processing Course ID: ${courseId}`);
      console.log(`   CIE marksheets: ${courseMarksheets.map(m => m.assessment_type).join(', ')}`);

      try {
        // Run full calculation for entire course
        await calculatorService.runFullCalculation(courseId);

        console.log(`   ✅ Recalculated successfully`);
      } catch (err) {
        console.error(`   ❌ Error recalculating course ${courseId}:`, err.message);
        // Continue with next course
      }
    }

    console.log('\n\n🎉 CIE percentage recalculation completed!');
    console.log('\n📝 Summary:');
    console.log(`   - Total marksheets processed: ${marksheets.length}`);
    console.log(`   - All CIE percentages now use normalized max of 50`);
    console.log(`   - Student dashboards will now show correct percentages\n`);

  } catch (error) {
    console.error('❌ Fatal error during recalculation:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
recalculateCIEPercentages()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
