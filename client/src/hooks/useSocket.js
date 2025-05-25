import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef;
}; 