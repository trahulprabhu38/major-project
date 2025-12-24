import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import attainmentCalculator from '../services/attainmentCalculator.js';

const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://upload-service:8001';

/**
 * Upload marksheet through upload-service and trigger calculation
 */
export const uploadMarksheet = async (req, res) => {
  try {
    const { courseId, assessmentName, assessmentType = 'CIE', maxMarks = 80 } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    if (!courseId || !assessmentName) {
      return res.status(400).json({
        success: false,
        message: 'courseId and assessmentName are required'
      });
    }
    
    // Create form data to send to upload-service
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('course_id', courseId);
    formData.append('assessment_name', assessmentName);
    formData.append('assessment_type', assessmentType);
    formData.append('max_marks', maxMarks);
    
    // Send to upload-service
    console.log(`Forwarding marksheet to upload-service: ${UPLOAD_SERVICE_URL}/upload-marksheet`);
    const uploadResponse = await axios.post(
      `${UPLOAD_SERVICE_URL}/upload-marksheet`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000 // 60 second timeout
      }
    );
    
    const uploadResult = uploadResponse.data;
    
    // Clean up uploaded file
    if (req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    if (!uploadResult.success) {
      return res.status(400).json(uploadResult);
    }
    
    // Trigger attainment calculation
    console.log(`Triggering attainment calculation for course ${courseId}`);
    try {
      const assessmentId = uploadResult.data.assessment_id;
      await attainmentCalculator.runFullCalculation(courseId, assessmentId);
      
      return res.json({
        success: true,
        message: 'Marksheet processed and attainment calculated successfully',
        data: {
          ...uploadResult.data,
          calculation_completed: true
        }
      });
    } catch (calcError) {
      console.error('Calculation error:', calcError);
      
      // Return success for upload but note calculation error
      return res.json({
        success: true,
        message: 'Marksheet uploaded successfully, but calculation encountered an error',
        data: {
          ...uploadResult.data,
          calculation_completed: false,
          calculation_error: calcError.message
        }
      });
    }
    
  } catch (error) {
    console.error('Marksheet upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to upload marksheet',
      error: error.response?.data?.detail || error.message
    });
  }
};

/**
 * Get marksheet metadata
 */
export const getMarksheetMetadata = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    
    const response = await axios.get(
      `${UPLOAD_SERVICE_URL}/marksheet/${marksheetId}`
    );
    
    return res.json(response.data);
  } catch (error) {
    console.error('Get marksheet error:', error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to retrieve marksheet metadata',
      error: error.response?.data || error.message
    });
  }
};

/**
 * Update CO mappings for a marksheet
 */
export const updateCOMappings = async (req, res) => {
  try {
    const { marksheetId } = req.params;
    const { co_mappings } = req.body;
    
    if (!co_mappings || !Array.isArray(co_mappings)) {
      return res.status(400).json({
        success: false,
        message: 'co_mappings array is required'
      });
    }
    
    const response = await axios.post(
      `${UPLOAD_SERVICE_URL}/marksheet/${marksheetId}/update-co-mappings`,
      { co_mappings }
    );
    
    return res.json(response.data);
  } catch (error) {
    console.error('Update CO mappings error:', error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update CO mappings',
      error: error.response?.data || error.message
    });
  }
};

/**
 * List all marksheets for a course
 */
export const listCourseMarksheets = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const response = await axios.get(
      `${UPLOAD_SERVICE_URL}/course/${courseId}/marksheets`
    );
    
    return res.json(response.data);
  } catch (error) {
    console.error('List marksheets error:', error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list marksheets',
      error: error.response?.data || error.message
    });
  }
};
