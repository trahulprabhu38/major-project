import axios from 'axios';

const CO_GENERATOR_URL = import.meta.env.VITE_CO_GENERATOR_URL || 'http://localhost:8002';

// Create axios instance with default config
const coGeneratorAPI = axios.create({
  baseURL: CO_GENERATOR_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generate Course Outcomes from uploaded files
 * @param {FileList|File[]} files - Course material files (PDF, PPTX, DOCX, TXT)
 * @param {number} numApply - Number of Apply-level COs (default: 2)
 * @param {number} numAnalyze - Number of Analyze-level COs (default: 2)
 * @param {boolean} useChromaDB - Use ChromaDB for context retrieval (default: false)
 * @returns {Promise} - Generated COs with metrics
 */
export const generateCOs = async (files, numApply = 2, numAnalyze = 2, useChromaDB = false) => {
  try {
    const formData = new FormData();

    // Append all files
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    // Append parameters
    formData.append('num_apply', numApply);
    formData.append('num_analyze', numAnalyze);
    formData.append('use_chromadb', useChromaDB);

    const response = await coGeneratorAPI.post('/generate-cos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error generating COs:', error);
    throw error;
  }
};

/**
 * Regenerate a specific CO based on feedback
 * @param {number} coNum - CO number (1-6)
 * @param {string} originalText - Original CO text
 * @param {string} bloomLevel - Bloom taxonomy level
 * @param {string} feedback - User feedback for regeneration
 * @returns {Promise} - Regenerated CO with metrics
 */
export const regenerateCO = async (coNum, originalText, bloomLevel, feedback = '') => {
  try {
    const response = await coGeneratorAPI.post('/regenerate-co', {
      co_num: coNum,
      original_text: originalText,
      bloom_level: bloomLevel,
      feedback: feedback,
    });

    return response.data;
  } catch (error) {
    console.error('Error regenerating CO:', error);
    throw error;
  }
};

/**
 * Evaluate a single CO for quality metrics
 * @param {string} coText - The course outcome text
 * @param {string} bloomLevel - Expected Bloom taxonomy level
 * @param {string} poMappings - Comma-separated PO mappings
 * @returns {Promise} - Quality metrics for the CO
 */
export const evaluateCO = async (coText, bloomLevel, poMappings = '') => {
  try {
    const formData = new FormData();
    formData.append('co_text', coText);
    formData.append('bloom_level', bloomLevel);
    formData.append('po_mappings', poMappings);

    const response = await coGeneratorAPI.post('/evaluate-co', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error evaluating CO:', error);
    throw error;
  }
};

/**
 * Get dashboard metrics for CO generator
 * @returns {Promise} - Comprehensive metrics for dashboard
 */
export const getDashboardMetrics = async () => {
  try {
    const response = await coGeneratorAPI.get('/metrics/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    throw error;
  }
};

/**
 * Get profiler statistics
 * @returns {Promise} - Latency profiler stats
 */
export const getProfilerStats = async () => {
  try {
    const response = await coGeneratorAPI.get('/metrics/profiler');
    return response.data;
  } catch (error) {
    console.error('Error getting profiler stats:', error);
    throw error;
  }
};

/**
 * Export metrics as JSON
 * @returns {Promise} - Metrics export data
 */
export const exportMetrics = async () => {
  try {
    const response = await coGeneratorAPI.get('/metrics/export', {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `co_generator_metrics_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true, message: 'Metrics exported successfully' };
  } catch (error) {
    console.error('Error exporting metrics:', error);
    throw error;
  }
};

/**
 * Submit user feedback on generated COs
 * @param {string} sessionId - Session ID
 * @param {number} coNum - CO number
 * @param {boolean} approved - Whether CO is approved
 * @param {string} feedbackText - Feedback text
 * @param {string} editedText - Edited CO text
 * @returns {Promise} - Feedback submission result
 */
export const submitFeedback = async (sessionId, coNum, approved, feedbackText = '', editedText = '') => {
  try {
    const response = await coGeneratorAPI.post('/feedback/submit', {
      session_id: sessionId,
      co_num: coNum,
      approved: approved,
      feedback_text: feedbackText,
      edited_text: editedText,
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

/**
 * Get feedback history
 * @param {number} limit - Number of feedback entries to retrieve
 * @returns {Promise} - Feedback history
 */
export const getFeedbackHistory = async (limit = 50) => {
  try {
    const response = await coGeneratorAPI.get('/feedback/history', {
      params: { limit },
    });

    return response.data;
  } catch (error) {
    console.error('Error getting feedback history:', error);
    throw error;
  }
};

/**
 * Get Bloom's taxonomy reference data
 * @returns {Promise} - Bloom taxonomy data
 */
export const getBloomTaxonomy = async () => {
  try {
    const response = await coGeneratorAPI.get('/bloom-taxonomy');
    return response.data;
  } catch (error) {
    console.error('Error getting Bloom taxonomy:', error);
    throw error;
  }
};

/**
 * Get VTU Program Outcome descriptions
 * @returns {Promise} - VTU PO descriptions
 */
export const getPODescriptions = async () => {
  try {
    const response = await coGeneratorAPI.get('/po-descriptions');
    return response.data;
  } catch (error) {
    console.error('Error getting PO descriptions:', error);
    throw error;
  }
};

/**
 * Search ChromaDB for relevant syllabus content
 * @param {string} query - Search query
 * @param {number} nResults - Number of results to return
 * @returns {Promise} - ChromaDB search results
 */
export const searchChromaDB = async (query, nResults = 5) => {
  try {
    const response = await coGeneratorAPI.get('/chromadb/search', {
      params: { query, n_results: nResults },
    });

    return response.data;
  } catch (error) {
    console.error('Error searching ChromaDB:', error);
    throw error;
  }
};

/**
 * Health check for CO Generator service
 * @returns {Promise} - Health status
 */
export const healthCheck = async () => {
  try {
    const response = await coGeneratorAPI.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
};

export default coGeneratorAPI;
