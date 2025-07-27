const firebaseService = require('./firebaseService');
const { callGemini } = require('../client/geminiClient');

class CorrelationService {
    constructor() {
        this.amountTolerance = 0.05; // 5% tolerance for amount matching
        this.timeWindowHours = 1; // 1 hour time window
        this.timeWindowDays = 1; // 1 day window if only date available
    }

    /**
     * Find and merge potential duplicate/related transactions
     */
    async findCorrelations(newTransaction, userId, inputData) {
        try {
            console.log(`🔍 Finding correlations for transaction: ${newTransaction.merchant} - ₹${newTransaction.amount}`);

            // Get potential matches from recent transactions
            const potentialMatches = await this.findPotentialMatches(newTransaction, userId);

            if (potentialMatches.length === 0) {
                console.log('📝 No potential matches found');
                return null;
            }

            console.log(`🔍 Found ${potentialMatches.length} potential matches`);

            // Analyze all potential matches with Gemini in a single call
            const correlationAnalysis = await this.analyzeMultipleCorrelationsWithGemini(newTransaction, potentialMatches);

            // Find the best correlation
            let bestMatch = null;
            let bestConfidence = 0;

            for (let i = 0; i < potentialMatches.length; i++) {
                const analysis = correlationAnalysis.correlations[i];
                if (analysis && analysis.is_correlated && analysis.confidence > bestConfidence) {
                    bestMatch = {
                        transaction: potentialMatches[i],
                        analysis: analysis
                    };
                    bestConfidence = analysis.confidence;
                }
            }

            if (bestMatch && bestConfidence >= 70) { // High confidence threshold
                console.log(`✅ Found strong correlation: ${bestMatch.analysis.correlation_type} (${bestConfidence}% confidence)`);

                // Merge the transactions instead of creating new one
                await this.mergeTransactions(bestMatch.transaction, newTransaction, inputData, bestMatch.analysis);

                return {
                    action: 'merged',
                    existing_transaction_id: bestMatch.transaction.id,
                    confidence: bestConfidence,
                    correlation_type: bestMatch.analysis.correlation_type
                };
            } else {
                console.log('📝 No strong correlations found - keeping as separate transaction');
                return null;
            }

        } catch (error) {
            console.error('❌ Error finding correlations:', error.message);
            return null;
        }
    }

    /**
     * Find potential matches based on amount, time, and basic criteria
     */
    async findPotentialMatches(newTransaction, userId) {
        try {
            const timeWindow = this.calculateTimeWindow(newTransaction.timestamp);

            // Get recent transactions within time window
            const recentTransactions = await firebaseService.getUserTransactions(userId, {
                startDate: timeWindow.start,
                endDate: timeWindow.end,
                limit: 50
            });

            const potentialMatches = [];

            for (const transaction of recentTransactions) {
                // Skip the same transaction
                if (transaction.id === newTransaction.id) {
                    continue;
                }

                // Check if already correlated
                if (transaction.correlation_id || newTransaction.correlation_id) {
                    continue;
                }

                // Amount matching with tolerance
                if (this.isAmountMatch(newTransaction.amount, transaction.amount)) {
                    // Time proximity check
                    if (this.isTimeMatch(newTransaction.timestamp, transaction.timestamp)) {
                        potentialMatches.push(transaction);
                    }
                }
            }

            return potentialMatches;

        } catch (error) {
            console.error('❌ Error finding potential matches:', error.message);
            return [];
        }
    }

    /**
     * Check if amounts match within tolerance
     */
    isAmountMatch(amount1, amount2) {
        const tolerance = Math.max(amount1, amount2) * this.amountTolerance;
        const difference = Math.abs(amount1 - amount2);
        return difference <= tolerance;
    }

