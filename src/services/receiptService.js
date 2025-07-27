const geminiService = require('./geminiService');
const firebaseService = require('./firebaseService');
const reminderService = require('./reminderService');
const correlationService = require('./correlationService');
const walletService = require('./walletService');

class ReceiptService {
    async processReceipt(inputData, userId) {
        try {
            console.log(`📄 Processing ${inputData.type} receipt for user: ${userId}`);

            // Process with Gemini
            const processedData = await geminiService.processExpenseInput(inputData);

            // Handle different action types
            if (processedData.action_type === 'deletion') {
                return await this.handleDeletion(processedData, userId);
            }

            if (processedData.action_type === 'query') {
                return await this.handleQuery(processedData, userId);
            }

            // Handle expense creation
            if (processedData.expense_detected && processedData.amount > 0) {
                // First check for correlations with existing transactions
                const tempTransaction = {
                    merchant: processedData.merchant,
                    amount: processedData.amount,
                    currency: processedData.currency,
                    category: processedData.category,
                    timestamp: processedData.timestamp || new Date().toISOString(),
                    items: processedData.items || []
                };
                
                // Check for correlations before creating a new transaction
                const correlation = await correlationService.findCorrelations(tempTransaction, userId, inputData);
                
                if (correlation && correlation.action === 'merged') {
                    // Transaction was merged with an existing one, no need to create a new one
                    console.log(`✅ Transaction merged with existing: ${correlation.existing_transaction_id}`);
                    
                    return {
                        success: true,
                        action_type: 'expense_merged',
                        transaction_id: correlation.existing_transaction_id,
                        correlation: correlation,
                        processed_data: processedData
                    };
                }
                
                // No correlation found, create a new transaction
                const transactionId = await this.createTransaction(processedData, userId, inputData);
                
                // Trigger background processes (async)
                this.triggerBackgroundProcesses(transactionId, processedData, userId, inputData);

                return {
                    success: true,
                    action_type: 'expense_created',
                    transaction_id: transactionId,
                    processed_data: processedData
                };
            } else {
                return {
                    success: true,
                    action_type: 'no_expense',
                    processed_data: processedData
                };
            }

        } catch (error) {
            console.error('❌ Receipt processing error:', error.message);
            throw new Error(`Failed to process receipt: ${error.message}`);
        }
    }

    async createTransaction(processedData, userId, inputData) {
        try {
            // Prepare transaction data
            const transactionData = {
                userId: userId,
                merchant: processedData.merchant || 'Unknown Merchant',
                amount: processedData.amount,
                currency: processedData.currency || 'INR',
                category: processedData.category || 'other',
                items: processedData.items || [],
                timestamp: processedData.timestamp || new Date().toISOString(),
                location: processedData.location || inputData.metadata?.location || null,
                sources: [{
                    input_type: inputData.type,
                    uri: inputData.metadata?.uri || null
                }],
                action_type: processedData.action_type || 'expense',
                wallet_pass_id: null,
                wallet_pass_url: null,
                trip_id: null
            };

            // Create Google Wallet pass if configured
            try {
                if (walletService.isConfigured()) {
                    console.log('📱 Creating Google Wallet pass...');
                    const walletPass = await walletService.createPassObject(transactionData, userId);
                    
                    if (walletPass) {
                        transactionData.wallet_pass_id = walletPass.objectId;
                        transactionData.wallet_pass_url = walletPass.saveUrl;
                        console.log('✅ Wallet pass created and linked to transaction');
                    }
                } else {
                    console.log('⚠️ Google Wallet not configured - transaction created without pass');
                }
            } catch (walletError) {
                console.error('❌ Error creating wallet pass:', walletError.message);
                // Continue without wallet pass - don't fail the transaction
            }

            // Save to Firestore
            const transactionId = await firebaseService.saveTransaction(transactionData);
            
            console.log('✅ Transaction created successfully:', transactionId);
            return transactionId;

        } catch (error) {
            console.error('❌ Error creating transaction:', error.message);
            throw new Error(`Failed to create transaction: ${error.message}`);
        }
    }

    async handleDeletion(processedData, userId) {
        try {
            console.log('🗑️ Handling deletion request:', processedData.deletion_target);

            // Find transactions to delete based on deletion target
            const transactions = await firebaseService.getUserTransactions(userId, {
                limit: 10
            });

            let deletedCount = 0;
            const deletionTarget = processedData.deletion_target?.toLowerCase() || '';

            for (const transaction of transactions) {
                // Simple matching logic
                if (transaction.merchant?.toLowerCase().includes(deletionTarget) ||
                    transaction.category?.toLowerCase().includes(deletionTarget)) {
                    
                    await firebaseService.deleteTransaction(transaction.id, userId);
                    deletedCount++;
                    break; // Only delete first match for safety
                }
            }

            return {
                success: true,
                action_type: 'deletion',
                deleted_count: deletedCount,
                deletion_target: processedData.deletion_target
            };

        } catch (error) {
            console.error('❌ Deletion error:', error.message);
            throw new Error(`Failed to process deletion: ${error.message}`);
        }
    }

