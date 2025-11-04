import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const UPLOAD_SERVICE_URL = import.meta.env.VITE_UPLOAD_SERVICE_URL || "http://localhost:8001";

const UploadMarks = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
  });

  const handleUpload = async () => {
    if (!file) return setError("Please select a file first.");
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      // Upload to FastAPI service
      const response = await axios.post(`${UPLOAD_SERVICE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.detail || err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f9fafb",
        px: { xs: 2, sm: 6 },
        py: 4,
      }}
    >
      <Typography variant="h5" fontWeight="bold" mb={3} color="#1e3a8a">
        Upload Assessment Marks
      </Typography>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          {...getRootProps()}
          sx={{
            border: "2px dashed #2563eb",
            borderRadius: "16px",
            textAlign: "center",
            py: 8,
            px: 4,
            cursor: "pointer",
            transition: "all 0.2s ease",
            bgcolor: isDragActive ? "#e0f2fe" : "white",
            "&:hover": { borderColor: "#1d4ed8", bgcolor: "#f0f9ff" },
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 60, color: "#2563eb" }} />
          <Typography variant="h6" mt={2}>
            {isDragActive
              ? "Drop the file here ..."
              : "Drag & drop a file here, or click to select one"}
          </Typography>
          <Typography color="gray" mt={1}>
            Supported formats: .xlsx, .csv
          </Typography>
        </Card>
      </motion.div>

      {file && (
        <Typography mt={2} fontWeight="medium">
          Selected file: {file.name}
        </Typography>
      )}

      <Box mt={4} display="flex" gap={2}>
        <Button
          variant="contained"
          disabled={!file || uploading}
          onClick={handleUpload}
          sx={{
            bgcolor: "#1e3a8a",
            px: 4,
            py: 1.3,
            borderRadius: "10px",
            textTransform: "none",
            ":hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {uploading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
              Uploading...
            </>
          ) : (
            <>
              <CloudUploadIcon sx={{ mr: 1 }} />
              Upload File
            </>
          )}
        </Button>
      </Box>

      {/* Results or Errors */}
      <Box mt={4}>
        {result && result.success && (
          <Alert
            icon={<CheckCircleIcon fontSize="inherit" />}
            severity="success"
            sx={{ borderRadius: "8px" }}
          >
            {result.message || "File uploaded successfully!"}
          </Alert>
        )}

        {error && (
          <Alert
            icon={<ErrorIcon fontSize="inherit" />}
            severity="error"
            sx={{ borderRadius: "8px" }}
          >
            {error}
          </Alert>
        )}
      </Box>

      {/* Upload Summary Section */}
      {result && result.success && (
        <Box mt={5}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Upload Summary
          </Typography>
          <Card sx={{ borderRadius: "12px", boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight="medium" color="text.secondary">
                    Table Name:
                  </Typography>
                  <Typography fontWeight="bold" color="primary.main">
                    {result.table_name}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight="medium" color="text.secondary">
                    Rows Inserted:
                  </Typography>
                  <Typography fontWeight="bold">{result.row_count}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight="medium" color="text.secondary">
                    Columns:
                  </Typography>
                  <Typography fontWeight="bold">{result.column_count}</Typography>
                </Box>
                <Box mt={1}>
                  <Typography fontWeight="medium" color="text.secondary" mb={1}>
                    Column Names:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {result.columns?.map((col, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          px: 2,
                          py: 0.5,
                          bgcolor: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "8px",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                        }}
                      >
                        {col}
                      </Box>
                    ))}
                  </Box>
                </Box>
                {result.preview && result.preview.length > 0 && (
                  <Box mt={2}>
                    <Typography fontWeight="medium" color="text.secondary" mb={1}>
                      Preview (first {result.preview.length} rows):
                    </Typography>
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: "auto",
                        bgcolor: "#f9fafb",
                        p: 2,
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(result.preview, null, 2)}
                      </pre>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default UploadMarks;
