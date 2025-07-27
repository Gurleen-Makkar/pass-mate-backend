const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

class FirebaseConfig {
    constructor() {
        this.db = null;
        this.app = null;
        this.initialized = false;
    }

    initialize() {
        try {
            // Check if Firebase is already initialized
            if (this.initialized) {
                return this.db;
            }

            // Load Firebase configuration from environment variables
            const firebaseConfig = {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID,
                measurementId: process.env.FIREBASE_MEASUREMENT_ID
            };

            // Validate required environment variables
            if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
                throw new Error('Firebase credentials not found in environment variables');
            }

            // Initialize Firebase
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.initialized = true;

            console.log('✅ Firebase initialized successfully');
            return this.db;

        } catch (error) {
            console.error('❌ Firebase initialization error:', error.message);
            throw new Error(`Failed to initialize Firebase: ${error.message}`);
        }
    }

    getFirestore() {
        if (!this.initialized) {
            return this.initialize();
        }
        return this.db;
    }
}

// Export singleton instance
const firebaseConfig = new FirebaseConfig();
module.exports = firebaseConfig;
