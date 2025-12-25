import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { CloudUpload, RotateCcw, GraduationCap } from "lucide-react";
import toast from 'react-hot-toast';

// Import our components
import UploadZone from "../../components/upload/UploadZone";
import UploadSummary from "../../components/upload/UploadSummary";
import DatasetTable from "../../components/upload/DatasetTable";
import { courseAPI } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

const UPLOAD_SERVICE_URL = import.meta.env.VITE_UPLOAD_SERVICE_URL || "http://localhost:8001";

const UploadMarksNew = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);

  // Course selection states
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [assessmentName, setAssessmentName] = useState("");

  // Load courses on component mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await courseAPI.getAll();
      setCourses(response.data.data || []);
    } catch (err) {
      console.error("Error loading courses:", err);
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    if (!selectedCourse) {
      toast.error("Please select a course first");
      return;
    }

    if (!assessmentName.trim()) {
      toast.error("Please enter an assessment name");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", selectedCourse);
      formData.append("assessmentName", assessmentName);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      // Upload to the upload service
      const uploadResponse = await axios.post(`${UPLOAD_SERVICE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setResult(uploadResponse.data);
      toast.success("Marks uploaded and saved successfully!");

      // Scroll to table after a brief delay
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || "Upload failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setAssessmentName("");
  };

  const handleViewTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleExport = () => {
    if (!result?.preview || !result?.columns) return;

    // Convert data to CSV
    const headers = result.columns.join(",");
    const rows = result.preview.map((row) =>
      result.columns.map((col) => JSON.stringify(row[col] || "")).join(",")
    );
    const csv = [headers, ...rows].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.table_name}_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Data exported successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-dark-bg-primary dark:to-dark-bg-secondary py-12">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
            {/* Decorative circle */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />

            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Upload Assessment Data
              </h1>
              <p className="text-xl opacity-95">
                Transform your CSV or Excel files into structured database tables
              </p>
            </div>
          </div>
        </motion.div>

        {/* Course Selection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Card
            className={`transition-all duration-300 ${
              selectedCourse
                ? 'border-2 border-primary-500 dark:border-dark-green-500 shadow-lg shadow-primary-500/20'
                : 'border-2'
            }`}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-dark-green-500" />
                <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text-primary">
                  Select Course & Assessment Details
                </h2>
              </div>

              <div className="space-y-6">
                {/* Course Select */}
                <div>
                  <label htmlFor="course-select" className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    Select Course *
                  </label>
                  <div className="relative">
                    <select
                      id="course-select"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      disabled={loadingCourses || uploading}
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-secondary border-2 border-neutral-300 dark:border-dark-border rounded-xl text-neutral-800 dark:text-dark-text-primary font-medium focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Select a course --</option>
                      {courses.length === 0 ? (
                        <option disabled>No courses available</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name} (Semester {course.semester}, {course.year})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Assessment Name */}
                <div>
                  <label htmlFor="assessment-name" className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2">
                    Assessment Name *
                  </label>
                  <input
                    id="assessment-name"
                    type="text"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                    placeholder="e.g., Internal Assessment 1, Mid Term Exam, Assignment 1"
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-white dark:bg-dark-bg-secondary border-2 border-neutral-300 dark:border-dark-border rounded-xl text-neutral-800 dark:text-dark-text-primary placeholder:text-neutral-500 dark:placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 dark:focus:border-dark-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Confirmation Alert */}
                {selectedCourse && assessmentName && (
                  <Alert className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
                    <p className="text-sm text-primary-800 dark:text-primary-200">
                      <strong>Ready to upload:</strong> Marks will be saved for{' '}
                      <strong>{courses.find((c) => c.id === selectedCourse)?.code}</strong> -{' '}
                      <strong>{assessmentName}</strong>
                    </p>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upload Zone */}
        <UploadZone
          onFileSelect={handleFileSelect}
          selectedFile={file}
          uploading={uploading}
        />

        {/* Upload Button */}
        <AnimatePresence>
          {file && !result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6 flex gap-4 justify-center flex-wrap"
            >
              <Button
                size="lg"
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-dark-green-500 dark:to-dark-green-600 hover:from-primary-600 hover:to-primary-700 dark:hover:from-dark-green-600 dark:hover:to-dark-green-700 px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-3" />
                ) : (
                  <CloudUpload className="w-5 h-5 mr-3" />
                )}
                {uploading ? "Uploading..." : "Upload to Database"}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleReset}
                disabled={uploading}
                className="px-6 py-6 text-base font-semibold border-2 hover:bg-neutral-50 dark:hover:bg-dark-bg-tertiary"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <Card className="bg-white/90 dark:bg-dark-bg-secondary/90 backdrop-blur-lg">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-neutral-700 dark:text-dark-text-primary">
                      Processing your file...
                    </span>
                    <span className="text-sm font-bold text-primary-600 dark:text-dark-green-500">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-200 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Summary */}
        {result && (
          <div className="mt-8">
            <UploadSummary
              result={result}
              onViewTable={handleViewTable}
              onExport={handleExport}
            />
          </div>
        )}

        {/* Dataset Table */}
        {result?.preview && (
          <div ref={tableRef} className="mt-8">
            <DatasetTable data={result.preview} columns={result.columns} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadMarksNew;
