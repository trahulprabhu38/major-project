import detailedCalculationsService from './services/detailedCalculations.js';

const courseId = '065e9328-351a-4832-95ee-a6a5c19fc275';

console.log('Testing Final CIE Calculation...');

try {
  const result = await detailedCalculationsService.calculateFinalCIEComposition(courseId);
  console.log(`✅ Success! Calculated for ${result.length} students`);
  console.log('Sample result:', JSON.stringify(result[0], null, 2));
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

process.exit(0);
