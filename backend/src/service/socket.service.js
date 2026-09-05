import { Server } from 'socket.io';

let io = null;

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

/**
 * Initialize Socket.IO with HTTP Server
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev so socket connects reliably
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join tenant broad room
    socket.on('join:tenant', (tenantId) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
        console.log(`[Socket.IO] ${socket.id} joined tenant:${tenantId}`);
      }
    });

    // Join specific quotation room
    socket.on('join:quote', (quoteId) => {
      if (quoteId) {
        socket.join(`quote:${quoteId}`);
        console.log(`[Socket.IO] ${socket.id} joined quote:${quoteId}`);
      }
    });

    // Leave quotation room
    socket.on('leave:quote', (quoteId) => {
      if (quoteId) {
        socket.leave(`quote:${quoteId}`);
        console.log(`[Socket.IO] ${socket.id} left quote:${quoteId}`);
      }
    });

    // Join approvals room
    socket.on('join:approvals', (tenantId) => {
      if (tenantId) {
        socket.join(`approvals:${tenantId}`);
        console.log(`[Socket.IO] ${socket.id} joined approvals:${tenantId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Returns current Socket.io instance
 */
export function getIO() {
  return io;
}

/**
 * Emit quotation created event
 */
export function emitQuotationCreated(tenantId, quote) {
  if (!io) return;
  const payload = { quote, timestamp: new Date().toISOString() };
  if (tenantId) {
    io.to(`tenant:${tenantId}`).emit('quotation:created', payload);
  }
  io.emit('quotation:created', payload);
}

/**
 * Emit quotation updated event (status change, item edits, totals recalculated)
 */
export function emitQuotationUpdated(tenantId, quoteId, data = {}) {
  if (!io) return;
  const payload = { quoteId, ...data, timestamp: new Date().toISOString() };
  if (quoteId) {
    io.to(`quote:${quoteId}`).emit('quotation:updated', payload);
  }
  if (tenantId) {
    io.to(`tenant:${tenantId}`).emit('quotation:updated', payload);
    io.to(`approvals:${tenantId}`).emit('quotation:updated', payload);
  }
  io.emit('quotation:updated', payload);
}

/**
 * Emit negotiation thread update (customer note, staff counter, terms revised)
 */
export function emitNegotiationUpdated(tenantId, quoteId, data = {}) {
  if (!io) return;
  const payload = { quoteId, ...data, timestamp: new Date().toISOString() };
  if (quoteId) {
    io.to(`quote:${quoteId}`).emit('negotiation:updated', payload);
  }
  if (tenantId) {
    io.to(`tenant:${tenantId}`).emit('negotiation:updated', payload);
    io.to(`approvals:${tenantId}`).emit('negotiation:updated', payload);
  }
  io.emit('negotiation:updated', payload);
}

/**
 * Emit approval action update (endorsed, approved, rejected)
 */
export function emitApprovalUpdated(tenantId, quoteId, data = {}) {
  if (!io) return;
  const payload = { quoteId, ...data, timestamp: new Date().toISOString() };
  if (quoteId) {
    io.to(`quote:${quoteId}`).emit('approval:updated', payload);
  }
  if (tenantId) {
    io.to(`tenant:${tenantId}`).emit('approval:updated', payload);
    io.to(`approvals:${tenantId}`).emit('approval:updated', payload);
  }
  io.emit('approval:updated', payload);
}
