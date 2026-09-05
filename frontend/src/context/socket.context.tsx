import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/hook/useAuth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinQuote: (quoteId: string) => void;
  leaveQuote: (quoteId: string) => void;
  joinApprovals: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinQuote: () => {},
  leaveQuote: () => {},
  joinApprovals: () => {},
});

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[Socket.IO Frontend] Connected to real-time server with ID:', newSocket.id);
      setIsConnected(true);

      if (user?.tenantId) {
        newSocket.emit('join:tenant', user.tenantId);
        newSocket.emit('join:approvals', user.tenantId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket.IO Frontend] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.IO Frontend] Connection error:', err.message);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // When user changes / logs in / loads session, join rooms
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && isConnected && user?.tenantId) {
      socket.emit('join:tenant', user.tenantId);
      socket.emit('join:approvals', user.tenantId);
      console.log('[Socket.IO Frontend] Joined tenant and approvals room for:', user.tenantId);
    }
  }, [user?.tenantId, isConnected]);

  const joinQuote = (quoteId: string) => {
    if (socketRef.current && quoteId) {
      socketRef.current.emit('join:quote', quoteId);
    }
  };

  const leaveQuote = (quoteId: string) => {
    if (socketRef.current && quoteId) {
      socketRef.current.emit('leave:quote', quoteId);
    }
  };

  const joinApprovals = () => {
    if (socketRef.current && user?.tenantId) {
      socketRef.current.emit('join:approvals', user.tenantId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinQuote,
        leaveQuote,
        joinApprovals,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
