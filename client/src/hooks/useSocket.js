import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;

// Safari detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Safari-specific socket configuration
    const socketConfig = {
      auth: { token },
      transports: isSafari ? ['polling'] : ['websocket', 'polling'], // Use polling only for Safari
      reconnection: true,
      reconnectionAttempts: isSafari ? 3 : 5, // Fewer attempts for Safari
      reconnectionDelay: isSafari ? 2000 : 1000, // Longer delay for Safari
      withCredentials: true,
      path: '/socket.io',
      timeout: isSafari ? 45000 : 30000 // Longer timeout for Safari
    };

    console.log('🔌 Socket connection config:', { isSafari, ...socketConfig });

    const socket = io(SOCKET_URL, socketConfig);

    socket.on('connect', () => {
      console.log('🔌 Socket connected successfully to:', SOCKET_URL);
      if (isSafari) {
        console.log('🦁 Safari socket connection established');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
      if (isSafari) {
        console.log('🦁 Safari socket connection error - this is normal for Safari');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      if (isSafari) {
        console.log('🦁 Safari socket disconnected - this is normal for Safari');
      }
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket');
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  return socketRef;
}; 