    async handleQuery(processedData, userId) {
        try {
            console.log('❓ Handling query request');

            // Get recent transactions
            const transactions = await firebaseService.getUserTransactions(userId, {
                limit: 20
            });

            // Get spending baseline
            const baseline = await firebaseService.getSpendingBaseline(userId);

            return {
                success: true,
                action_type: 'query',
                recent_transactions: transactions.slice(0, 5),
                spending_summary: {
                    total_transactions: baseline.total_transactions,
                    avg_amount: baseline.avg_amount,
                    total_amount: baseline.total_amount,
                    category_breakdown: baseline.category_spending
                },
                processed_query: processedData
            };

        } catch (error) {
            console.error('❌ Query error:', error.message);
            throw new Error(`Failed to process query: ${error.message}`);
        }
    }

    async triggerBackgroundProcesses(transactionId, processedData, userId, inputData) {
        try {
            console.log('🔄 Triggering background processes...');

            // Prepare transaction object for analysis
            const transaction = {
                id: transactionId,
                userId: userId,
                merchant: processedData.merchant,
                amount: processedData.amount,
                currency: processedData.currency,
                category: processedData.category,
                timestamp: processedData.timestamp || new Date().toISOString(),
                items: processedData.items || []
            };

            // Analyze for reminders (async) - pass original input data too
            this.analyzeForReminders(transaction, userId, inputData);

            // Analyze for correlations (async)
            this.analyzeForCorrelations(transaction, userId, inputData);

            // Other background processes
            console.log('📊 Would trigger anomaly detection for transaction:', transactionId);
            console.log('🔔 Would send notifications if needed');

        } catch (error) {
            console.error('❌ Background process error:', error.message);
            // Don't throw - background processes shouldn't fail main request
        }
    }

    async analyzeForReminders(transaction, userId, inputData) {
        try {
            console.log('⏰ Analyzing transaction for reminders...');
            
            // This runs asynchronously in the background
            const reminder = await reminderService.analyzeTransactionForReminders(transaction, userId, inputData);
            
            if (reminder) {
                console.log(`✅ Reminder created for ${transaction.merchant}: ${reminder.id}`);
            } else {
                console.log(`📝 No reminder needed for ${transaction.merchant}`);
            }

        } catch (error) {
            console.error('❌ Error analyzing for reminders:', error.message);
            // Don't throw - this is a background process
        }
    }

    async analyzeForCorrelations(transaction, userId, inputData) {
        try {
            console.log('🔗 Analyzing transaction for correlations...');
            
            // This runs asynchronously in the background
            const correlation = await correlationService.findCorrelations(transaction, userId, inputData);
            
            if (correlation) {
                if (correlation.action === 'merged') {
                    console.log(`✅ Transaction merged: ${correlation.correlation_type} (${correlation.confidence}% confidence)`);
                    console.log(`🔗 Merged into existing transaction: ${correlation.existing_transaction_id}`);
                } else {
                    console.log(`✅ Correlation found for ${transaction.merchant}: ${correlation.correlation_type} (${correlation.confidence}% confidence)`);
                }
            } else {
                console.log(`📝 No correlations found for ${transaction.merchant}`);
            }

            return correlation;

        } catch (error) {
            console.error('❌ Error analyzing for correlations:', error.message);
            // Don't throw - this is a background process
            return null;
        }
    }

    async getUserTransactions(userId, filters = {}) {
        try {
            const transactions = await firebaseService.getUserTransactions(userId, filters);
            return {
                success: true,
                transactions: transactions,
                count: transactions.length,
                filters: filters
            };
        } catch (error) {
            console.error('❌ Error fetching transactions:', error.message);
            throw new Error(`Failed to fetch transactions: ${error.message}`);
        }
    }

    async getSpendingAnalytics(userId, days = 30) {
        try {
            const baseline = await firebaseService.getSpendingBaseline(userId, days);
            const transactions = await firebaseService.getUserTransactions(userId, {
                limit: 100
            });

            // Calculate additional analytics
            const analytics = {
                baseline: baseline,
                recent_activity: {
                    last_transaction: transactions[0] || null,
                    transactions_this_week: this.getTransactionsThisWeek(transactions)
                },
                top_categories: this.getTopCategories(transactions),
                top_merchants: this.getTopMerchants(transactions)
            };

            return {
                success: true,
                analytics: analytics
            };

        } catch (error) {
            console.error('❌ Error fetching analytics:', error.message);
            throw new Error(`Failed to fetch analytics: ${error.message}`);
        }
    }

    getTransactionsThisWeek(transactions) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        return transactions.filter(t => {
            const transactionDate = new Date(t.timestamp);
            return transactionDate >= weekAgo;
        }).length;
    }

    getTopCategories(transactions) {
        const categoryTotals = {};
        transactions.forEach(t => {
            if (t.category) {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (t.amount || 0);
            }
        });

        return Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount }));
    }

    getTopMerchants(transactions) {
        const merchantTotals = {};
        transactions.forEach(t => {
            if (t.merchant) {
                merchantTotals[t.merchant] = (merchantTotals[t.merchant] || 0) + (t.amount || 0);
            }
        });

        return Object.entries(merchantTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([merchant, amount]) => ({ merchant, amount }));
    }
}

module.exports = new ReceiptService();
