import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  Lightbulb,
  Sparkles,
} from "lucide-react";

// Mock Data for CO Attainment
const coAttainmentData = [
  { co: "CO1", attainment: 78, target: 70 },
  { co: "CO2", attainment: 82, target: 70 },
  { co: "CO3", attainment: 65, target: 70 },
  { co: "CO4", attainment: 88, target: 70 },
  { co: "CO5", attainment: 75, target: 70 },
  { co: "CO6", attainment: 91, target: 70 },
];

// CO-PO Mapping Matrix (0-3 scale: 0=No correlation, 1=Low, 2=Medium, 3=High)
const coPOMatrix = [
  { co: "CO1", po1: 3, po2: 2, po3: 1, po4: 2, po5: 1, po6: 0, po7: 1, po8: 2, po9: 1, po10: 0, po11: 1, po12: 2 },
  { co: "CO2", po1: 2, po2: 3, po3: 2, po4: 1, po5: 2, po6: 1, po7: 0, po8: 1, po9: 2, po10: 1, po11: 0, po12: 1 },
  { co: "CO3", po1: 1, po2: 2, po3: 3, po4: 2, po5: 1, po6: 2, po7: 1, po8: 0, po9: 1, po10: 2, po11: 1, po12: 0 },
  { co: "CO4", po1: 2, po2: 1, po3: 2, po4: 3, po5: 2, po6: 1, po7: 2, po8: 1, po9: 0, po10: 1, po11: 2, po12: 1 },
  { co: "CO5", po1: 1, po2: 2, po3: 1, po4: 2, po5: 3, po6: 2, po7: 1, po8: 2, po9: 1, po10: 0, po11: 1, po12: 2 },
  { co: "CO6", po1: 3, po2: 2, po3: 2, po4: 1, po5: 2, po6: 3, po7: 2, po8: 1, po9: 2, po10: 1, po11: 0, po12: 1 },
];

// Get color based on attainment level
const getAttainmentColor = (value) => {
  if (value >= 80) return "#10b981"; // Green
  if (value >= 70) return "#f59e0b"; // Amber
  if (value >= 60) return "#ef4444"; // Red
  return "#9ca3af"; // Gray
};

// Get heatmap color intensity
const getHeatmapColor = (value) => {
  if (value === 0) return "bg-gray-100 text-gray-400";
  if (value === 1) return "bg-blue-200 text-blue-800";
  if (value === 2) return "bg-blue-400 text-white";
  if (value === 3) return "bg-gradient-to-br from-blue-600 to-violet-600 text-white font-bold";
  return "bg-gray-100";
};

