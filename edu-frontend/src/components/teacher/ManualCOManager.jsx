import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-bg-secondary rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 text-white p-6 flex items-center gap-3">
          <Edit className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Manage Course Outcomes</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingExisting ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-neutral-600 dark:text-dark-text-secondary">Loading existing COs...</p>
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-800 dark:text-primary-200">
                  Add or edit course outcomes manually. Each CO should have a clear description,
                  Bloom's taxonomy level, and optional PO mappings.
                </p>
              </div>

              {cos.map((co, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="mb-4 border-2 border-neutral-200 dark:border-dark-border hover:border-primary-500 dark:hover:border-dark-green-500 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-primary-500 text-white font-bold">
                          CO{co.co_number}
                        </Badge>
                        <button
                          onClick={() => handleRemoveCO(index)}
                          disabled={cos.length === 1}
                          className="p-2 rounded-lg text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                            Description *
                          </label>
                          <textarea
                            rows={2}
                            value={co.description}
                            onChange={(e) => handleCOChange(index, 'description', e.target.value)}
                            placeholder="Enter a clear and concise description of the learning outcome"
                            className="w-full px-4 py-3 border-2 border-neutral-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-primary text-neutral-800 dark:text-dark-text-primary placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                              Bloom's Level *
                            </label>
                            <select
                              value={co.bloom_level}
                              onChange={(e) => handleCOChange(index, 'bloom_level', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-neutral-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-secondary text-neutral-800 dark:text-dark-text-primary focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500"
                              required
                            >
                              {BLOOM_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                              PO Mappings (optional)
                            </label>
                            <div className="relative">
                              <select
                                multiple
                                value={co.po_mappings}
                                onChange={(e) => {
                                  const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                  handleCOChange(index, 'po_mappings', selectedOptions);
                                }}
                                className="w-full px-4 py-3 border-2 border-neutral-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg-secondary text-neutral-800 dark:text-dark-text-primary focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500 h-32"
                              >
                                {PO_OPTIONS.map((po) => (
                                  <option key={po} value={po}>
                                    PO{po}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {co.po_mappings.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {co.po_mappings.map((po) => (
                                  <Badge key={po} variant="outline" className="text-xs">
                                    PO{po}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              <Button
                variant="outline"
                onClick={handleAddCO}
                className="w-full mt-4 border-2 border-dashed border-primary-500 dark:border-dark-green-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another CO
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-dark-border flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || loadingExisting}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Course Outcomes
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ManualCOManager;
