const receiptService = require('../services/receiptService');

class ReceiptController {
    async processReceipt(req, res) {
        try {
            // Extract user ID from auth middleware
            const userId = req.user?.uid || 'demo-user';
            
            // Validate request
            const validation = this.validateReceiptRequest(req);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            // Prepare input data
            const inputData = await this.prepareInputData(req);
            
            // Process receipt via service
            const result = await receiptService.processReceipt(inputData, userId);
            
            // If wallet pass was created, get the transaction details to include pass info
            let walletPassInfo = null;
            if (result.transaction_id && result.action_type === 'expense_created') {
                try {
                    const transaction = await require('../services/firebaseService').getTransaction(result.transaction_id, userId);
                    if (transaction && transaction.wallet_pass_url) {
                        walletPassInfo = {
                            wallet_pass_url: transaction.wallet_pass_url,
                            wallet_pass_id: transaction.wallet_pass_id
                        };
                    }
                } catch (error) {
                    console.error('❌ Error fetching wallet pass info:', error.message);
                }
            }
            
            return res.json({
                success: true,
                message: this.getSuccessMessage(result.action_type),
                data: {
                    ...result,
                    wallet_pass: walletPassInfo
                }
            });

        } catch (error) {
            console.error('❌ Receipt controller error:', error.message);
            return this.handleError(error, res);
        }
    }

    async getUserTransactions(req, res) {
        try {
            const userId = req.user?.uid || 'demo-user';
            
            // Validate query parameters
            const filters = this.validateAndParseFilters(req.query);
            
            const result = await receiptService.getUserTransactions(userId, filters);
            
            return res.json({
                success: true,
                message: 'Transactions fetched successfully',
                data: result
            });

        } catch (error) {
            console.error('❌ Get transactions error:', error.message);
            return this.handleError(error, res);
        }
    }

    async getSpendingAnalytics(req, res) {
        try {
            const userId = req.user?.uid || 'demo-user';
            const days = this.validateDaysParameter(req.query.days);
            
            const result = await receiptService.getSpendingAnalytics(userId, days);
            
            return res.json({
                success: true,
                message: 'Analytics fetched successfully',
                data: result
            });

        } catch (error) {
            console.error('❌ Get analytics error:', error.message);
            return this.handleError(error, res);
        }
    }

    // ==================== VALIDATION METHODS ====================
    
    validateReceiptRequest(req) {
        const errors = [];
        const { type } = req.body;

        // Validate receipt type
        const validTypes = ['image', 'audio', 'text', 'email'];
        if (!type) {
            errors.push('Receipt type is required');
        } else if (!validTypes.includes(type)) {
            errors.push(`Invalid receipt type. Supported types: ${validTypes.join(', ')}`);
        }

        // Type-specific validation
        if (type === 'image' || type === 'audio') {
            if (!req.file) {
                errors.push(`${type} file is required`);
            } else {
                // File size validation (10MB limit)
                if (req.file.size > 10 * 1024 * 1024) {
                    errors.push('File size must be less than 10MB');
                }

                // File type validation
                if (type === 'image') {
                    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                    if (!validImageTypes.includes(req.file.mimetype)) {
                        errors.push('Invalid image format. Supported: JPEG, PNG');
                    }
                } else if (type === 'audio') {
                    const validAudioTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
                    if (!validAudioTypes.includes(req.file.mimetype)) {
                        errors.push('Invalid audio format. Supported: MP3, WAV, M4A');
                    }
                }
            }
        }

        if (type === 'text') {
            const { text } = req.body;
            if (!text || typeof text !== 'string') {
                errors.push('Text input is required');
            } else if (text.trim().length === 0) {
                errors.push('Text input cannot be empty');
            } else if (text.length > 1000) {
                errors.push('Text input must be less than 1000 characters');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateAndParseFilters(query) {
        const filters = {};
        
        // Category filter
        if (query.category) {
            const validCategories = ['food', 'shopping', 'transport', 'entertainment', 'other'];
            if (validCategories.includes(query.category)) {
                filters.category = query.category;
            }
        }

        // Date filters
        if (query.startDate) {
            const startDate = new Date(query.startDate);
            if (!isNaN(startDate.getTime())) {
                filters.startDate = startDate.toISOString();
            }
        }

        if (query.endDate) {
            const endDate = new Date(query.endDate);
            if (!isNaN(endDate.getTime())) {
                filters.endDate = endDate.toISOString();
            }
        }

        // Limit filter
        if (query.limit) {
            const limit = parseInt(query.limit);
            if (!isNaN(limit) && limit > 0 && limit <= 100) {
                filters.limit = limit;
            } else {
                filters.limit = 50; // Default
            }
        } else {
            filters.limit = 50; // Default
        }

        return filters;
    }

    validateDaysParameter(daysParam) {
        if (!daysParam) return 30; // Default

        const days = parseInt(daysParam);
        if (isNaN(days) || days < 1 || days > 365) {
            return 30; // Default if invalid
        }

        return days;
    }

    // ==================== INPUT PREPARATION ====================
    
    async prepareInputData(req) {
        const { type, metadata = {} } = req.body;
        
        let data;
        
        switch (type) {
            case 'image':
                data = {
                    base64: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    originalName: req.file.originalname
                };
                break;
                
            case 'audio':
                data = {
                    base64: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    originalName: req.file.originalname
                };
                break;
                
            case 'text':
                data = req.body.text.trim();
                break;
                
            case 'email':
                data = req.body.data;
                break;
                
            default:
                throw new Error(`Unsupported input type: ${type}`);
        }

        return {
            type: type,
            data: data,
            metadata: {
                ...metadata,
                location: metadata.location || null,
                timestamp: metadata.timestamp || new Date().toISOString(),
                uri: null // Could be set if file is stored
            }
        };
    }

    // ==================== ERROR HANDLING ====================
    
    handleError(error, res) {
        // Determine error type and status code
        let statusCode = 500;
        let errorType = 'internal_error';

        if (error.message.includes('Validation')) {
            statusCode = 400;
            errorType = 'validation_error';
        } else if (error.message.includes('not found')) {
            statusCode = 404;
            errorType = 'not_found';
        } else if (error.message.includes('Unauthorized')) {
            statusCode = 401;
            errorType = 'unauthorized';
        } else if (error.message.includes('Gemini API')) {
            statusCode = 503;
            errorType = 'service_unavailable';
        }

        return res.status(statusCode).json({
            success: false,
            error: errorType,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // ==================== HELPER METHODS ====================
    
    getSuccessMessage(actionType) {
        const messages = {
            'expense_created': 'Receipt processed and expense created successfully',
            'no_expense': 'Input processed but no expense detected',
            'deletion': 'Deletion request processed successfully',
            'query': 'Query processed successfully'
        };

        return messages[actionType] || 'Request processed successfully';
    }
}

module.exports = new ReceiptController();
