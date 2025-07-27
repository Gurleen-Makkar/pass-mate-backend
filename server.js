const express = require('express');
const cors = require('cors');
const multer = require('multer');
const WebSocket = require('ws');
const cron = require('node-cron');
const http = require('http');
require('dotenv').config();

// Set NODE_TLS_REJECT_UNAUTHORIZED if needed (only for development/testing)
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const app = express();
const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Global WebSocket connections storage
global.wsConnections = new Map();

// WebSocket Server Setup
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const userId = url.searchParams.get('userId');

  if (userId) {
    global.wsConnections.set(userId, ws);
    console.log(`🔌 WebSocket connected for user: ${userId}`);
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message received:', data.type);

      // Handle different message types
      if (data.type === 'voice_input') {
        // Handle voice input (will implement in voice processing task)
        console.log('🎤 Voice input received');
      } else if (data.type === 'text_input') {
        // Handle text input
        console.log('💬 Text input received');
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (userId) {
      global.wsConnections.delete(userId);
      console.log(`🔌 WebSocket disconnected for user: ${userId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Import routes
const apiRoutes = require('./src/routes/index');

// Health check route (for Cloud Run)
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Pass Mate Backend API',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// API Routes
app.use('/api', apiRoutes);

// Webhook endpoints (placeholders for now)
app.post('/webhooks/calendar', (req, res) => {
  console.log('📅 Calendar webhook received');
  res.status(200).send('OK');
});

app.post('/webhooks/gmail', (req, res) => {
  console.log('📧 Gmail webhook received');
  res.status(200).send('OK');
});

app.post('/webhooks/sms', (req, res) => {
  console.log('📱 SMS webhook received');
  res.status(200).send('OK');
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Initialize cron jobs (placeholders for now)
function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...');

  // Flight price monitoring - every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('✈️ Running flight price monitoring...');
    // Will implement in flight monitoring task
  });

  // Health analysis - weekly on Monday 9 AM
  cron.schedule('0 9 * * 1', () => {
    console.log('🏥 Running weekly health analysis...');
    // Will implement in health analysis task
  });

  // Subscription reminders - daily at 10 AM
  cron.schedule('0 10 * * *', () => {
    console.log('🔔 Checking subscription reminders...');
    // Will implement in notification task
  });

  console.log('✅ Cron jobs initialized');
}

// Start server with both HTTP and WebSocket
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📱 Ready for hackathon development!`);

  // Initialize background services
  initializeCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 Server closed');
    process.exit(0);
  });
});

module.exports = app;
