import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Grid,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle,
  Warning,
  Calculate
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * SemesterSubjectManager Component
 * Manages dynamic subject addition/editing/removal with real-time CGPA calculation
 * VTU Regulation: Exactly 20 credits per semester
 */
const SemesterSubjectManager = ({ studentId, semester, academicYear, onUpdate }) => {
  const [subjects, setSubjects] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    credits: 3,
    grade_point: '',
    letter_grade: '',
    academic_year: academicYear || new Date().getFullYear()
  });

  // VTU Grade mapping
  const gradeOptions = [
    { letter: 'S', points: 10, label: 'S (10)' },
    { letter: 'A', points: 9, label: 'A (9)' },
    { letter: 'B', points: 8, label: 'B (8)' },
    { letter: 'C', points: 7, label: 'C (7)' },
    { letter: 'D', points: 6, label: 'D (6)' },
    { letter: 'E', points: 5, label: 'E (5)' },
    { letter: 'P', points: 4, label: 'P (4) - Pass' },
    { letter: 'F', points: 0, label: 'F (0) - Fail' }
  ];

  useEffect(() => {
    loadSubjects();
  }, [studentId, semester]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/semester-subjects/students/${studentId}/semester/${semester}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSubjects(response.data.data.subjects || []);
        setMetadata(response.data.data.metadata || null);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subject = null) => {
    if (subject) {
      // Edit mode
      setEditingSubject(subject);
      setFormData({
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        credits: subject.credits,
        grade_point: subject.grade_point || '',
        letter_grade: subject.letter_grade || '',
        academic_year: subject.academic_year
      });
    } else {
      // Add mode
      setEditingSubject(null);
      setFormData({
        subject_name: '',
        subject_code: '',
        credits: 3,
        grade_point: '',
        letter_grade: '',
        academic_year: academicYear || new Date().getFullYear()
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSubject(null);
    setFormData({
      subject_name: '',
      subject_code: '',
      credits: 3,
      grade_point: '',
      letter_grade: '',
      academic_year: academicYear || new Date().getFullYear()
    });
  };

  const handleGradeChange = (event, value) => {
    if (value) {
      setFormData({
        ...formData,
        letter_grade: value.letter,
        grade_point: value.points
      });
    } else {
      setFormData({
        ...formData,
        letter_grade: '',
        grade_point: ''
      });
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');

      // Validate
      if (!formData.subject_name || !formData.subject_code || !formData.credits) {
        toast.error('Subject name, code, and credits are required');
        return;
      }

      if (editingSubject) {
        // Update existing subject
        const response = await axios.put(
          `${API_URL}/semester-subjects/${editingSubject.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.success('Subject updated successfully');
          await loadSubjects();
          if (onUpdate) onUpdate();
          handleCloseDialog();
        }
      } else {
        // Add new subject
        const response = await axios.post(
          `${API_URL}/semester-subjects/students/${studentId}/semester/${semester}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.success('Subject added successfully');
          await loadSubjects();
          if (onUpdate) onUpdate();
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save subject';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/semester-subjects/${subjectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Subject deleted successfully');
        await loadSubjects();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const getStatusColor = (status) => {
    return status === 'FINAL' ? 'success' : 'warning';
  };

  const getGradeColor = (gradePoint) => {
    if (!gradePoint) return 'default';
    if (gradePoint >= 9) return 'success';
    if (gradePoint >= 7) return 'primary';
    if (gradePoint >= 4) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Card sx={{ mb: 3, borderLeft: '4px solid #2196f3' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Semester {semester} - Subject Management
              </Typography>
              <Typography variant="caption" color="text.secondary">
                VTU Regulation: Exactly 20 credits required per semester
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!metadata?.canAddMore}
            >
              Add Subject
            </Button>
          </Box>

          {/* Credit Status Bar */}
          {metadata && (
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Credits
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {metadata.totalCredits}/20
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, bgcolor: metadata.remainingCredits === 0 ? '#e8f5e9' : '#fff3e0' }}>
                    <Typography variant="body2" color="text.secondary">
                      Remaining Credits
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={metadata.remainingCredits === 0 ? 'success.main' : 'warning.main'}>
                      {metadata.remainingCredits}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                    <Typography variant="body2" color="text.secondary">
                      Provisional SGPA
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {metadata.provisionalSGPA || 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={metadata.status}
                      color={getStatusColor(metadata.status)}
                      icon={metadata.isFinal ? <CheckCircle /> : <Warning />}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Paper>
                </Grid>
              </Grid>

              {/* Progress Bar */}
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Credit Completion
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {((metadata.totalCredits / 20) * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(metadata.totalCredits / 20) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                  color={metadata.isFinal ? 'success' : 'primary'}
                />
              </Box>

              {!metadata.isFinal && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Provisional Status</AlertTitle>
                  SGPA will be marked as <strong>FINAL</strong> once you add exactly 20 credits worth of subjects.
                  Currently: {metadata.totalCredits}/20 credits
                </Alert>
              )}

              {metadata.isFinal && (
                <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                  <AlertTitle>Final SGPA</AlertTitle>
                  Semester complete with 20 credits. SGPA: <strong>{metadata.provisionalSGPA}/10</strong>
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Subjects Table */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>Loading subjects...</Typography>
            </Box>
          ) : subjects.length === 0 ? (
            <Alert severity="info">
              No subjects added yet. Click "Add Subject" to start.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Subject Code</strong></TableCell>
                    <TableCell><strong>Subject Name</strong></TableCell>
                    <TableCell align="center"><strong>Credits</strong></TableCell>
                    <TableCell align="center"><strong>Grade</strong></TableCell>
                    <TableCell align="center"><strong>Grade Points</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id} hover>
                      <TableCell>
                        <Chip label={subject.subject_code} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{subject.subject_name}</TableCell>
                      <TableCell align="center">
                        <Chip label={subject.credits} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        {subject.letter_grade ? (
                          <Chip
                            label={subject.letter_grade}
                            color={getGradeColor(subject.grade_point)}
                            size="small"
                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {subject.grade_point !== null ? (
                          <Typography fontWeight="bold">
                            {parseFloat(subject.grade_point).toFixed(2)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {subject.is_passed === null ? (
                          <Chip label="Not Graded" size="small" />
                        ) : subject.is_passed ? (
                          <Chip label="Passed" color="success" size="small" />
                        ) : (
                          <Chip label="Failed" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Subject">
                          <IconButton size="small" onClick={() => handleOpenDialog(subject)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Subject">
                          <IconButton size="small" color="error" onClick={() => handleDelete(subject.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                    <TableCell colSpan={2}><strong>Total</strong></TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${metadata?.totalCredits || 0} / 20`}
                        color={metadata?.isFinal ? 'success' : 'warning'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell colSpan={4}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Calculate color="primary" />
                        <Typography fontWeight="bold">
                          SGPA: {metadata?.provisionalSGPA || 'N/A'}/10
                        </Typography>
                        <Chip
                          label={metadata?.status || 'N/A'}
                          color={getStatusColor(metadata?.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSubject ? 'Edit Subject' : 'Add New Subject'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject Name"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Subject Code"
                  value={formData.subject_code}
                  onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Credits</InputLabel>
                  <Select
                    value={formData.credits}
                    label="Credits"
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  >
                    <MenuItem value={1}>1 Credit</MenuItem>
                    <MenuItem value={3}>3 Credits</MenuItem>
                    <MenuItem value={4}>4 Credits</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  options={gradeOptions}
                  getOptionLabel={(option) => option.label}
                  value={gradeOptions.find(g => g.letter === formData.letter_grade) || null}
                  onChange={handleGradeChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Grade (Optional)"
                      helperText="Leave blank if grade not assigned yet"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  type="number"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>

            {metadata && !editingSubject && (
              <Alert severity={metadata.remainingCredits >= formData.credits ? 'info' : 'error'} sx={{ mt: 2 }}>
                Adding this subject will use <strong>{formData.credits} credits</strong>.
                Remaining after: <strong>{metadata.remainingCredits - formData.credits} credits</strong>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
            {editingSubject ? 'Update' : 'Add'} Subject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SemesterSubjectManager;
