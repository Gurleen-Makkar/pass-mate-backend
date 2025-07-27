const express = require('express');
const multer = require('multer');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and audio files
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/jpg',
            'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Receipt processing routes
router.post('/process', upload.single('file'), (req, res) => receiptController.processReceipt(req, res));

// Transaction management routes
router.get('/transactions', (req, res) => receiptController.getUserTransactions(req, res));
router.get('/analytics', (req, res) => receiptController.getSpendingAnalytics(req, res));

module.exports = router;
