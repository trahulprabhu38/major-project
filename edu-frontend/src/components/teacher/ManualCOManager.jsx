import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from '@mui/material';
import { Add, Delete, AutoAwesome, Edit, Save } from '@mui/icons-material';
import toast from 'react-hot-toast';
import axios from 'axios';

const BLOOM_LEVELS = ['Apply', 'Analyze', 'Evaluate', 'Create', 'Understand', 'Remember'];
const PO_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const ManualCOManager = ({ open, onClose, courseId, onSuccess }) => {
  const [cos, setCos] = useState([
    { co_number: 1, description: '', bloom_level: 'Apply', po_mappings: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [existingCOs, setExistingCOs] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (open && courseId) {
      loadExistingCOs();
    }
  }, [open, courseId]);

  const loadExistingCOs = async () => {
    try {
      setLoadingExisting(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8080/api/course-outcomes/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.cos.length > 0) {
        // Load existing COs
        const loadedCOs = response.data.cos.map((co) => ({
          co_number: co.co_number,
          description: co.description,
          bloom_level: co.bloom_level,
          po_mappings: co.po_numbers || [],
        }));
        setCos(loadedCOs);
        setExistingCOs(response.data.cos);
      }
    } catch (error) {
      console.error('Error loading existing COs:', error);
      // Don't show error toast, just log it
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleAddCO = () => {
    const newCoNumber = cos.length + 1;
    setCos([
      ...cos,
      { co_number: newCoNumber, description: '', bloom_level: 'Apply', po_mappings: [] },
    ]);
  };

  const handleRemoveCO = (index) => {
    if (cos.length === 1) {
      toast.error('At least one CO is required');
      return;
    }
    const newCos = cos.filter((_, i) => i !== index);
    // Renumber COs
    newCos.forEach((co, i) => {
      co.co_number = i + 1;
    });
    setCos(newCos);
  };

  const handleCOChange = (index, field, value) => {
    const newCos = [...cos];
    newCos[index][field] = value;
    setCos(newCos);
  };

  const handleSave = async () => {
    // Validate
    for (const co of cos) {
      if (!co.description.trim()) {
        toast.error(`CO${co.co_number} description is required`);
        return;
      }
      if (!co.bloom_level) {
        toast.error(`CO${co.co_number} bloom level is required`);
        return;
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8080/api/course-outcomes/manual',
        {
          courseId,
          cos,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        toast.success(`Successfully saved ${cos.length} course outcomes!`);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error saving COs:', error);
      toast.error(error.response?.data?.error || 'Failed to save course outcomes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Edit />
        <Box component="span" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
          Manage Course Outcomes
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        {loadingExisting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading existing COs...</Typography>
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'info.lighter',
                border: '1px solid',
                borderColor: 'info.light',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Add or edit course outcomes manually. Each CO should have a clear description,
                Bloom's taxonomy level, and optional PO mappings.
              </Typography>
            </Box>

            {cos.map((co, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Chip
                    label={`CO${co.co_number}`}
                    color="primary"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveCO(index)}
                    disabled={cos.length === 1}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={2}
                      value={co.description}
                      onChange={(e) => handleCOChange(index, 'description', e.target.value)}
                      placeholder="Enter a clear and concise description of the learning outcome"
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Bloom's Level"
                      value={co.bloom_level}
                      onChange={(e) => handleCOChange(index, 'bloom_level', e.target.value)}
                      required
                    >
                      {BLOOM_LEVELS.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>PO Mappings</InputLabel>
                      <Select
                        multiple
                        value={co.po_mappings}
                        onChange={(e) => handleCOChange(index, 'po_mappings', e.target.value)}
                        input={<OutlinedInput label="PO Mappings" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={`PO${value}`} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {PO_OPTIONS.map((po) => (
                          <MenuItem key={po} value={po}>
                            PO{po}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddCO}
              sx={{ mt: 2 }}
            >
              Add Another CO
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<Save />}
          disabled={loading || loadingExisting}
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          }}
        >
          {loading ? 'Saving...' : 'Save Course Outcomes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualCOManager;
