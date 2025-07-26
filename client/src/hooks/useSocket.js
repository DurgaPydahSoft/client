import { useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;

export const useSocket = (token) => {
  const socketRef = useRef(null);

  // iOS/Safari detection - memoized to prevent unnecessary re-renders
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), []);
  const isSafari = useMemo(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);
  const isIOSSafari = useMemo(() => isSafari && isIOS, [isSafari, isIOS]);
  const isIOSChrome = useMemo(() => /CriOS/.test(navigator.userAgent), []);

  useEffect(() => {
    if (!token) return;

    // iOS-specific socket configuration
    const socketConfig = {
      auth: { token },
      transports: (isIOS || isIOSSafari) ? ['polling'] : ['websocket', 'polling'], // Use polling only for iOS
      reconnection: true,
      reconnectionAttempts: (isIOS || isIOSSafari) ? 3 : 5, // Fewer attempts for iOS
      reconnectionDelay: (isIOS || isIOSSafari) ? 2000 : 1000, // Longer delay for iOS
      withCredentials: true,
      path: '/socket.io',
      timeout: (isIOS || isIOSSafari) ? 45000 : 30000 // Longer timeout for iOS
    };

    console.log('🔌 Socket connection config:', { isIOS, isIOSSafari, isIOSChrome, ...socketConfig });

    const socket = io(SOCKET_URL, socketConfig);

    socket.on('connect', () => {
      console.log('🔌 Socket connected successfully to:', SOCKET_URL);
      if (isIOS || isIOSSafari || isIOSChrome) {
        console.log('🦁 iOS socket connection established');
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