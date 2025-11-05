import { Box, Container, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import { BarChart2, PieChart, TrendingUp, Award } from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import PageLayout from '../../components/shared/PageLayout';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

// Sample data for CO Attainment
const coAttainmentData = [
  { name: 'CO1', attainment: 78, target: 70 },
  { name: 'CO2', attainment: 82, target: 70 },
  { name: 'CO3', attainment: 69, target: 70 },
  { name: 'CO4', attainment: 91, target: 70 },
  { name: 'CO5', attainment: 85, target: 70 },
  { name: 'CO6', attainment: 76, target: 70 },
];

// Sample data for Bloom's Taxonomy Distribution
const bloomData = [
  { name: 'Remember', value: 2, color: '#ef4444' },
  { name: 'Understand', value: 3, color: '#f59e0b' },
  { name: 'Apply', value: 4, color: '#10b981' },
  { name: 'Analyze', value: 2, color: '#06b6d4' },
  { name: 'Evaluate', value: 1, color: '#8b5cf6' },
  { name: 'Create', value: 1, color: '#ec4899' },
];

// Sample data for PO Attainment
const poAttainmentData = [
  { name: 'PO1', attainment: 75 },
  { name: 'PO2', attainment: 82 },
  { name: 'PO3', attainment: 68 },
  { name: 'PO4', attainment: 79 },
  { name: 'PO5', attainment: 88 },
];

// Sample data for Assessment Trends
const assessmentTrendData = [
  { month: 'Jan', cie1: 72, cie2: 0, cie3: 0 },
  { month: 'Feb', cie1: 72, cie2: 78, cie3: 0 },
  { month: 'Mar', cie1: 72, cie2: 78, cie3: 85 },
  { month: 'Apr', cie1: 72, cie2: 78, cie3: 85 },
];

const Analysis = () => {
  return (
    <PageLayout
      title="Analysis Dashboard"
      subtitle="A comprehensive overview of CO and PO performance metrics (Static Preview)"
      icon={BarChart2}
    >
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      6
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total COs
                    </Typography>
                  </Box>
                  <Award sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      80%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Avg CO Attainment
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      5
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total POs
                    </Typography>
                  </Box>
                  <BarChart2 sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      78%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Avg PO Attainment
                    </Typography>
                  </Box>
                  <PieChart sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>
        </Grid>

        {/* Charts Grid */}
        <Grid container spacing={3}>
          {/* CO Attainment Bar Chart */}
          <Grid item xs={12} lg={8}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Course Outcome (CO) Attainment Levels
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Comparison of actual attainment vs. target threshold (70%)
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={coAttainmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attainment" fill="#667eea" name="Attainment %" />
                  <Bar dataKey="target" fill="#10b981" name="Target %" />
                </BarChart>
              </ResponsiveContainer>
            </MotionPaper>
          </Grid>

          {/* Bloom's Taxonomy Pie Chart */}
          <Grid item xs={12} lg={4}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Bloom's Taxonomy Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Distribution of COs across cognitive levels
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPie>
                  <Pie
                    data={bloomData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bloomData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </MotionPaper>
          </Grid>

          {/* PO Attainment Bar Chart */}
          <Grid item xs={12} lg={6}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Program Outcome (PO) Attainment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Performance across program outcomes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={poAttainmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="attainment" fill="#3b82f6" name="Attainment %" />
                </BarChart>
              </ResponsiveContainer>
            </MotionPaper>
          </Grid>

          {/* Assessment Trends Line Chart */}
          <Grid item xs={12} lg={6}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Assessment Performance Trends
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Average scores across internal assessments
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={assessmentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cie1" stroke="#ef4444" strokeWidth={2} name="CIE 1" />
                  <Line type="monotone" dataKey="cie2" stroke="#10b981" strokeWidth={2} name="CIE 2" />
                  <Line type="monotone" dataKey="cie3" stroke="#3b82f6" strokeWidth={2} name="CIE 3" />
                </LineChart>
              </ResponsiveContainer>
            </MotionPaper>
          </Grid>
        </Grid>

        {/* Info Note */}
        <Box sx={{ mt: 4, p: 3, bgcolor: 'info.main', color: 'white', borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            📊 Note: This is a static preview dashboard with sample data.
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
            Real-time data integration will be available once course assessments are completed and outcomes are mapped.
          </Typography>
        </Box>
      </Container>
    </PageLayout>
  );
};

export default Analysis;
