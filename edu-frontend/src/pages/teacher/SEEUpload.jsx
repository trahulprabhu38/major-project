import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Edit,
  Delete,
  Calculate
} from '@mui/icons-material';
import { courseAPI } from '../../services/api';
import * as XLSX from 'xlsx';

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
        setError(result.message || 'Upload failed');
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
      }
    } catch (err) {
      console.error('Failed to calculate grades:', err);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Upload SEE Marks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload Semester End Examination marks for students
          </Typography>
        </Box>

        {/* Course Selection */}
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourse}
              onChange={handleCourseChange}
              label="Select Course"
            >
              <MenuItem value="">
                <em>-- Select a course --</em>
              </MenuItem>
              {courses.map(course => (
                <MenuItem key={course.id} value={course.id}>
                  {course.code} - {course.name} (Sem {course.semester})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCourseData && (
            <Box sx={{ mt: 2 }}>
              <Chip label={`Course: ${selectedCourseData.code}`} sx={{ mr: 1 }} />
              <Chip label={`Semester: ${selectedCourseData.semester}`} sx={{ mr: 1 }} />
              <Chip label={`Year: ${selectedCourseData.year}`} />
            </Box>
          )}
        </Box>

        {/* Upload Actions */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>

          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUpload />}
            disabled={!selectedCourse}
          >
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
              variant="outlined"
              color="error"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Validation Summary */}
        {validationResult && (
          <Alert
            severity={validationResult.invalidCount === 0 ? 'success' : 'warning'}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2">
              <strong>Validation Complete:</strong> {validationResult.validCount} valid entries,{' '}
              {validationResult.invalidCount} invalid entries
            </Typography>
          </Alert>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Upload Complete:</strong> {uploadResult.uploaded} uploaded,{' '}
              {uploadResult.updated} updated, {uploadResult.failed} failed
            </Typography>
          </Alert>
        )}

        {/* Progress Indicator */}
        {uploading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Uploading marks and calculating grades...
            </Typography>
          </Box>
        )}

        {/* Data Preview Table */}
        {marksData.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Row</strong></TableCell>
                    <TableCell><strong>USN</strong></TableCell>
                    <TableCell><strong>SEE Marks</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Errors</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {marksData.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.rowNumber}</TableCell>
                      <TableCell>{entry.usn}</TableCell>
                      <TableCell>{entry.see_marks}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={entry.status}
                          color={getStatusColor(entry.status)}
                          icon={entry.status === 'valid' ? <CheckCircle /> : entry.status === 'invalid' ? <Error /> : null}
                        />
                      </TableCell>
                      <TableCell>
                        {entry.errors && entry.errors.length > 0 && (
                          <Typography variant="caption" color="error">
                            {entry.errors.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleEdit(entry)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(entry.usn)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Upload Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CloudUpload />}
                onClick={handleUpload}
                disabled={uploading || (validationResult && validationResult.invalidCount > 0)}
              >
                Confirm Upload
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
            <TextField
              label="USN"
              value={editingEntry?.usn || ''}
              onChange={(e) => setEditingEntry({ ...editingEntry, usn: e.target.value })}
              fullWidth
            />
            <TextField
              label="SEE Marks"
              type="number"
              value={editingEntry?.see_marks || ''}
              onChange={(e) => setEditingEntry({ ...editingEntry, see_marks: parseFloat(e.target.value) })}
              inputProps={{ min: 0, max: 100, step: 0.01 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SEEUpload;
