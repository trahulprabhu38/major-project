import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Tooltip,
  alpha,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import StorageIcon from "@mui/icons-material/Storage";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const MotionCard = motion(Card);
const MotionBox = motion(Box);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <MotionBox
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Card
      sx={{
        background: (theme) =>
          theme.palette.mode === "dark"
            ? `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.05)} 100%)`
            : `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: (theme) => `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 3,
        height: "100%",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
            }}
          >
            <Icon sx={{ fontSize: 24, color: "white" }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight="medium">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  </MotionBox>
);

const UploadSummary = ({ result, onViewTable, onExport }) => {
  if (!result || !result.success) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Success Banner */}
      <MotionCard
        variants={item}
        sx={{
          mb: 3,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
          color: "white",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Upload Successful! 🎉
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                {result.message}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </MotionCard>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={StorageIcon}
            label="Table Name"
            value={result.table_name}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={TableRowsIcon}
            label="Total Rows"
            value={result.row_count.toLocaleString()}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={ViewColumnIcon}
            label="Total Columns"
            value={result.column_count}
            color="#06b6d4"
          />
        </Grid>
      </Grid>

      {/* Column Details */}
      <MotionCard
        variants={item}
        sx={{
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.6)
              : theme.palette.background.paper,
          backdropFilter: "blur(10px)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
            Column Structure
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
            {result.columns?.map((col, idx) => {
              const dataType = result.data_types?.[col] || "unknown";
              return (
                <Tooltip
                  key={idx}
                  title={`Type: ${dataType}`}
                  arrow
                  placement="top"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Chip
                      label={col}
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        background: (theme) =>
                          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        color: "white",
                        px: 1,
                        py: 2.5,
                        borderRadius: 2,
                        boxShadow: (theme) =>
                          `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          boxShadow: (theme) =>
                            `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      }}
                    />
                  </motion.div>
                </Tooltip>
              );
            })}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={onViewTable}
                sx={{
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  "&:hover": {
                    boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                View Full Dataset
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onExport}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                Export Data
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Action: {result.if_exists_action}
            </Typography>
          </Box>
        </CardContent>
      </MotionCard>
    </motion.div>
  );
};

export default UploadSummary;
