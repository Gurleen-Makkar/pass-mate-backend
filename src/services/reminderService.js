const firebaseService = require('./firebaseService');
const { callGemini } = require('../client/geminiClient');

class ReminderService {
    constructor() {
        this.reminderTypes = {
            SUBSCRIPTION: 'subscription',
            BILL: 'bill',
            RECURRING: 'recurring',
            ONE_TIME: 'one_time'
        };
    }

    /**
     * Analyze a transaction and create appropriate reminders
     */
    async analyzeTransactionForReminders(transaction, userId, inputData) {
        try {
            console.log(`⏰ Analyzing transaction for reminders: ${transaction.merchant}`);

            // Use Gemini to analyze if this transaction needs reminders
            const analysis = await this.analyzeWithGemini(transaction, inputData);
            
            if (analysis.needs_reminder) {
                const reminder = await this.createReminder(transaction, analysis, userId);
                console.log(`✅ Reminder created: ${reminder.id}`);
                return reminder;
            } else {
                console.log(`📝 No reminder needed for: ${transaction.merchant}`);
                return null;
            }

        } catch (error) {
            console.error('❌ Error analyzing transaction for reminders:', error.message);
            return null;
        }
    }

    /**
     * Use Gemini to analyze if transaction needs reminders
     */
    async analyzeWithGemini(transaction, inputData) {
        try {
            // Build context with original source data
            let sourceContext = '';
            
            switch (inputData.type) {
                case 'email':
                    sourceContext = `
Original Email:
Subject: ${inputData.data.subject}
From: ${inputData.data.sender}
Body: ${inputData.data.body}`;
                    break;
                    
                case 'text':
                    sourceContext = `
Original Text: ${inputData.data}`;
                    break;
                    
                case 'audio':
                    sourceContext = `
Original Audio Input: [Audio file processed]`;
                    break;
                    
                case 'image':
                    sourceContext = `
Original Image: [Receipt image processed]`;
                    break;
                    
                default:
                    sourceContext = `
Original Input: ${JSON.stringify(inputData.data, null, 2)}`;
            }

            const prompt = `Analyze this transaction and its original source to determine if it needs reminders:

Transaction: ${JSON.stringify(transaction, null, 2)}

${sourceContext}

Based on the original source content and transaction details, determine if this needs recurring reminders.

Return ONLY a JSON object:
{
  "needs_reminder": boolean,
  "reminder_type": "subscription|bill|recurring|one_time",
  "frequency": "monthly|yearly|weekly|quarterly|custom",
  "next_due_date": "YYYY-MM-DDTHH:MM:SSZ format" or null,
  "reminder_days_before": number (how many days before to remind),
  "confidence": number (0-100),
  "reason": "why this needs/doesn't need a reminder based on source content",
  "estimated_amount": number or null,
  "category": "subscription|utility|insurance|loan|other"
}

Examples:
- Email from Netflix about subscription → needs monthly reminder
- Email about electricity bill → needs monthly reminder  
- Insurance premium email → needs yearly reminder
- One-time purchase receipt → no reminder needed
- Apple subscription confirmation → needs monthly reminder
- SMS about loan EMI → needs monthly reminder`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await callGemini(contents, 'gemini-2.5-flash');

            return this.parseGeminiResponse(response);

        } catch (error) {
            console.error('❌ Gemini analysis error:', error.message);
            throw new Error(`Failed to analyze transaction for reminders: ${error.message}`);
        }
    }

    /**
     * Parse Gemini response for reminder analysis
     */
    parseGeminiResponse(responseText) {
        try {
            let jsonText = responseText.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            // Fix common JSON issues
            jsonText = jsonText.replace(/\n/g, ' ');
            jsonText = jsonText.replace(/,\s*}/g, '}');
            jsonText = jsonText.replace(/,\s*]/g, ']');

            const analysis = JSON.parse(jsonText);

            // Set defaults
            analysis.needs_reminder = analysis.needs_reminder || false;
            analysis.confidence = analysis.confidence || 0;
            analysis.reminder_days_before = analysis.reminder_days_before || 3;

