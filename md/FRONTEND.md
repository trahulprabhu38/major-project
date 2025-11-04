# 🎨 OBE CO/PO Attainment Analysis System - Frontend Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Features](#features)
- [File Structure](#file-structure)
- [Pages & Components](#pages--components)
- [State Management](#state-management)
- [Routing](#routing)
- [UI/UX Design](#uiux-design)
- [Setup & Configuration](#setup--configuration)
- [Environment Variables](#environment-variables)

---

## Overview

The frontend is a modern **React 19** single-page application (SPA) built with **Vite**, featuring a polished UI using **Material-UI (MUI)**, smooth animations with **Framer Motion**, and interactive data visualizations using **Recharts**. It provides role-based interfaces for teachers and students.

### Key Features
- ✅ **Modern React 19** with Hooks & Functional Components
- ✅ **Material-UI (MUI 5)** for consistent, professional design
- ✅ **Framer Motion 11** for smooth, delightful animations
- ✅ **Recharts 2** for beautiful, interactive charts
- ✅ **Zustand** for lightweight global state management
- ✅ **React Router v7** for client-side routing
- ✅ **Axios** for API communication
- ✅ **React Hot Toast** for elegant notifications
- ✅ **Fully Responsive** mobile-first design

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | React | 19.x |
| **Build Tool** | Vite (Rolldown) | 7.x |
| **UI Library** | Material-UI (MUI) | 5.x |
| **Animation** | Framer Motion | 11.x |
| **Charts** | Recharts | 2.x |
| **State Management** | Zustand | 4.x |
| **Routing** | React Router | 7.x |
| **HTTP Client** | Axios | 1.x |
| **Styling** | Tailwind CSS + MUI | 3.x + 5.x |
| **Notifications** | React Hot Toast | 2.x |
| **File Upload** | React Dropzone | 14.x |

---

## Architecture

### Component Hierarchy

```
App (ThemeProvider, AuthProvider)
├── Public Routes
│   ├── Login
│   └── Register
├── Teacher Routes (Protected)
│   ├── Dashboard
│   ├── Courses (CRUD)
│   ├── CourseDetail
│   ├── Analytics
│   └── UploadMarks
└── Student Routes (Protected)
    ├── Dashboard
    └── CourseAnalytics
```

### Data Flow

```
User Action → Component
           → API Service (Axios)
           → Backend REST API
           → Response
           → Zustand Store (Cache)
           → Component Re-render
           → UI Update (with Framer Motion animations)
```

---

## Features

### Teacher Portal

#### Dashboard (`/teacher/dashboard`)
- 📊 Overview statistics (courses, students, assessments)
- 📈 Quick access to analytics
- 🔗 Navigation to courses and upload
- 📋 Recent activity feed

#### Courses Management (`/teacher/courses`)
- ✅ Create, Read, Update, Delete (CRUD) courses
- 🎨 Beautiful card-based layout with gradients
- 🔍 Course details with enrollment info
- 📝 Course description and metadata

#### Course Detail (`/teacher/courses/:id`)
- 👥 View enrolled students
- 📊 Course statistics
- 📚 Course outcomes list
- ✉️ Student contact information
- 📤 Quick access to upload marks

#### Analytics Dashboard (`/teacher/analytics`)
- 📊 **CO Attainment Bar Charts** - Average attainment per course outcome
- 🎯 **PO Attainment Bar Charts** - Program outcome levels
- 🥧 **Performance Distribution Pie Chart** - Student grade ranges
- 📈 **Assessment Trend Line Chart** - Class average over time
- 🔄 **Course Selector** - Switch between courses

#### Upload Marks (`/teacher/upload`)
- 📤 Excel/CSV file upload
- 📋 Drag & drop interface (React Dropzone)
- ✅ File validation
- 📊 Automated CO/PO calculation trigger

### Student Portal

#### Dashboard (`/student/dashboard`)
- 📚 Enrolled courses with beautiful cards
- 🎨 Color-coded course cards
- 📊 Quick stats overview
- 🔗 One-click navigation to course analytics
- 👤 User profile with avatar

#### Course Analytics (`/student/courses/:courseId/analytics`)
- 📊 **Performance Overview Cards**
  - Your average vs class average
  - Your rank in class
  - Total assessments
- 📈 **CO Performance Bar Chart** - Your scores per course outcome
- 🎯 **PO Attainment Radar Chart** - Program outcome contribution
- 📈 **Assessment Trend Line Chart** - Your performance over time
- 📋 **Detailed CO Performance Table** - With progress bars
- 🏆 **Color-coded performance indicators**

---

## File Structure

```
edu-frontend/
├── public/
├── src/
│   ├── components/
│   │   └── shared/
│   │       ├── ProtectedRoute.jsx      # Route guard
│   │       ├── PageLayout.jsx          # Page wrapper
│   │       ├── Loading.jsx             # Loaders & skeletons
│   │       ├── ErrorState.jsx          # Error displays
│   │       └── StatsCard.jsx           # Reusable stat card
│   ├── contexts/
│   │   └── AuthContext.jsx             # Authentication context
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── teacher/
│   │   │   ├── Dashboard.jsx           # Teacher dashboard
│   │   │   ├── Courses.jsx             # Course CRUD
│   │   │   ├── CourseDetail.jsx        # Course details
│   │   │   ├── Analytics.jsx           # Analytics dashboard
│   │   │   └── UploadMarks.jsx         # Upload interface
│   │   └── student/
│   │       ├── DashboardEnhanced.jsx   # Student dashboard
│   │       └── CourseAnalytics.jsx     # Course analytics
│   ├── services/
│   │   └── api.js                      # Axios API client
│   ├── store/
│   │   └── useStore.js                 # Zustand store
│   ├── App.jsx                         # Main app component
│   ├── main.jsx                        # Entry point
│   └── index.css                       # Global styles
├── .env
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

---

## Pages & Components

### Shared Components

#### `PageLayout`
Consistent page structure with header, breadcrumbs, and actions.

```jsx
<PageLayout
  title="My Courses"
  subtitle="Manage your courses"
  icon={School}
  breadcrumbs={[
    { label: 'Dashboard', to: '/teacher/dashboard' },
    { label: 'Courses' }
  ]}
  actions={<Button>Create Course</Button>}
>
  {/* Page content */}
</PageLayout>
```

#### `StatsCard`
Reusable statistics card with icon and optional trend.

```jsx
<StatsCard
  title="Total Students"
  value={120}
  icon={People}
  color="success.main"
  bgColor="success.light"
  trend={{ value: '+12%', label: 'from last month', isPositive: true }}
/>
```

#### `Loading Components`
- `PageLoader` - Full page loading spinner
- `InlineLoader` - Inline loading indicator
- `CardSkeleton` - Skeleton card loader
- `StatsSkeleton` - Stats grid skeleton

#### `ErrorState`
- `ErrorState` - Generic error display with retry
- `EmptyState` - Empty data display
- `NetworkError` - Connection error
- `NotFound` - 404 page

### Teacher Components

#### Dashboard
- Stats overview (4 cards)
- Quick navigation buttons
- Recent activity list
- Animated card transitions

#### Courses
- Grid layout with course cards
- Color-gradient headers
- Course metadata display
- CRUD dialog forms
- Context menu for actions

#### Analytics
- Course selector dropdown
- Multiple chart types:
  - Bar charts (CO/PO attainment)
  - Pie chart (grade distribution)
  - Line chart (assessment trend)
- Performance summary chips

### Student Components

#### Dashboard
- Top navigation bar
- Welcome section
- Stats grid (4 cards)
- Course cards grid
- Click-through to analytics

#### Course Analytics
- Breadcrumb navigation
- Performance stats (4 cards)
- Interactive charts:
  - CO performance (Bar)
  - PO attainment (Radar)
  - Assessment trend (Line)
- Detailed CO table with progress bars

---

## State Management

### Zustand Store (`useStore.js`)

```javascript
const useStore = create(
  persist(
    (set, get) => ({
      // User State
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null, token: null }),

      // Courses Cache
      coursesCache: null,
      setCourses: (courses) => set({ coursesCache: courses }),
      isCoursesCacheStale: () => { /* ... */ },

      // Analytics Cache
      analyticsCache: {},
      setAnalytics: (courseId, data) => { /* ... */ },

      // UI Preferences
      theme: 'light',
      sidebarOpen: true,
    }),
    { name: 'obe-storage', storage: localStorage }
  )
);
```

**Usage:**
```javascript
const { user, setUser } = useStore();
```

---

## Routing

### Route Structure

```jsx
<Routes>
  {/* Public */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Teacher Protected */}
  <Route path="/teacher/*" element={<ProtectedRoute requiredRole="teacher" />}>
    <Route path="dashboard" element={<TeacherDashboard />} />
    <Route path="courses" element={<TeacherCourses />} />
    <Route path="courses/:id" element={<CourseDetail />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="upload" element={<UploadMarks />} />
  </Route>

  {/* Student Protected */}
  <Route path="/student/*" element={<ProtectedRoute requiredRole="student" />}>
    <Route path="dashboard" element={<StudentDashboard />} />
    <Route path="courses/:courseId/analytics" element={<CourseAnalytics />} />
  </Route>

  {/* Fallback */}
  <Route path="/" element={<Navigate to="/login" />} />
</Routes>
```

### Protected Routes

```jsx
const ProtectedRoute = ({ requiredRole }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};
```

---

## UI/UX Design

### Color Palette

```javascript
palette: {
  primary: { main: '#2563eb', light: '#60a5fa', dark: '#1e40af' },
  secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' },
  success: { main: '#10b981' },
  error: { main: '#ef4444' },
  warning: { main: '#f59e0b' },
  info: { main: '#06b6d4' },
  background: { default: '#f8fafc', paper: '#ffffff' }
}
```

### Typography

- **Font Family:** Inter, Roboto, Helvetica, Arial
- **Headings:** Bold (600-700 weight)
- **Body:** Regular (400 weight)

### Animations

**Framer Motion Patterns:**

```jsx
// Page entry
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Card hover
<motion.div whileHover={{ scale: 1.03, y: -4 }}>

// Staggered list
{items.map((item, i) => (
  <motion.div
    key={i}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.1 }}
  />
))}
```

### Responsive Breakpoints

- **xs:** 0px - 599px (mobile)
- **sm:** 600px - 899px (tablet)
- **md:** 900px - 1199px (small desktop)
- **lg:** 1200px - 1535px (desktop)
- **xl:** 1536px+ (large desktop)

### Card Designs

**Gradient Headers:**
```jsx
background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
```

**Shadow Elevation:**
```jsx
boxShadow: '0 2px 12px rgba(0,0,0,0.08)'  // Default
boxShadow: '0 8px 24px rgba(0,0,0,0.15)'  // Hover
```

**Border Radius:**
- Cards: `12px`
- Buttons: `8px`
- Chips: `16px`

---

## Setup & Configuration

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. **Clone and Install:**
```bash
cd edu-frontend
npm install
```

2. **Configure Environment:**
```bash
cp .env.example .env
# Edit VITE_API_URL
```

3. **Start Development Server:**
```bash
npm run dev
```

4. **Build for Production:**
```bash
npm run build
npm run preview  # Preview build
```

---

## Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api

# Optional: Analytics
VITE_ENABLE_ANALYTICS=false
```

---

## API Integration

### Axios Configuration (`services/api.js`)

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Services

```javascript
// Course APIs
export const courseAPI = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  getAnalytics: (id) => api.get(`/courses/${id}/analytics`)
};

// Student APIs
export const studentAPI = {
  getCourses: () => api.get('/students/courses'),
  getAnalytics: (courseId) => api.get(`/students/courses/${courseId}/analytics`)
};
```

---

## Chart Configuration

### Recharts Integration

**Bar Chart Example:**
```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
    <XAxis dataKey="co" stroke="#666" />
    <YAxis stroke="#666" domain={[0, 100]} />
    <Tooltip
      contentStyle={{
        borderRadius: 8,
        border: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    />
    <Legend />
    <Bar dataKey="performance" fill="#2563eb" radius={[8, 8, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

**Radar Chart Example:**
```jsx
<RadarChart data={poData}>
  <PolarGrid stroke="#e0e0e0" />
  <PolarAngleAxis dataKey="po" />
  <PolarRadiusAxis angle={90} domain={[0, 100]} />
  <Radar
    dataKey="attainment"
    stroke="#7c3aed"
    fill="#7c3aed"
    fillOpacity={0.6}
  />
</RadarChart>
```

---

## Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` folder

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

### Nginx Configuration

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://backend:8080;
  }
}
```

---

## Performance Optimization

### Implemented Optimizations
- ✅ Code splitting with React.lazy
- ✅ Memoization with useMemo/useCallback
- ✅ Virtualization for long lists
- ✅ Image lazy loading
- ✅ Bundle size optimization
- ✅ Caching with Zustand

### Best Practices
- Use functional components
- Avoid inline functions in JSX
- Debounce search inputs
- Lazy load charts
- Minimize re-renders

---

## Testing

```bash
# Run tests (if configured)
npm test

# Lint code
npm run lint
```

---

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile: iOS 12+, Android 8+

---

## Support & Contribution

For issues or contributions, contact the development team.

**Last Updated:** November 2025
**Version:** 1.0.0
