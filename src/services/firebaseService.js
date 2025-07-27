const firebaseConfig = require('../config/firebase');
const {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit
} = require('firebase/firestore');

class FirebaseService {
    constructor() {
        this.db = firebaseConfig.getFirestore();
    }

    // ==================== TRANSACTIONS ====================
    async saveTransaction(transactionData) {
        try {
            console.log('💾 Saving transaction to Firestore...');

            const transaction = {
                ...transactionData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'active'
            };

            const docRef = await addDoc(collection(this.db, 'transactions'), transaction);

            console.log('✅ Transaction saved with ID:', docRef.id);
            return docRef.id;

        } catch (error) {
            console.error('❌ Error saving transaction:', error.message);
            throw new Error(`Failed to save transaction: ${error.message}`);
        }
    }

    async getUserTransactions(userId, filters = {}) {
        try {
            console.log(`📊 Fetching transactions for user: ${userId}`);

            // Build query constraints
            const constraints = [where('userId', '==', userId)];

            // Apply filters
            if (filters.category) {
                constraints.push(where('category', '==', filters.category));
            }

            if (filters.startDate) {
                constraints.push(where('timestamp', '>=', filters.startDate));
            }

            if (filters.endDate) {
                constraints.push(where('timestamp', '<=', filters.endDate));
            }

            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            } else {
                constraints.push(where('status', '==', 'active')); // Default to active
            }

            // Add ordering
            constraints.push(orderBy('timestamp', 'desc'));

            // Apply limit
            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            const q = query(collection(this.db, 'transactions'), ...constraints);
            const snapshot = await getDocs(q);
            const transactions = [];

            snapshot.forEach(doc => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ Found ${transactions.length} transactions`);
            return transactions;

        } catch (error) {
            console.error('❌ Error fetching transactions:', error.message);
            throw new Error(`Failed to fetch transactions: ${error.message}`);
        }
    }

    async updateTransaction(transactionId, updateData) {
        try {
            console.log(`📝 Updating transaction: ${transactionId}`);

            const docRef = doc(this.db, 'transactions', transactionId);
            await updateDoc(docRef, {
                ...updateData,
                updated_at: new Date().toISOString()
            });

            console.log('✅ Transaction updated successfully');
            return true;

        } catch (error) {
            console.error('❌ Error updating transaction:', error.message);
            throw new Error(`Failed to update transaction: ${error.message}`);
        }
    }

    async getTransaction(transactionId, userId) {
        try {
            console.log(`📖 Fetching transaction: ${transactionId}`);

            const docRef = doc(this.db, 'transactions', transactionId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Transaction not found');
            }

            const transaction = docSnap.data();
            if (transaction.userId !== userId) {
                throw new Error('Unauthorized to access this transaction');
            }

            return {
                id: docSnap.id,
                ...transaction
            };

        } catch (error) {
            console.error('❌ Error fetching transaction:', error.message);
            throw new Error(`Failed to fetch transaction: ${error.message}`);
        }
    }

    async deleteTransaction(transactionId, userId) {
        try {
            console.log(`🗑️ Deleting transaction: ${transactionId}`);

            // Verify ownership
            const docRef = doc(this.db, 'transactions', transactionId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Transaction not found');
            }

            const transaction = docSnap.data();
            if (transaction.userId !== userId) {
                throw new Error('Unauthorized to delete this transaction');
            }

            // Soft delete by updating status
            await this.updateTransaction(transactionId, { status: 'deleted' });

            console.log('✅ Transaction deleted successfully');
            return true;

        } catch (error) {
            console.error('❌ Error deleting transaction:', error.message);
            throw new Error(`Failed to delete transaction: ${error.message}`);
        }
    }

    // ==================== REMINDER METHODS ====================

    async saveReminder(reminderData) {
        try {
            console.log('💾 Saving reminder to Firestore...');
            
            const docRef = await addDoc(collection(this.db, 'reminders'), {
                ...reminderData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            console.log(`✅ Reminder saved with ID: ${docRef.id}`);
            return docRef.id;

        } catch (error) {
            console.error('❌ Error saving reminder:', error.message);
            throw new Error(`Failed to save reminder: ${error.message}`);
        }
    }

    async getReminder(reminderId) {
        try {
            const docRef = doc(this.db, 'reminders', reminderId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                return null;
            }

            return { id: docSnap.id, ...docSnap.data() };

        } catch (error) {
            console.error('❌ Error getting reminder:', error.message);
            throw new Error(`Failed to get reminder: ${error.message}`);
        }
    }

    async updateReminder(reminderId, updateData) {
        try {
            const docRef = doc(this.db, 'reminders', reminderId);
            await updateDoc(docRef, {
                ...updateData,
                updated_at: new Date().toISOString()
            });

            console.log(`✅ Reminder updated: ${reminderId}`);
            return true;

        } catch (error) {
            console.error('❌ Error updating reminder:', error.message);
            throw new Error(`Failed to update reminder: ${error.message}`);
        }
    }

    async getUserReminders(userId, filters = {}) {
        try {
            // Simple query without complex ordering for now
            const constraints = [where('userId', '==', userId)];

            // Apply basic filters
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }

            // Apply limit
            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            const q = query(collection(this.db, 'reminders'), ...constraints);
            const snapshot = await getDocs(q);
            const reminders = [];

            snapshot.forEach(doc => {
                reminders.push({ id: doc.id, ...doc.data() });
            });

            return reminders;

        } catch (error) {
            console.error('❌ Error getting user reminders:', error.message);
            throw new Error(`Failed to get user reminders: ${error.message}`);
        }
    }

    async getDueReminders(daysAhead = 7) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            // Simple query to get all active reminders
            const constraints = [
                where('status', '==', 'active'),
                where('reminder_sent', '==', false)
            ];

            const q = query(collection(this.db, 'reminders'), ...constraints);
            const snapshot = await getDocs(q);
            const reminders = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const dueDate = new Date(data.next_due_date);
                
                // Filter in memory for now
                if (dueDate <= futureDate && dueDate >= now) {
                    reminders.push({ id: doc.id, ...data });
                }
            });

            return reminders;

        } catch (error) {
            console.error('❌ Error getting due reminders:', error.message);
            throw new Error(`Failed to get due reminders: ${error.message}`);
        }
    }

    // ==================== ANALYTICS ====================
    async getSpendingBaseline(userId, days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const constraints = [
                where('userId', '==', userId),
                where('timestamp', '>=', cutoffDate.toISOString()),
                where('status', '==', 'active')
            ];

            const q = query(collection(this.db, 'transactions'), ...constraints);
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return {
                    total_transactions: 0,
                    total_amount: 0,
                    avg_amount: 0,
                    category_spending: {},
                    merchant_spending: {}
                };
            }

            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });

            // Calculate baseline metrics
            const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            const avgAmount = totalAmount / transactions.length;

            // Category breakdown
            const categorySpending = {};
            transactions.forEach(t => {
                if (t.category) {
                    categorySpending[t.category] = (categorySpending[t.category] || 0) + (t.amount || 0);
                }
            });

            // Merchant breakdown
            const merchantSpending = {};
            transactions.forEach(t => {
                if (t.merchant) {
                    merchantSpending[t.merchant] = (merchantSpending[t.merchant] || 0) + (t.amount || 0);
                }
            });

            return {
                total_transactions: transactions.length,
                total_amount: totalAmount,
                avg_amount: avgAmount,
                category_spending: categorySpending,
                merchant_spending: merchantSpending
            };

        } catch (error) {
            console.error('❌ Error getting spending baseline:', error.message);
            throw new Error(`Failed to get spending baseline: ${error.message}`);
        }
    }
}

module.exports = new FirebaseService();
