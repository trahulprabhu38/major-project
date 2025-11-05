import React, { useState, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  alpha,
  LinearProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Import our new components
import UploadZone from "../../components/upload/UploadZone";
import UploadSummary from "../../components/upload/UploadSummary";
import DatasetTable from "../../components/upload/DatasetTable";

const UPLOAD_SERVICE_URL = import.meta.env.VITE_UPLOAD_SERVICE_URL || "http://localhost:8001";

const MotionBox = motion.create(Box);

const UploadMarksNew = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const tableRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setSnackbar({
        open: true,
        message: "Please select a file first",
        severity: "error",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await axios.post(`${UPLOAD_SERVICE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 90) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setResult(response.data);
      setSnackbar({
        open: true,
        message: "File uploaded successfully! 🎉",
        severity: "success",
      });

      // Scroll to table after a brief delay
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Upload failed";
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
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

    setSnackbar({
      open: true,
      message: "Data exported successfully!",
      severity: "success",
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: (theme) =>
          theme.palette.mode === "dark"
            ? `linear-gradient(135deg, ${alpha("#0f172a", 0.95)} 0%, ${alpha(
                "#1e293b",
                0.95
              )} 100%)`
            : `linear-gradient(135deg, ${alpha("#f8fafc", 1)} 0%, ${alpha(
                "#e2e8f0",
                1
              )} 100%)`,
        py: 6,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          sx={{ mb: 5 }}
        >
          <Box
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              borderRadius: 4,
              p: 4,
              color: "white",
              position: "relative",
              overflow: "hidden",
              boxShadow: (theme) => `0 12px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: alpha("#fff", 0.1),
              }}
            />
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Upload Assessment Data
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.95 }}>
                Transform your CSV or Excel files into structured database tables
              </Typography>
            </Box>
          </Box>
        </MotionBox>

        {/* Upload Zone */}
        <UploadZone
          onFileSelect={handleFileSelect}
          selectedFile={file}
          uploading={uploading}
        />

        {/* Upload Button */}
        <AnimatePresence>
          {file && !result && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                onClick={handleUpload}
                disabled={uploading}
                sx={{
                  px: 6,
                  py: 2,
                  borderRadius: 3,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  textTransform: "none",
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: (theme) =>
                    `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    boxShadow: (theme) =>
                      `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
                    transform: "translateY(-2px)",
                  },
                  "&:disabled": {
                    background: (theme) => alpha(theme.palette.primary.main, 0.5),
                  },
                }}
              >
                {uploading ? "Uploading..." : "Upload to Database"}
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={uploading}
                sx={{
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                Reset
              </Button>
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploading && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              sx={{ mt: 3 }}
            >
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.background.paper, 0.6)
                      : alpha(theme.palette.background.paper, 0.9),
                  backdropFilter: "blur(10px)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Processing your file...
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {uploadProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.2),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      background: (theme) =>
                        `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    },
                  }}
                />
              </Box>
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Upload Summary */}
        {result && (
          <Box sx={{ mt: 5 }}>
            <UploadSummary
              result={result}
              onViewTable={handleViewTable}
              onExport={handleExport}
            />
          </Box>
        )}

        {/* Dataset Table */}
        {result?.preview && (
          <Box ref={tableRef} sx={{ mt: 5 }}>
            <DatasetTable data={result.preview} columns={result.columns} />
          </Box>
        )}

        {/* Snackbar Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default UploadMarksNew;
