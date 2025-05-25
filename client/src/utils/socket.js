import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://hostel-complaint-backend.onrender.com';

// Create socket instance
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false, // Don't connect automatically
  withCredentials: true,
  path: '/socket.io',
  extraHeaders: {
    'Access-Control-Allow-Origin': '*'
  }
});

// Socket event handlers
socket.on('connect', () => {
  console.log('Socket connected successfully to:', SOCKET_URL);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// Function to connect socket with auth token
export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

// Function to disconnect socket
export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket; 