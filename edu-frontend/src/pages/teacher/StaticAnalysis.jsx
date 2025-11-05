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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  FileText,
  BarChart3,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Mock Data
const overviewStats = [
  {
    title: "Total Students",
    value: "234",
    change: "+12%",
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Uploaded Assessments",
    value: "89",
    change: "+23%",
    icon: FileText,
    gradient: "from-violet-500 to-violet-600",
  },
  {
    title: "CO Reports Generated",
    value: "156",
    change: "+18%",
    icon: BarChart3,
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Active Courses",
    value: "12",
    change: "+2",
    icon: BookOpen,
    gradient: "from-pink-500 to-pink-600",
  },
];

const weeklyData = [
  { week: "Week 1", assessments: 12, reports: 8 },
  { week: "Week 2", assessments: 19, reports: 15 },
  { week: "Week 3", assessments: 15, reports: 12 },
  { week: "Week 4", assessments: 22, reports: 18 },
  { week: "Week 5", assessments: 28, reports: 24 },
  { week: "Week 6", assessments: 24, reports: 20 },
  { week: "Week 7", assessments: 31, reports: 27 },
];

const recentActivity = [
  {
    id: 1,
    date: "2025-03-15",
    action: "Uploaded CIA-1 Marks for CSE301",
    status: "Completed",
    duration: "2 mins",
  },
  {
    id: 2,
    date: "2025-03-14",
    action: "Generated CO Attainment Report for CSE402",
    status: "Completed",
    duration: "5 mins",
  },
  {
    id: 3,
    date: "2025-03-14",
    action: "Uploaded Assignment Marks for CSE205",
    status: "Completed",
    duration: "3 mins",
  },
  {
    id: 4,
    date: "2025-03-13",
    action: "Bulk Import Student Data",
    status: "Failed",
    duration: "1 min",
  },
  {
    id: 5,
    date: "2025-03-13",
    action: "Generated PO Attainment Report for CSE301",
    status: "Completed",
    duration: "7 mins",
  },
  {
    id: 6,
    date: "2025-03-12",
    action: "Uploaded Lab Assessment Marks",
    status: "Completed",
    duration: "4 mins",
  },
];

const StaticAnalysis = () => {
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
            Static Analysis Dashboard
          </h1>
          <p className={`mt-2 ${isDark ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
            Track assessment uploads, reports, and system activity
          </p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewStats.map((stat, index) => (
            <motion.div key={stat.title} variants={itemVariants}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500 font-medium">
                          {stat.change}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          vs last month
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trends Chart */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Weekly Trends
              </CardTitle>
              <CardDescription>
                Assessment uploads and report generation over the past 7 weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? "#60a5fa" : "#2563eb"} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={isDark ? "#60a5fa" : "#2563eb"} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? "#a78bfa" : "#7c3aed"} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={isDark ? "#a78bfa" : "#7c3aed"} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"} />
                  <XAxis
                    dataKey="week"
                    stroke={isDark ? "#94A3B8" : "#6b7280"}
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke={isDark ? "#94A3B8" : "#6b7280"}
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0B1625" : "#ffffff",
                      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: isDark ? "0 0 20px rgba(59, 130, 246, 0.2)" : "0 4px 6px rgba(0, 0, 0, 0.1)",
                      color: isDark ? "#E2E8F0" : "#1f2937",
                    }}
                  />
                  <Legend wrapperStyle={{ color: isDark ? "#E2E8F0" : "#1f2937" }} />
                  <Line
                    type="monotone"
                    dataKey="assessments"
                    stroke={isDark ? "#60a5fa" : "#2563eb"}
                    strokeWidth={3}
                    fill="url(#colorAssessments)"
                    name="Assessments Uploaded"
                    dot={{ fill: isDark ? "#60a5fa" : "#2563eb", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    stroke={isDark ? "#a78bfa" : "#7c3aed"}
                    strokeWidth={3}
                    fill="url(#colorReports)"
                    name="Reports Generated"
                    dot={{ fill: isDark ? "#a78bfa" : "#7c3aed", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Table */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Track your recent uploads and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {new Date(activity.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            activity.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {activity.status === "Completed" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {activity.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {activity.duration}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default StaticAnalysis;
