import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Typography, alpha } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const MotionBox = motion.create(Box);

const UploadZone = ({ onFileSelect, selectedFile, uploading }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        {...getRootProps()}
        sx={{
          position: "relative",
          border: (theme) =>
            isDragActive
              ? `2px dashed ${theme.palette.primary.main}`
              : `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 4,
          p: 6,
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          background: (theme) =>
            isDragActive
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                  theme.palette.secondary.main,
                  0.1
                )} 100%)`
              : theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.6)
              : alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(10px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            borderColor: (theme) => theme.palette.primary.main,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(
                theme.palette.secondary.main,
                0.05
              )} 100%)`,
            transform: uploading ? "none" : "translateY(-2px)",
            boxShadow: (theme) =>
              uploading ? "none" : `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
        }}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <MotionBox
              key="file-selected"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.success.main, 0.4)}`,
                  }}
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "white" }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    File Selected
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      justifyContent: "center",
                      px: 3,
                      py: 1,
                      borderRadius: 3,
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                    }}
                  >
                    <InsertDriveFileIcon
                      sx={{ fontSize: 20, color: (theme) => theme.palette.success.main }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ color: (theme) => theme.palette.success.main }}
                    >
                      {selectedFile.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
              </Box>
            </MotionBox>
          ) : (
            <MotionBox
              key="no-file"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                animate={
                  isDragActive
                    ? {
                        y: [0, -10, 0],
                        transition: { duration: 0.6, repeat: Infinity },
                      }
                    : {}
                }
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 80,
                    color: (theme) =>
                      isDragActive ? theme.palette.primary.main : theme.palette.text.secondary,
                    mb: 2,
                    opacity: isDragActive ? 1 : 0.6,
                    transition: "all 0.3s ease",
                  }}
                />
              </motion.div>

              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {isDragActive ? "Drop your file here" : "Upload Your Dataset"}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Drag and drop your CSV or Excel file here, or click to browse
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[".CSV", ".XLSX", ".XLS"].map((ext) => (
                  <Box
                    key={ext}
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      sx={{ color: (theme) => theme.palette.primary.main }}
                    >
                      {ext}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </MotionBox>
          )}
        </AnimatePresence>
      </Box>
    </MotionBox>
  );
};

export default UploadZone;
