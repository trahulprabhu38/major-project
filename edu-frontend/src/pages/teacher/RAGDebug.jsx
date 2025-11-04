import React, { useState } from "react";
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import axios from "axios";

const RAGDebug = () => {
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState("");
  const [nResults, setNResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const CO_API_URL = import.meta.env.VITE_CO_API_URL || "http://localhost:8085";

  const handleQuery = async () => {
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(`${CO_API_URL.replace('/api/co', '')}/query`, {
        question: question,
        course_id: courseId || undefined,
        n_results: nResults,
      });

      setResults(response.data);
    } catch (err) {
      console.error("Query error:", err);
      setError(err.response?.data?.error || err.message || "Failed to query RAG system");
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.7) return "success";
    if (similarity >= 0.4) return "warning";
    return "error";
  };

  const renderResultCard = (result, index, source) => (
    <Card key={`${source}-${index}`} variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Result {index + 1}
          </Typography>
          <Chip
            label={`Similarity: ${result.similarity.toFixed(3)}`}
            color={getSimilarityColor(result.similarity)}
            size="small"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Chip
            label={result.source || "unknown"}
            size="small"
            variant="outlined"
            color="primary"
          />
          {result.page !== null && result.page !== undefined && (
            <Chip label={`Page ${result.page}`} size="small" variant="outlined" />
          )}
        </Box>

        <Typography
          variant="body2"
          sx={{
            bgcolor: "grey.50",
            p: 1.5,
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        >
          {result.text}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <BugReportIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Typography variant="h4" fontWeight="bold">
            RAG System Debug
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Test the Retrieval-Augmented Generation (RAG) pipeline to see which
          contexts are retrieved for your queries
        </Typography>
      </Box>

      {/* Query Input Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Query Input
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Question"
              placeholder="e.g., What is normalization in databases?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              multiline
              rows={2}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Course ID (Optional)"
              placeholder="Leave empty to search all courses"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              variant="outlined"
              helperText="Filter results by specific course"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Number of Results"
              value={nResults}
              onChange={(e) => setNResults(parseInt(e.target.value) || 5)}
              variant="outlined"
              inputProps={{ min: 1, max: 20 }}
              helperText="How many context chunks to retrieve"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleQuery}
              disabled={loading}
              fullWidth
            >
              {loading ? "Querying RAG System..." : "Query RAG System"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {results && (
        <Grid container spacing={3}>
          {/* ChromaDB Results */}
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6">ChromaDB Results</Typography>
                  <Chip
                    label={`${results.chromadb_results?.length || 0} found`}
                    size="small"
                    color="primary"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {results.chromadb_results && results.chromadb_results.length > 0 ? (
                  results.chromadb_results.map((result, index) =>
                    renderResultCard(result, index, "chromadb")
                  )
                ) : (
                  <Alert severity="info">No results from ChromaDB</Alert>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* FAISS Results */}
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6">FAISS Results</Typography>
                  <Chip
                    label={`${results.faiss_results?.length || 0} found`}
                    size="small"
                    color="secondary"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {results.faiss_results && results.faiss_results.length > 0 ? (
                  results.faiss_results.map((result, index) =>
                    renderResultCard(result, index, "faiss")
                  )
                ) : (
                  <Alert severity="info">No results from FAISS</Alert>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Query Info */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" gutterBottom>
                Query Information
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Question:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {results.question}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Course ID:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {results.course_id || "All courses"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Timestamp:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(results.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Help Panel */}
      <Paper elevation={1} sx={{ p: 3, mt: 3, bgcolor: "info.lighter" }}>
        <Typography variant="h6" gutterBottom>
          <CheckCircleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Understanding the Results
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Similarity Score:</strong> Higher scores (closer to 1.0) indicate
          better relevance to your query. Results below 0.3 are automatically
          filtered out.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>ChromaDB vs FAISS:</strong> Both systems should return similar
          results. ChromaDB is the primary vector store; FAISS serves as a fallback.
        </Typography>
        <Typography variant="body2">
          <strong>Source & Page:</strong> Shows which syllabus file and page the
          context was extracted from, helping you verify accuracy.
        </Typography>
      </Paper>
    </Container>
  );
};

export default RAGDebug;
