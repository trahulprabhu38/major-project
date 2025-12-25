import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  Download,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { courseAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';

/**
 * SEEUpload Component
 * Allows teachers to upload SEE (Semester End Examination) marks via CSV/Excel
 */
const SEEUpload = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [uploading, setUploading] = useState(false);
  const [marksData, setMarksData] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getAll();
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    }
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    // Reset state when course changes
    setMarksData([]);
    setValidationResult(null);
    setUploadResult(null);
    setError(null);
  };

  const downloadTemplate = () => {
    // Create template data
    const template = [
      { USN: '1MS22CS001', SEE_Marks: 85 },
      { USN: '1MS22CS002', SEE_Marks: 92 },
      { USN: '1MS22CS003', SEE_Marks: 78 }
    ];

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SEE Marks Template');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // USN column
      { wch: 12 }  // SEE_Marks column
    ];

    // Download
    XLSX.writeFile(wb, 'SEE_Marks_Template.xlsx');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setValidationResult(null);
    setUploadResult(null);

    try {
      const data = await readExcelFile(file);
      setMarksData(data);

      // Validate the data
      await validateMarksData(data);
    } catch (err) {
      setError(err.message || 'Failed to read file');
      console.error(err);
    }

    // Reset file input
    event.target.value = '';
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Transform to expected format
          const transformed = jsonData.map((row, index) => ({
            usn: row.USN || row.usn || '',
            see_marks: parseFloat(row.SEE_Marks || row.see_marks || row.Marks || row.marks || 0),
            rowNumber: index + 2, // Excel row number (accounting for header)
            status: 'pending'
          }));

          resolve(transformed);
        } catch (err) {
          reject(new Error('Invalid file format. Please use the template.'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateMarksData = async (data) => {
    try {
      const response = await fetch('http://localhost:8080/api/see-marks/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          marksData: data.map(d => ({ usn: d.usn, see_marks: d.see_marks }))
        })
      });

      const result = await response.json();

      if (result.success) {
        setValidationResult(result.data);

        // Update marksData with validation status
        const updatedData = data.map(entry => {
          const invalid = result.data.invalid.find(inv => inv.usn === entry.usn);
          if (invalid) {
            return {
              ...entry,
              status: 'invalid',
              errors: invalid.errors
            };
          }
          return {
            ...entry,
            status: 'valid'
          };
        });

        setMarksData(updatedData);
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate marks data');
    }
  };

  const handleUpload = async () => {
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (marksData.length === 0) {
      setError('No data to upload');
      return;
    }

    if (validationResult && validationResult.invalidCount > 0) {
      setError('Please fix invalid entries before uploading');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/api/see-marks/courses/${selectedCourse}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          marksData: marksData.map(d => ({ usn: d.usn, see_marks: d.see_marks }))
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result.data);

        // Auto-trigger grade calculation
        await triggerGradeCalculation();
      } else {
        // Upload failed - show detailed errors
        let errorMessage = result.message || 'Upload failed';

        // If there are specific errors, display them
        if (result.data && result.data.errors && result.data.errors.length > 0) {
          const errorDetails = result.data.errors
            .slice(0, 5) // Show first 5 errors
            .map(err => `${err.usn}: ${err.error}`)
            .join('\n');
          errorMessage += '\n\nError details:\n' + errorDetails;

          if (result.data.errors.length > 5) {
            errorMessage += `\n... and ${result.data.errors.length - 5} more errors`;
          }
        }

        setError(errorMessage);
        setUploadResult(result.data); // Show failed upload result
      }
    } catch (err) {
      setError('Failed to upload marks: ' + err.message);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const triggerGradeCalculation = async () => {
    try {
      console.log('Triggering grade calculation...');
      const response = await fetch(`http://localhost:8080/api/grades/courses/${selectedCourse}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        console.log('Grades calculated successfully:', result.data);

        // Show success message with statistics
        const gradeStats = result.data?.grades;
        if (gradeStats) {
          const successMsg = `Grades calculated: ${gradeStats.calculated} students succeeded`;
          if (gradeStats.failed > 0) {
            setError(`${successMsg}, but ${gradeStats.failed} students failed. This may be because some students don't have CIE marks calculated yet.`);
          }
        }
      } else {
        // Grade calculation failed
        console.error('Grade calculation failed:', result.message);
        setError(`SEE marks uploaded successfully, but grade calculation failed: ${result.message}. You may need to calculate CIE marks first or trigger grade calculation manually.`);
      }
    } catch (err) {
      console.error('Failed to calculate grades:', err);
      setError('SEE marks uploaded successfully, but automatic grade calculation failed. Please trigger grade calculation manually.');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry({ ...entry });
    setEditDialogOpen(true);
  };

  const handleDelete = (usn) => {
    setMarksData(marksData.filter(entry => entry.usn !== usn));
    setValidationResult(null);
  };

  const handleSaveEdit = () => {
    const updatedData = marksData.map(entry =>
      entry.usn === editingEntry.usn ? editingEntry : entry
    );
    setMarksData(updatedData);
    validateMarksData(updatedData);
    setEditDialogOpen(false);
    setEditingEntry(null);
  };

  const handleReset = () => {
    setMarksData([]);
    setValidationResult(null);
    setUploadResult(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'success';
      case 'invalid': return 'error';
      default: return 'default';
    }
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-dark-text-primary">
              Upload SEE Marks
            </h1>
            <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mt-1">
              Upload Semester End Examination marks for students
            </p>
          </div>

          {/* Course Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary">
              Select Course *
            </label>
            <Select
              value={selectedCourse}
              onChange={handleCourseChange}
            >
              <option value="">-- Select a course --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name} (Sem {course.semester})
                </option>
              ))}
            </Select>

            {selectedCourseData && (
              <div className="flex gap-2 flex-wrap">
                <Badge>Course: {selectedCourseData.code}</Badge>
                <Badge>Semester: {selectedCourseData.semester}</Badge>
                <Badge>Year: {selectedCourseData.year}</Badge>
              </div>
            )}
          </div>

          {/* Upload Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>

            <Button
              component="label"
              disabled={!selectedCourse}
            >
              <CloudUpload className="w-4 h-4 mr-2" />
              Upload File
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
              />
            </Button>

            {marksData.length > 0 && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="text-error-600 border-error-600 hover:bg-error-50"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-error-800 dark:text-error-200 whitespace-pre-wrap">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-error-600 dark:text-error-400 hover:underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Validation Summary */}
          {validationResult && (
            <div className={`flex gap-3 p-4 rounded-lg border ${
              validationResult.invalidCount === 0
                ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                : 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'
            }`}>
              <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                validationResult.invalidCount === 0
                  ? 'text-success-600 dark:text-success-500'
                  : 'text-warning-600 dark:text-warning-500'
              }`} />
              <p className={`text-sm ${
                validationResult.invalidCount === 0
                  ? 'text-success-800 dark:text-success-200'
                  : 'text-warning-800 dark:text-warning-200'
              }`}>
                <strong>Validation Complete:</strong> {validationResult.validCount} valid entries,{' '}
                {validationResult.invalidCount} invalid entries
              </p>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`flex gap-3 p-4 rounded-lg border ${
              uploadResult.failed === 0
                ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                : uploadResult.uploaded + uploadResult.updated > 0
                ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'
                : 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
            }`}>
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-success-600 dark:text-success-500" />
              <div className="flex-1">
                <p className="text-sm text-success-800 dark:text-success-200">
                  <strong>Upload Complete:</strong> {uploadResult.uploaded} uploaded,{' '}
                  {uploadResult.updated} updated, {uploadResult.failed} failed
                </p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-error-800 dark:text-error-200">
                      Error Details:
                    </p>
                    {uploadResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-xs text-error-700 dark:text-error-300">
                        • {err.usn}: {err.error}
                      </p>
                    ))}
                    {uploadResult.errors.length > 10 && (
                      <p className="text-xs text-error-700 dark:text-error-300">
                        ... and {uploadResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {uploading && (
            <div>
              <Progress value={50} className="mb-2" />
              <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                Uploading marks and calculating grades...
              </p>
            </div>
          )}

          {/* Data Preview Table */}
          {marksData.length > 0 && (
            <div className="space-y-4">
              <div className="border border-neutral-200 dark:border-dark-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-dark-bg-secondary">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">Row</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">USN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">SEE Marks</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">Errors</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-dark-text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-dark-border">
                      {marksData.map((entry, index) => (
                        <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-dark-bg-tertiary">
                          <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{entry.rowNumber}</td>
                          <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{entry.usn}</td>
                          <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text-primary">{entry.see_marks}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusColor(entry.status)}>
                              {entry.status === 'valid' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {entry.status === 'invalid' && <XCircle className="w-3 h-3 mr-1" />}
                              {entry.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {entry.errors && entry.errors.length > 0 && (
                              <p className="text-xs text-error-600 dark:text-error-500">
                                {entry.errors.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-dark-bg-tertiary rounded mr-1"
                            >
                              <Edit2 className="w-4 h-4 text-neutral-600 dark:text-dark-text-secondary" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.usn)}
                              className="p-1 hover:bg-error-50 dark:hover:bg-error-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-error-600 dark:text-error-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleUpload}
                  disabled={uploading || (validationResult && validationResult.invalidCount > 0)}
                >
                  <CloudUpload className="w-5 h-5 mr-2" />
                  Confirm Upload
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-neutral-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text-primary">
                Edit Entry
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                  USN
                </label>
                <Input
                  value={editingEntry?.usn || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, usn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                  SEE Marks
                </label>
                <Input
                  type="number"
                  value={editingEntry?.see_marks || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, see_marks: parseFloat(e.target.value) })}
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 dark:border-dark-border flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEEUpload;