    /**
     * Check if timestamps are within acceptable window
     */
    isTimeMatch(timestamp1, timestamp2) {
        const time1 = new Date(timestamp1);
        const time2 = new Date(timestamp2);

        // If we have precise timestamps, use hour window
        if (this.hasPreciseTime(timestamp1) && this.hasPreciseTime(timestamp2)) {
            const diffHours = Math.abs(time1 - time2) / (1000 * 60 * 60);
            return diffHours <= this.timeWindowHours;
        } else {
            // If only dates available, use day window
            const diffDays = Math.abs(time1.getDate() - time2.getDate());
            return diffDays <= this.timeWindowDays;
        }
    }

    /**
     * Check if timestamp has precise time (not just date)
     */
    hasPreciseTime(timestamp) {
        const date = new Date(timestamp);
        return !(date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0);
    }

    /**
     * Calculate time window for searching
     */
    calculateTimeWindow(timestamp) {
        const baseTime = new Date(timestamp);
        const start = new Date(baseTime);
        const end = new Date(baseTime);

        if (this.hasPreciseTime(timestamp)) {
            // Use hour window
            start.setHours(start.getHours() - this.timeWindowHours);
            end.setHours(end.getHours() + this.timeWindowHours);
        } else {
            // Use day window
            start.setDate(start.getDate() - this.timeWindowDays);
            end.setDate(end.getDate() + this.timeWindowDays);
        }

        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }

    /**
     * Use Gemini to analyze multiple potential correlations in a single call
     */
    async analyzeMultipleCorrelationsWithGemini(newTransaction, potentialMatches) {
        try {
            // Build the prompt with the new transaction and all potential matches
            let prompt = `Analyze if the new transaction is correlated with any of the existing transactions (same purchase from different sources, duplicates, or related transactions):

NEW TRANSACTION:
- ID: new
- Merchant: ${newTransaction.merchant}
- Amount: ${newTransaction.currency || 'INR'} ${newTransaction.amount}
- Date: ${newTransaction.timestamp}
- Source: ${newTransaction.sources?.[0]?.input_type || 'unknown'}
- Items: ${JSON.stringify(newTransaction.items || [])}
- Category: ${newTransaction.category}

EXISTING TRANSACTIONS TO COMPARE:`;

            // Add each potential match
            potentialMatches.forEach((transaction, index) => {
                prompt += `

Transaction ${index + 1}:
- ID: ${transaction.id}
- Merchant: ${transaction.merchant}
- Amount: ${transaction.currency || 'INR'} ${transaction.amount}
- Date: ${transaction.timestamp}
- Source: ${transaction.sources?.[0]?.input_type || 'unknown'}
- Items: ${JSON.stringify(transaction.items || [])}
- Category: ${transaction.category}`;
            });

            prompt += `

Return ONLY a JSON object with analysis for each existing transaction:
{
  "correlations": [
    {
      "transaction_index": 1,
      "is_correlated": boolean,
      "confidence": number (0-100),
      "correlation_type": "duplicate|same_purchase|related|unrelated",
      "reason": "explanation of why they are/aren't correlated",
      "recommended_action": "merge|keep_separate|flag_for_review"
    },
    {
      "transaction_index": 2,
      "is_correlated": boolean,
      "confidence": number (0-100),
      "correlation_type": "duplicate|same_purchase|related|unrelated", 
      "reason": "explanation of why they are/aren't correlated",
      "recommended_action": "merge|keep_separate|flag_for_review"
    }
    // ... for each transaction
  ]
}

Examples of correlations:
- Same merchant, same amount, same day from email and SMS → duplicate (high confidence)
- Same merchant, same amount, different sources → same purchase (high confidence)
- Similar merchant names, same amount → likely same purchase (medium confidence)
- Different merchants, same amount, same time → possibly related like tip + main bill (low confidence)
- Same source, same details → duplicate from webhook firing twice (very high confidence)
- Completely different details → unrelated (very low confidence)`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await callGemini(contents, 'gemini-2.5-flash');

            return this.parseMultipleCorrelationResponse(response, potentialMatches.length);

        } catch (error) {
            console.error('❌ Gemini multiple correlation analysis error:', error.message);
            // Return default response for all matches
            return {
                correlations: potentialMatches.map((_, index) => ({
                    transaction_index: index + 1,
                    is_correlated: false,
                    confidence: 0,
                    correlation_type: 'unrelated',
                    reason: 'Analysis failed',
                    recommended_action: 'keep_separate'
                }))
            };
        }
    }

