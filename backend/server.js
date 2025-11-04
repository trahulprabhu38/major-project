import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection as testPostgres } from './config/db.js';
import { connectMongoDB } from './config/mongodb.js';

// Import routes
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assessmentRoutes from './routes/assessments.js';
import uploadRoutes from './routes/upload.js';
import studentRoutes from './routes/students.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OBE Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teacher', courseRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize databases and start server
const startServer = async () => {
  try {
    console.log('\n🚀 Starting OBE Backend Server...\n');

    // Test PostgreSQL connection
    console.log('📊 Connecting to PostgreSQL...');
    const pgConnected = await testPostgres();

    if (!pgConnected) {
      console.error('❌ Failed to connect to PostgreSQL');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('\n📊 Connecting to MongoDB...');
    const mongoConnected = await connectMongoDB();

    if (!mongoConnected) {
      console.error('❌ Failed to connect to MongoDB');
      process.exit(1);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n✅ Server is running!');
      console.log(`🌐 API: http://localhost:${PORT}`);
      console.log(`📝 Health Check: http://localhost:${PORT}/health`);
      console.log(`\n📚 Available Routes:`);
      console.log(`   - POST   /api/auth/register`);
      console.log(`   - POST   /api/auth/login`);
      console.log(`   - GET    /api/auth/profile`);
      console.log(`   - GET    /api/courses`);
      console.log(`   - POST   /api/courses`);
      console.log(`   - GET    /api/courses/:id`);
      console.log(`   - POST   /api/assessments`);
      console.log(`   - POST   /api/upload/assessment`);
      console.log(`   - GET    /api/upload/template`);
      console.log(`   - GET    /api/students/courses`);
      console.log(`   - GET    /api/students/courses/:courseId/analytics`);
      console.log(`\n🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
