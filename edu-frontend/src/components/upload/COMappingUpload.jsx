import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * CO Mapping Upload Component
 * Allows teachers to upload CSV files mapping questions to COs for each assessment
 */
const COMappingUpload = ({ courseId, marksheet }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);
  const [existingMappings, setExistingMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load existing mappings on mount and when marksheet changes
  React.useEffect(() => {
    if (marksheet?.id) {
    loadExistingMappings();
    }
  }, [marksheet?.id]);

  const loadExistingMappings = async () => {
    if (!marksheet?.id) return;
    
    try {
      setLoadingMappings(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/co-mapping/marksheet/${marksheet.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const mappings = response.data.data || [];
      setExistingMappings(mappings);
      console.log(`✅ Loaded ${mappings.length} existing CO mappings for ${marksheet.assessment_name}`);
    } catch (err) {
      console.log('No existing mappings found:', err.response?.data?.message || err.message);
      setExistingMappings([]);
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleDeleteMappings = async () => {
    if (!window.confirm(`Are you sure you want to delete all CO mappings for ${marksheet.assessment_name}?`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/co-mapping/marksheet/${marksheet.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setExistingMappings([]);
      setUploadStatus({
        success: true,
        message: 'CO mappings deleted successfully'
      });
      
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error('❌ Error deleting CO mappings:', err);
      setError(err.response?.data?.details || err.message || 'Failed to delete CO mappings');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadStatus(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);
      formData.append('marksheetId', marksheet.id);

      console.log(`📤 Uploading CO mapping for ${marksheet.assessment_name}...`);

      const response = await axios.post(
        `${API_URL}/co-mapping/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('✅ CO mapping uploaded:', response.data);

      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${response.data.data.mappingsCount} CO mappings`,
        count: response.data.data.mappingsCount
      });

      // Reload mappings to show updated list
      await loadExistingMappings();

      // Reset file input
      event.target.value = '';
    } catch (err) {
      console.error('❌ CO mapping upload error:', err);
      setError(err.response?.data?.details || err.message || 'Failed to upload CO mapping');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/co-mapping/template`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'co-mapping-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Failed to download template');
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight="bold">
            CO Mapping for {marksheet.assessment_name}
          </Typography>
          <Chip
            size="small"
            icon={<InfoIcon />}
            label="Upload CSV to map questions to COs"
            color="info"
            variant="outlined"
          />
        </Stack>

        {/* Upload Progress */}
        {uploading && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" mt={1}>
              Uploading CO mapping...
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {uploadStatus?.success && (
          <Alert
            severity="success"
            icon={<CheckIcon />}
            onClose={() => setUploadStatus(null)}
            sx={{ mb: 2 }}
          >
            {uploadStatus.message}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={uploading || deleting}
          >
            {existingMappings.length > 0 ? 'Re-upload CO Mapping' : 'Upload CO Mapping'}
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileSelect}
            />
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            disabled={uploading || deleting}
          >
            Download Template
          </Button>

          {existingMappings.length > 0 && (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteMappings}
                disabled={uploading || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Mappings'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={loadExistingMappings}
                disabled={uploading || deleting || loadingMappings}
              >
                Refresh
              </Button>
            </>
          )}
        </Stack>

        {/* Loading State */}
        {loadingMappings && (
          <Box mt={2}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" mt={1}>
              Loading existing mappings...
            </Typography>
          </Box>
        )}

        {/* Existing Mappings Display */}
        {!loadingMappings && existingMappings.length > 0 && (
          <Box mt={2} p={2} bgcolor="success.50" borderRadius={1} border="1px solid" borderColor="success.200">
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight="bold" color="success.dark">
                ✅ CO Mapping Uploaded ({existingMappings.length} questions)
              </Typography>
              <Chip
                size="small"
                label="Active"
                color="success"
                variant="filled"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              <strong>Mapped Questions:</strong> {existingMappings.slice(0, 5).map(m => 
                `${m.question_column}→CO${m.co_number}${m.max_marks ? ` (${m.max_marks} marks)` : ''}`
              ).join(', ')}
              {existingMappings.length > 5 && ` +${existingMappings.length - 5} more`}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
              Last updated: {new Date().toLocaleString()}
            </Typography>
          </Box>
        )}

        {/* No Mappings State */}
        {!loadingMappings && existingMappings.length === 0 && (
          <Box mt={2} p={2} bgcolor="warning.50" borderRadius={1} border="1px solid" borderColor="warning.200">
            <Typography variant="caption" color="text.secondary" component="div">
              <strong>⚠️ No CO mapping uploaded yet</strong>
              <br />
              Please upload a CO mapping CSV file to map questions to Course Outcomes.
            </Typography>
          </Box>
        )}

        {/* Instructions */}
        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary" component="div">
            <strong>CSV Format (New):</strong>
            <br />
            • Column 1: Column name (e.g., q1a, q1b, q2a) - lowercase
            <br />
            • Column 2: Max Marks (e.g., 10, 0) - use 0 to ignore a question
            <br />
            • Column 3: CO (e.g., co1, co2, co3)
            <br />
            • Example: q1a,10,co1
            <br />
            • Questions with max_marks = 0 will be ignored
            <br />• Download the template above to see the format
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default COMappingUpload;