    /**
     * Use Gemini to analyze if two transactions are correlated
     */
    async analyzeCorrelationWithGemini(transaction1, transaction2) {
        try {
            const prompt = `Analyze if these two transactions are correlated (same purchase from different sources or duplicate entries):

Transaction 1:
- Merchant: ${transaction1.merchant}
- Amount: ${transaction1.currency || 'INR'} ${transaction1.amount}
- Date: ${transaction1.timestamp}
- Source: ${transaction1.sources?.[0]?.input_type || 'unknown'}
- Items: ${JSON.stringify(transaction1.items || [])}
- Category: ${transaction1.category}

Transaction 2:
- Merchant: ${transaction2.merchant}
- Amount: ${transaction2.currency || 'INR'} ${transaction2.amount}
- Date: ${transaction2.timestamp}
- Source: ${transaction2.sources?.[0]?.input_type || 'unknown'}
- Items: ${JSON.stringify(transaction2.items || [])}
- Category: ${transaction2.category}

Return ONLY a JSON object:
{
  "is_correlated": boolean,
  "confidence": number (0-100),
  "correlation_type": "duplicate|same_purchase|related|unrelated",
  "reason": "explanation of why they are/aren't correlated",
  "recommended_action": "merge|keep_separate|flag_for_review"
}

Examples:
- Same merchant, same amount, same day from email and SMS → duplicate
- Same merchant, same amount, different sources → same purchase
- Similar merchant names, same amount → likely same purchase
- Different merchants, same amount, same time → possibly related (like tip + main bill)
- Same source, same details → duplicate (email hook fired twice)`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await callGemini(contents, 'gemini-2.5-flash');

            return this.parseGeminiCorrelationResponse(response);

        } catch (error) {
            console.error('❌ Gemini correlation analysis error:', error.message);
            return {
                is_correlated: false,
                confidence: 0,
                correlation_type: 'unrelated',
                reason: 'Analysis failed',
                recommended_action: 'keep_separate'
            };
        }
    }