const AttainmentDashboard = () => {
  const { isDark } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  // Calculate average attainment
  const avgAttainment = (
    coAttainmentData.reduce((sum, co) => sum + co.attainment, 0) /
    coAttainmentData.length
  ).toFixed(1);

  // Find best and worst performing COs
  const bestCO = coAttainmentData.reduce((max, co) =>
    co.attainment > max.attainment ? co : max
  );
  const worstCO = coAttainmentData.reduce((min, co) =>
    co.attainment < min.attainment ? co : min
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`min-h-screen p-6 transition-colors duration-700 ${
        isDark
          ? 'bg-dark-radial'
          : 'bg-gradient-to-br from-blue-50 via-white to-violet-50'
      }`}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${
            isDark
              ? 'from-blue-400 to-violet-400'
              : 'from-blue-600 to-violet-600'
          } bg-clip-text text-transparent tracking-tight`}>
            Attainment Dashboard
          </h1>
          <p className={`mt-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
            Comprehensive CO-PO attainment analysis and insights
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Average Attainment
                    </p>
                    <p className="text-4xl font-bold mt-2">{avgAttainment}%</p>
                    <p className="text-sm text-green-500 mt-1">
                      ↑ Above target of 70%
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Top Performing CO
                    </p>
                    <p className="text-4xl font-bold mt-2">{bestCO.co}</p>
                    <p className="text-sm text-green-500 mt-1">
                      {bestCO.attainment}% attainment
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Needs Improvement
                    </p>
                    <p className="text-4xl font-bold mt-2">{worstCO.co}</p>
                    <p className="text-sm text-orange-500 mt-1">
                      {worstCO.attainment}% attainment
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CO Attainment Bar Chart */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Course Outcome Attainment
              </CardTitle>
              <CardDescription>
                Individual CO performance against 70% target threshold
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={coAttainmentData}>
                  <defs>
                    {coAttainmentData.map((entry, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`barGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={getAttainmentColor(entry.attainment)}
                          stopOpacity={isDark ? 0.9 : 1}
                        />
                        <stop
                          offset="95%"
                          stopColor={getAttainmentColor(entry.attainment)}
                          stopOpacity={isDark ? 0.7 : 0.8}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"} />
                  <XAxis
                    dataKey="co"
                    stroke={isDark ? "#94A3B8" : "#6b7280"}
                    style={{ fontSize: "14px", fontWeight: "500" }}
                  />
                  <YAxis
                    stroke={isDark ? "#94A3B8" : "#6b7280"}
                    style={{ fontSize: "12px" }}
                    label={{
                      value: "Attainment (%)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: isDark ? "#94A3B8" : "#6b7280" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0B1625" : "#ffffff",
                      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: isDark ? "0 0 20px rgba(59, 130, 246, 0.2)" : "0 4px 6px rgba(0, 0, 0, 0.1)",
                      color: isDark ? "#E2E8F0" : "#1f2937",
                    }}
                    formatter={(value) => [`${value}%`, "Attainment"]}
                  />
                  <Bar dataKey="attainment" radius={[8, 8, 0, 0]}>
                    {coAttainmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="target"
                    fill={isDark ? "#475569" : "#d1d5db"}
                    radius={[8, 8, 0, 0]}
                    opacity={0.3}
                  />
                  <Legend wrapperStyle={{ color: isDark ? "#E2E8F0" : "#1f2937" }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* CO-PO Mapping Heatmap */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                CO-PO Mapping Matrix
              </CardTitle>
              <CardDescription>
                Correlation strength between Course Outcomes and Programme Outcomes (0=None, 1=Low, 2=Medium, 3=High)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">CO</TableHead>
                      {Array.from({ length: 12 }, (_, i) => (
                        <TableHead key={i} className="text-center font-bold">
                          PO{i + 1}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coPOMatrix.map((row) => (
                      <TableRow key={row.co}>
                        <TableCell className="font-bold">{row.co}</TableCell>
                        {Array.from({ length: 12 }, (_, i) => {
                          const value = row[`po${i + 1}`];
                          return (
                            <TableCell key={i} className="p-0">
                              <div
                                className={`w-full h-12 flex items-center justify-center text-sm font-medium ${getHeatmapColor(
                                  value
                                )} transition-all duration-300 hover:scale-110 cursor-pointer`}
                              >
                                {value === 0 ? "-" : value}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights & Recommendations */}
        <motion.div variants={itemVariants}>
          <Card className={`hover:shadow-md ${
            isDark
              ? 'bg-white/5 border-blue-500/20'
              : 'bg-gradient-to-br from-blue-50 to-violet-50 border-blue-200'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                Key Insights & Recommendations
              </CardTitle>
              <CardDescription>AI-powered analysis of attainment data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-3 p-4 rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-green-500/20'
                  : 'bg-white border-blue-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Strong Performance</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    Students performed exceptionally well in <strong>CO6</strong> with a{" "}
                    <strong>91% attainment rate</strong>, significantly exceeding the target.
                    This indicates strong understanding of advanced topics.
                  </p>
                </div>
              </div>

              <div className={`flex gap-3 p-4 rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-orange-500/20'
                  : 'bg-white border-orange-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Area of Concern</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    <strong>CO3</strong> shows <strong>65% attainment</strong>, falling below
                    the 70% threshold. Consider additional tutorials or practice sessions for
                    this outcome.
                  </p>
                </div>
              </div>

              <div className={`flex gap-3 p-4 rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-blue-500/20'
                  : 'bg-white border-blue-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Recommendation</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    The strong correlation between <strong>CO1</strong> and <strong>PO1</strong>{" "}
                    (level 3) combined with high attainment (78%) suggests effective teaching
                    methods. Apply similar approaches to improve CO3 performance.
                  </p>
                </div>
              </div>

              <div className={`flex gap-3 p-4 rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-violet-500/20'
                  : 'bg-white border-violet-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-dark-text-primary' : 'text-gray-900'}`}>Overall Trend</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    <strong>5 out of 6 COs</strong> meet or exceed the target threshold. The
                    overall course attainment of <strong>{avgAttainment}%</strong> indicates
                    successful course delivery.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default AttainmentDashboard;
