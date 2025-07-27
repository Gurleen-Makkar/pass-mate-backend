const express = require('express');
const reminderService = require('../services/reminderService');

const router = express.Router();

/**
 * Get user's reminders
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.uid || 'demo-user';
        const filters = {
            limit: parseInt(req.query.limit) || 50,
            reminder_type: req.query.type || undefined
        };

        const result = await reminderService.getUserReminders(userId, filters);
        
        res.json({
            success: true,
            message: 'Reminders fetched successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Get reminders error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
            message: error.message
        });
    }
});

/**
 * Get due reminders
 */
router.get('/due', async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 7;
        const dueReminders = await reminderService.getDueReminders(daysAhead);
        
        res.json({
            success: true,
            message: `Found ${dueReminders.length} due reminders`,
            data: {
                reminders: dueReminders,
                count: dueReminders.length,
                days_ahead: daysAhead
            }
        });

    } catch (error) {
        console.error('❌ Get due reminders error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch due reminders',
            message: error.message
        });
    }
});

/**
 * Send reminder notifications manually
 */
router.post('/send-notifications', async (req, res) => {
    try {
        const sentCount = await reminderService.sendReminderNotifications();
        
        res.json({
            success: true,
            message: `Sent ${sentCount} reminder notifications`,
            data: {
                notifications_sent: sentCount
            }
        });

    } catch (error) {
        console.error('❌ Send notifications error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to send notifications',
            message: error.message
        });
    }
});

/**
 * Update reminder after payment
 */
router.post('/:reminderId/payment', async (req, res) => {
    try {
        const { reminderId } = req.params;
        const { amount, date } = req.body;

        if (!amount || !date) {
            return res.status(400).json({
                success: false,
                error: 'Amount and date are required'
            });
        }

        const updated = await reminderService.updateReminderAfterPayment(
            reminderId, 
            amount, 
            date
        );

        if (updated) {
            res.json({
                success: true,
                message: 'Reminder updated successfully',
                data: { reminder_id: reminderId }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Reminder not found or update failed'
            });
        }

    } catch (error) {
        console.error('❌ Update reminder error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to update reminder',
            message: error.message
        });
    }
});

module.exports = router;