    /**
     * Parse Gemini response for multiple correlation analysis
     */
    parseMultipleCorrelationResponse(responseText, expectedCount) {
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

            // Ensure we have the expected number of correlations
            if (!analysis.correlations || !Array.isArray(analysis.correlations)) {
                analysis.correlations = [];
            }

            // Fill missing correlations with defaults
            while (analysis.correlations.length < expectedCount) {
                analysis.correlations.push({
                    transaction_index: analysis.correlations.length + 1,
                    is_correlated: false,
                    confidence: 0,
                    correlation_type: 'unrelated',
                    reason: 'No analysis provided',
                    recommended_action: 'keep_separate'
                });
            }

            // Set defaults for each correlation
            analysis.correlations.forEach(correlation => {
                correlation.is_correlated = correlation.is_correlated || false;
                correlation.confidence = correlation.confidence || 0;
                correlation.correlation_type = correlation.correlation_type || 'unrelated';
                correlation.recommended_action = correlation.recommended_action || 'keep_separate';
            });

            return analysis;

        } catch (error) {
            console.error('❌ Failed to parse Gemini multiple correlation response:', error.message);
            // Return default response for all matches
            return {
                correlations: Array.from({ length: expectedCount }, (_, index) => ({
                    transaction_index: index + 1,
                    is_correlated: false,
                    confidence: 0,
                    correlation_type: 'unrelated',
                    reason: 'Failed to parse analysis',
                    recommended_action: 'keep_separate'
                }))
            };
        }
    }

    /**
     * Parse Gemini response for correlation analysis
     */
    parseGeminiCorrelationResponse(responseText) {
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
            analysis.is_correlated = analysis.is_correlated || false;
            analysis.confidence = analysis.confidence || 0;
            analysis.correlation_type = analysis.correlation_type || 'unrelated';
            analysis.recommended_action = analysis.recommended_action || 'keep_separate';

            return analysis;

        } catch (error) {
            console.error('❌ Failed to parse Gemini correlation response:', error.message);
            return {
                is_correlated: false,
                confidence: 0,
                correlation_type: 'unrelated',
                reason: 'Failed to parse analysis',
                recommended_action: 'keep_separate'
            };
        }
    }

    /**
     * Create correlation record and handle the correlation
     */
    async createCorrelationRecord(newTransaction, correlations, userId) {
        try {
            const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Get the best correlation (highest confidence)
            const bestCorrelation = correlations.reduce((best, current) =>
                current.correlation.confidence > best.correlation.confidence ? current : best
            );

            const correlationData = {
                id: correlationId,
                userId: userId,
                primary_transaction_id: newTransaction.id,
                correlated_transactions: correlations.map(c => ({
                    transaction_id: c.transaction.id,
                    confidence: c.correlation.confidence,
                    correlation_type: c.correlation.correlation_type,
                    reason: c.correlation.reason
                })),
                best_match: {
                    transaction_id: bestCorrelation.transaction.id,
                    confidence: bestCorrelation.correlation.confidence,
                    correlation_type: bestCorrelation.correlation.correlation_type,
                    recommended_action: bestCorrelation.correlation.recommended_action
                },
                created_at: new Date().toISOString(),
                status: 'active'
            };

            // Save correlation record
            await this.saveCorrelationRecord(correlationData);

            // Update transaction records with correlation ID
            await this.updateTransactionsWithCorrelation(newTransaction.id, correlations, correlationId);

            // Handle the correlation based on recommendation
            await this.handleCorrelationAction(correlationData);

            console.log(`✅ Correlation created: ${correlationId}`);
            return correlationData;

        } catch (error) {
            console.error('❌ Error creating correlation record:', error.message);
            throw error;
        }
    }

    /**
     * Save correlation record to Firebase
     */
    async saveCorrelationRecord(correlationData) {
        try {
            const { addDoc, collection } = require('firebase/firestore');
            const docRef = await addDoc(collection(firebaseService.db, 'correlations'), correlationData);
            console.log(`💾 Correlation record saved: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error saving correlation record:', error.message);
            throw error;
        }
    }

    /**
     * Update transaction records with correlation ID
     */
    async updateTransactionsWithCorrelation(primaryTransactionId, correlations, correlationId) {
        try {
            // Update primary transaction
            await firebaseService.updateTransaction(primaryTransactionId, {
                correlation_id: correlationId,
                correlation_role: 'primary'
            });

            // Update correlated transactions
            for (const correlation of correlations) {
                await firebaseService.updateTransaction(correlation.transaction.id, {
                    correlation_id: correlationId,
                    correlation_role: 'correlated',
                    correlation_confidence: correlation.correlation.confidence
                });
            }

        } catch (error) {
            console.error('❌ Error updating transactions with correlation:', error.message);
            throw error;
        }
    }

    /**
     * Handle correlation action based on Gemini recommendation
     */
    async handleCorrelationAction(correlationData) {
        try {
            const action = correlationData.best_match.recommended_action;

            switch (action) {
                case 'merge':
                    console.log('🔄 Recommended action: MERGE transactions');
                    // In a real implementation, we might merge the transactions
                    // For now, just log and mark as merged
                    break;

                case 'flag_for_review':
                    console.log('🚩 Recommended action: FLAG for manual review');
                    // Create notification for manual review
                    break;

                case 'keep_separate':
                default:
                    console.log('📝 Recommended action: KEEP SEPARATE');
                    // Keep as separate transactions but linked via correlation
                    break;
            }

        } catch (error) {
            console.error('❌ Error handling correlation action:', error.message);
        }
    }

    /**
     * Merge new transaction data into existing transaction and delete the duplicate
     */
    async mergeTransactions(existingTransaction, newTransaction, inputData, analysis) {
        try {
            console.log(`🔄 Merging transactions: ${analysis.correlation_type}`);

            // Prepare merged data
            const mergedData = {
                // Add new source to existing sources
                sources: [
                    ...(existingTransaction.sources || []),
                    {
                        input_type: inputData.type,
                        uri: inputData.metadata?.uri || null,
                        added_at: new Date().toISOString()
                    }
                ],

                // Fill missing fields from new transaction
                merchant: existingTransaction.merchant || newTransaction.merchant,
                amount: existingTransaction.amount || newTransaction.amount,
                currency: existingTransaction.currency || newTransaction.currency,
                category: existingTransaction.category || newTransaction.category,

                // Merge items if available
                items: this.mergeItems(existingTransaction.items, newTransaction.items),

                // Use more precise timestamp if available
                timestamp: this.chooseBetterTimestamp(existingTransaction.timestamp, newTransaction.timestamp),

                // Update metadata
                correlation_info: {
                    merged_at: new Date().toISOString(),
                    correlation_type: analysis.correlation_type,
                    confidence: analysis.confidence,
                    reason: analysis.reason,
                    merged_transaction_id: newTransaction.id || 'unknown'
                },

                updated_at: new Date().toISOString()
            };

            // Update the existing transaction
            console.log(`📝 Updating transaction: ${existingTransaction.id}`);
            await firebaseService.updateTransaction(existingTransaction.id, mergedData);

            // Delete the duplicate transaction if ID exists
            if (newTransaction && newTransaction.id) {
                console.log(`🗑️ Deleting duplicate transaction: ${newTransaction.id}`);
                await this.deleteDuplicateTransaction(newTransaction.id);
            } else {
                console.log('⚠️ No transaction ID to delete');
            }

            console.log(`✅ Transaction merged successfully: ${existingTransaction.id}`);
            return existingTransaction.id;

        } catch (error) {
            console.error('❌ Error merging transactions:', error.message);
            throw error;
        }
    }

    /**
     * Delete a duplicate transaction after merging
     */
    async deleteDuplicateTransaction(transactionId) {
        try {
            // Hard delete the duplicate transaction
            const { doc, deleteDoc } = require('firebase/firestore');
            const docRef = doc(firebaseService.db, 'transactions', transactionId);

            await deleteDoc(docRef);

            console.log(`✅ Duplicate transaction deleted: ${transactionId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting duplicate transaction: ${error.message}`);
            throw error;
        }
    }

    /**
     * Merge items from two transactions
     */
    mergeItems(existingItems, newItems) {
        if (!existingItems || existingItems.length === 0) return newItems || [];
        if (!newItems || newItems.length === 0) return existingItems;

        // Simple merge - combine unique items
        const merged = [...existingItems];

        for (const newItem of newItems) {
            const exists = merged.find(item =>
                item.name?.toLowerCase() === newItem.name?.toLowerCase()
            );
            if (!exists) {
                merged.push(newItem);
            }
        }

        return merged;
    }

    /**
     * Choose the better timestamp (more precise one)
     */
    chooseBetterTimestamp(existing, newTimestamp) {
        if (!existing) return newTimestamp;
        if (!newTimestamp) return existing;

        // Prefer timestamp with more precision (has time, not just date)
        if (this.hasPreciseTime(newTimestamp) && !this.hasPreciseTime(existing)) {
            return newTimestamp;
        }

        return existing; // Keep existing by default
    }

    /**
     * Get correlations for a user
     */
    async getUserCorrelations(userId, filters = {}) {
        try {
            let query = firebaseService.db.collection('correlations')
                .where('userId', '==', userId);

            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }

            query = query.orderBy('created_at', 'desc');

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const snapshot = await query.get();
            const correlations = [];

            snapshot.forEach(doc => {
                correlations.push({ id: doc.id, ...doc.data() });
            });

            return correlations;

        } catch (error) {
            console.error('❌ Error getting user correlations:', error.message);
            throw new Error(`Failed to get correlations: ${error.message}`);
        }
    }
}

module.exports = new CorrelationService();
