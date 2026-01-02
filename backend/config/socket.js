import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, decoded) => {
        if (err) {
          return next(new Error('Invalid or expired token'));
        }

        // Attach user info to socket
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userName = decoded.name;
        socket.userEmail = decoded.email;
        socket.userUsn = decoded.usn;

        next();
      });
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);

    // Join course room
    socket.on('join-course', (courseId) => {
      socket.join(`course-${courseId}`);
      console.log(`👤 ${socket.userName} joined course-${courseId}`);

      // Notify others in the room
      socket.to(`course-${courseId}`).emit('user-joined', {
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole
      });
    });

    // Leave course room
    socket.on('leave-course', (courseId) => {
      socket.leave(`course-${courseId}`);
      console.log(`👋 ${socket.userName} left course-${courseId}`);

      // Notify others in the room
      socket.to(`course-${courseId}`).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} - Socket ID: ${socket.id}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.io server initialized');
  return io;
};

// Get Socket.io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Emit event to course room
export const emitToCourse = (courseId, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized - skipping emit');
    return;
  }
  try {
    io.to(`course-${courseId}`).emit(event, data);
  } catch (error) {
    console.error('Error emitting to course:', error);
  }
};

// Emit event to specific user
export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized - skipping emit');
    return;
  }
  try {
    io.to(userId).emit(event, data);
  } catch (error) {
    console.error('Error emitting to user:', error);
  }
};

export default { initializeSocket, getIO, emitToCourse, emitToUser };