            return analysis;

        } catch (error) {
            console.error('❌ Failed to parse Gemini response:', error.message);
            throw new Error('Invalid Gemini response format');
        }
    }

    /**
     * Create a reminder based on analysis
     */
    async createReminder(transaction, analysis, userId) {
        try {
            const reminderData = {
                userId: userId,
                transaction_id: transaction.id || null,
                merchant: transaction.merchant,
                amount: analysis.estimated_amount || transaction.amount,
                currency: transaction.currency || 'INR',
                category: analysis.category,
                reminder_type: analysis.reminder_type,
                frequency: analysis.frequency,
                next_due_date: analysis.next_due_date,
                reminder_days_before: analysis.reminder_days_before,
                confidence: analysis.confidence,
                reason: analysis.reason,
                status: 'active',
                reminder_sent: false,
                created_from_transaction: true,
                original_transaction_date: transaction.timestamp || new Date().toISOString()
            };

            const reminderId = await firebaseService.saveReminder(reminderData);
            
            return {
                id: reminderId,
                ...reminderData
            };

        } catch (error) {
            console.error('❌ Error creating reminder:', error.message);
            throw error;
        }
    }

    /**
     * Get due reminders (for cron job)
     */
    async getDueReminders(daysAhead = 7) {
        try {
            console.log(`⏰ Checking for reminders due in next ${daysAhead} days...`);

            const dueReminders = await firebaseService.getDueReminders(daysAhead);
            
            console.log(`📋 Found ${dueReminders.length} due reminders`);
            return dueReminders;

        } catch (error) {
            console.error('❌ Error getting due reminders:', error.message);
            return [];
        }
    }

    /**
     * Send reminder notifications
     */
    async sendReminderNotifications() {
        try {
            const dueReminders = await this.getDueReminders();
            
            for (const reminder of dueReminders) {
                await this.sendReminderNotification(reminder);
                
                // Mark as sent
                await firebaseService.updateReminder(reminder.id, {
                    reminder_sent: true,
                    last_reminder_sent: new Date().toISOString()
                });
            }

            console.log(`✅ Sent ${dueReminders.length} reminder notifications`);
            return dueReminders.length;

        } catch (error) {
            console.error('❌ Error sending reminder notifications:', error.message);
            return 0;
        }
    }

    /**
     * Send individual reminder notification
     */
    async sendReminderNotification(reminder) {
        try {
            console.log(`🔔 Sending reminder: ${reminder.merchant} - ₹${reminder.amount}`);

            // In a real implementation, this would send:
            // - Push notification
            // - Email
            // - SMS

            console.log(`📱 Reminder: ${reminder.merchant} payment of ₹${reminder.amount} is due on ${new Date(reminder.next_due_date).toLocaleDateString()}`);
            
            // Mock notification sending
            return {
                success: true,
                reminder_id: reminder.id,
                notification_sent: true,
                channels: ['console_log'] // In production: ['push', 'email', 'wallet']
            };

        } catch (error) {
            console.error('❌ Error sending reminder notification:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update reminder after payment
     */
    async updateReminderAfterPayment(reminderId, paidAmount, paidDate) {
        try {
            const reminder = await firebaseService.getReminder(reminderId);
            
            if (!reminder) {
                throw new Error('Reminder not found');
            }

            // Calculate next due date based on frequency
            const nextDueDate = this.calculateNextDueDate(paidDate, reminder.frequency);

            await firebaseService.updateReminder(reminderId, {
                last_paid_amount: paidAmount,
                last_paid_date: paidDate,
                next_due_date: nextDueDate,
                reminder_sent: false,
                payment_count: (reminder.payment_count || 0) + 1
            });

            console.log(`✅ Updated reminder for next payment: ${nextDueDate}`);
            return true;

        } catch (error) {
            console.error('❌ Error updating reminder after payment:', error.message);
            return false;
        }
    }

    /**
     * Calculate next due date based on frequency
     */
    calculateNextDueDate(currentDate, frequency) {
        const date = new Date(currentDate);

        switch (frequency) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1); // Default to monthly
        }

        return date.toISOString();
    }

    /**
     * Get user's active reminders
     */
    async getUserReminders(userId, filters = {}) {
        try {
            const reminders = await firebaseService.getUserReminders(userId, {
                status: 'active',
                ...filters
            });

            return {
                success: true,
                reminders: reminders,
                count: reminders.length
            };

        } catch (error) {
            console.error('❌ Error getting user reminders:', error.message);
            throw new Error(`Failed to get reminders: ${error.message}`);
        }
    }
}

module.exports = new ReminderService();
