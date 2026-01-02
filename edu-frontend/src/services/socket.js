import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';

let socket = null;

/**
 * Initialize Socket.io connection with authentication
 */
export const initializeSocket = () => {
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    console.error('No authentication token found');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

/**
 * Get the current socket instance
 */
export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};

/**
 * Join a course room
 * @param {string} courseId - The course ID to join
 */
export const joinCourse = (courseId) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.emit('join-course', courseId);
    console.log(`Joined course room: course-${courseId}`);
  }
};

/**
 * Leave a course room
 * @param {string} courseId - The course ID to leave
 */
export const leaveCourse = (courseId) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.emit('leave-course', courseId);
    console.log(`Left course room: course-${courseId}`);
  }
};

/**
 * Listen for new messages
 * @param {function} callback - Callback function to handle new messages
 */
export const onNewMessage = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('new-message', callback);
  }
};

/**
 * Stop listening for new messages
 */
export const offNewMessage = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off('new-message');
  }
};

/**
 * Listen for material uploaded events
 * @param {function} callback - Callback function to handle material uploads
 */
export const onMaterialUploaded = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('material-uploaded', callback);
  }
};

/**
 * Stop listening for material uploaded events
 */
export const offMaterialUploaded = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off('material-uploaded');
  }
};

/**
 * Listen for material deleted events
 * @param {function} callback - Callback function to handle material deletions
 */
export const onMaterialDeleted = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('material-deleted', callback);
  }
};

/**
 * Stop listening for material deleted events
 */
export const offMaterialDeleted = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off('material-deleted');
  }
};

/**
 * Listen for folder created events
 * @param {function} callback - Callback function to handle folder creation
 */
export const onFolderCreated = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('folder-created', callback);
  }
};

/**
 * Stop listening for folder created events
 */
export const offFolderCreated = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off('folder-created');
  }
};

/**
 * Listen for folder deleted events
 * @param {function} callback - Callback function to handle folder deletion
 */
export const onFolderDeleted = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('folder-deleted', callback);
  }
};

/**
 * Stop listening for folder deleted events
 */
export const offFolderDeleted = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off('folder-deleted');
  }
};

/**
 * Listen for user joined events
 * @param {function} callback - Callback function to handle user joins
 */
export const onUserJoined = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('user-joined', callback);
  }
};

/**
 * Listen for user left events
 * @param {function} callback - Callback function to handle user leaves
 */
export const onUserLeft = (callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on('user-left', callback);
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinCourse,
  leaveCourse,
  onNewMessage,
  offNewMessage,
  onMaterialUploaded,
  offMaterialUploaded,
  onMaterialDeleted,
  offMaterialDeleted,
  onFolderCreated,
  offFolderCreated,
  onFolderDeleted,
  offFolderDeleted,
  onUserJoined,
  onUserLeft
};
