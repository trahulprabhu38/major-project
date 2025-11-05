import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  alpha,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { motion } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

const MotionCard = motion.create(Card);

const DatasetTable = ({ data, columns }) => {
  const [searchText, setSearchText] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // Convert data to DataGrid format
  const rows = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((row, index) => ({
      id: index,
      ...row,
    }));
  }, [data]);

  // Create column definitions for DataGrid
  const gridColumns = useMemo(() => {
    if (!columns || columns.length === 0) return [];
    return columns.map((col) => ({
      field: col,
      headerName: col.toUpperCase(),
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
      align: "left",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {params.value !== null && params.value !== undefined ? String(params.value) : "-"}
        </Typography>
      ),
    }));
  }, [columns]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchText) return rows;

    return rows.filter((row) => {
      return Object.values(row).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchText.toLowerCase());
      });
    });
  }, [rows, searchText]);

  if (!data || data.length === 0) return null;

  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="dataset-table"
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
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Complete Dataset
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredRows.length} of {rows.length} records
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={() => setSearchText("")}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search across all columns..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.background.default, 0.5)
                  : alpha(theme.palette.background.default, 0.8),
            },
          }}
        />

        {/* DataGrid */}
        <Box
          sx={{
            height: 600,
            width: "100%",
            "& .MuiDataGrid-root": {
              border: "none",
              borderRadius: 2,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: (theme) =>
                `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
            "& .MuiDataGrid-columnHeaders": {
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`
                  : `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              borderRadius: 2,
              borderBottom: "none",
              fontWeight: 700,
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-virtualScroller": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.background.default, 0.3)
                  : theme.palette.background.paper,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: (theme) =>
                `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.background.default, 0.3)
                  : alpha(theme.palette.background.default, 0.5),
              borderRadius: "0 0 8px 8px",
            },
            "& .MuiDataGrid-row": {
              "&:nth-of-type(odd)": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.background.default, 0.2)
                    : alpha(theme.palette.primary.main, 0.02),
              },
              "&:hover": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.primary.main, 0.08),
              },
            },
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
          }}
        >
          <DataGrid
            rows={filteredRows}
            columns={gridColumns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            disableRowSelectionOnClick
            disableColumnMenu={false}
            density="comfortable"
            sx={{
              "& .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus-within": {
                outline: "none",
              },
            }}
          />
        </Box>
      </CardContent>
    </MotionCard>
  );
};

export default DatasetTable;
