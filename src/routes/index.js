const express = require('express');
const receiptRoutes = require('./receiptRoutes');
const reminderRoutes = require('./reminderRoutes');

const router = express.Router();

// API Routes
router.use('/receipts', receiptRoutes);
router.use('/reminders', reminderRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'running',
        websocket: 'active',
        timestamp: new Date().toISOString()
    });
});

// API info route
router.get('/', (req, res) => {
    res.json({
        message: '🚀 Project Raseed API',
        version: '1.0.0',
        endpoints: {
            receipts: {
                'POST /api/receipts/process': 'Process receipt (image, audio, or text)',
                'GET /api/receipts/transactions': 'Get user transactions',
                'GET /api/receipts/analytics': 'Get spending analytics'
            },
            health: {
                'GET /api/health': 'Health check'
            }
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
