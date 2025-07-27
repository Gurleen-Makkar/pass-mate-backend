# Project Raseed - Complete Implementation Tasks

## Overview
This document breaks down the complete implementation into end-to-end features, covering all aspects of the Project Raseed system including proactive services, correlation engine, and advanced analytics.

## 🎯 Implementation Strategy
- **End-to-End Approach**: Complete one feature fully before starting the next
- **Incremental Building**: Each task adds functionality to the previous
- **Testing at Each Step**: Ensure each feature works before proceeding

---

## 📋 TASK 1: Core Receipt Processing (Day 1-2)
**Goal**: User can upload a receipt photo and get it processed with Gemini, stored in Firestore, and receive a basic response.

### 1.1 Backend Foundation Setup
**Estimated Time**: 2-3 hours

#### Steps:
1. **Project Structure Setup**
   ```
   backend/
   ├── src/
   │   ├── controllers/
   │   │   ├── receiptController.js
   │   │   ├── analyticsController.js
   │   │   └── notificationController.js
   │   ├── services/
   │   │   ├── geminiService.js
   │   │   ├── geminiLiveService.js
   │   │   ├── firebaseService.js
   │   │   ├── walletService.js
   │   │   ├── calendarMonitor.js
   │   │   ├── anomalyDetector.js
   │   │   ├── correlationService.js
   │   │   ├── flightMonitor.js
   │   │   ├── healthAnalyzer.js
   │   │   └── notificationService.js
   │   ├── middleware/
   │   │   ├── auth.js
   │   │   └── validation.js
   │   ├── utils/
   │   │   ├── helpers.js
   │   │   └── cronJobs.js
   │   ├── config/
   │   │   ├── firebase.js
   │   │   └── websocket.js
   │   └── webhooks/
   │       ├── calendar.js
   │       ├── gmail.js
   │       └── sms.js
   ├── uploads/
   ├── .env
   └── server.js
   ```

2. **Environment Variables Setup**
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # Google APIs
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_WALLET_ISSUER_ID=your-wallet-issuer-id
   GOOGLE_CALENDAR_CLIENT_ID=your-calendar-client-id
   GOOGLE_FLIGHTS_API_KEY=your-flights-api-key
   
   # WebSocket Configuration
   WS_PORT=8080
   ```

3. **Basic Server Setup** (`server.js`)
   - Express server with CORS
   - Multer for file uploads
   - WebSocket server setup
   - Basic error handling
   - Health check endpoint
   - Cron job initialization

4. **Firebase Configuration** (`src/config/firebase.js`)
   - Initialize Firebase Admin SDK
   - Firestore connection
   - Authentication setup

#### Deliverable:
- Working Express server with WebSocket support
- Firebase connection established
- Basic file upload capability
- Health check endpoint responding
- Cron jobs initialized

### 1.2 Gemini Integration for Receipt Processing
**Estimated Time**: 3-4 hours

#### Steps:
1. **Gemini Service Implementation** (`src/services/geminiService.js`)
   ```javascript
   class GeminiService {
     async processReceiptImage(imageBase64) {
       // Use curl to call Gemini Vision API
       // Extract: merchant, amount, items, date, tax
       // Return structured data
     }
     
     async analyzeSpendingPatterns(transactionData) {
       // Analyze spending for anomalies
       // Generate insights
     }
     
     async generateHealthInsights(spendingData, calendarData) {
       // Correlate spending with calendar stress
       // Generate health recommendations
     }
   }
   ```

2. **Receipt Processing Logic**
   - Convert uploaded image to base64
   - Call Gemini API with specific prompt for receipt extraction
   - Parse Gemini response into structured format
   - Handle errors and edge cases

3. **Curl Command Implementation**
   ```bash
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": [{
         "parts": [
           {"text": "Extract receipt data in JSON format: {merchant, total_amount, items[], date, tax, currency, category}"},
           {"inline_data": {"mime_type": "image/jpeg", "data": "base64_image_data"}}
         ]
       }]
     }'
   ```

#### Deliverable:
- Working Gemini integration
- Receipt data extraction from images
- Structured JSON response
- Error handling for API failures
- Analytics and insights generation

### 1.3 Enhanced Firestore Integration
**Estimated Time**: 3-4 hours

#### Steps:
1. **Firebase Service Implementation** (`src/services/firebaseService.js`)
   ```javascript
   class FirebaseService {
     async saveTransaction(transactionData) {
       // Save to Firestore transactions collection
       // Trigger correlation service
       // Trigger anomaly detection
       // Return transaction ID
     }
     
     async getUserTransactions(userId, filters) {
       // Query user's transactions with advanced filters
     }
     
     async saveTrip(tripData) {
       // Save detected trips
     }
     
     async getUserProfile(userId) {
       // Get user profile and preferences
     }
     
     async saveSubscription(subscriptionData) {
       // Save subscription information
     }
   }
   ```

2. **Enhanced Database Schema Implementation**
   ```javascript
   // Firestore Collections
   users: {
     [userId]: {
       profile: { name, email, home_location, preferences },
       settings: { notification_preferences, spending_limits }
     }
   },
   
   transactions: {
     [transactionId]: {
       userId: string,
       merchant: string,
       amount: number,
       currency: string,
       items: array,
       category: string,
       date: timestamp,
       location: geopoint,
       source: 'image_upload|email|sms|voice',
       correlation_id: string,
       processed_at: timestamp,
       raw_data: object,
       anomaly_score: number
     }
   },
   
   trips: {
     [tripId]: {
       userId: string,
       destination: string,
       origin: string,
       start_date: timestamp,
       end_date: timestamp,
       purpose: string,
       flight_prices: array,
       expenses: array,
       status: 'detected|booked|completed',
       export_status: 'pending|exported'
     }
   },
   
   subscriptions: {
     [subId]: {
       userId: string,
       name: string,
       amount: number,
       currency: string,
       next_payment: timestamp,
       category: string,
       status: 'active|cancelled'
     }
   },
   
   correlations: {
     [correlationId]: {
       transaction_ids: array,
       confidence_score: number,
       created_at: timestamp
     }
   }
   ```

#### Deliverable:
- Enhanced Firestore integration
- Complete database schema implementation
- Advanced querying capabilities
- Trigger system for background services

### 1.4 Receipt Controller with Type Handling
**Estimated Time**: 3-4 hours

#### Steps:
1. **Enhanced Receipt Controller** (`src/controllers/receiptController.js`)
   ```javascript
   class ReceiptController {
     async processReceipt(req, res) {
       const { type } = req.body;
       
       switch(type) {
         case 'image':
           return await this.processImageReceipt(req, res);
         case 'email':
           return await this.processEmailReceipt(req, res);
         case 'sms':
           return await this.processSMSReceipt(req, res);
         case 'voice':
           return await this.processVoiceReceipt(req, res);
         case 'audio':
           return await this.processAudioReceipt(req, res);
         default:
           return res.status(400).json({ error: 'Invalid receipt type' });
       }
     }
   }
   ```

2. **Type-Specific Processing**
   - Image: Gemini Vision API processing
   - Email: Parse email content and attachments
   - SMS: Extract transaction details from text
   - Voice: Process transcript with function calling
   - Audio: Convert to text then process

#### Deliverable:
- Unified receipt processing endpoint
- Type-based processing logic
- Complete error handling
- Correlation triggering

---

## 📋 TASK 2: Correlation Engine (Day 2)
**Goal**: Automatically correlate transactions from different sources (SMS + Email + Photo)

### 2.1 Correlation Service Implementation
**Estimated Time**: 4-5 hours

#### Steps:
1. **Correlation Service** (`src/services/correlationService.js`)
   ```javascript
   class CorrelationService {
     async findMatches(transaction) {
       // Find potential matches by amount, time, location
       // Calculate confidence scores
       // Merge correlated transactions
     }
     
     async calculateConfidence(transaction1, transaction2) {
       // Amount match: 40%
       // Time proximity: 30%
       // Location proximity: 20%
       // Merchant similarity: 10%
     }
     
     async mergeTransactions(transactions) {
       // Create correlation record
       // Update transaction records
       // Notify user of correlation
     }
   }
   ```

2. **Matching Algorithm**
   - Amount matching (exact or close)
   - Time window matching (within 1 hour)
   - Location proximity matching
   - Merchant name similarity

3. **Confidence Scoring**
   - Weighted scoring system
   - Threshold for auto-correlation
   - Manual review for low confidence

#### Deliverable:
- Working correlation engine
- Automatic transaction matching
- Confidence scoring system
- Merged transaction records

### 2.2 Integration with Receipt Processing
**Estimated Time**: 1-2 hours

#### Steps:
1. **Trigger Correlation on New Transaction**
   - Call correlation service after saving transaction
   - Update UI with correlation results
   - Create wallet pass updates

#### Deliverable:
- Automatic correlation on new transactions
- Real-time correlation updates
- Enhanced transaction records

---

## 📋 TASK 3: Proactive Calendar Integration (Day 2-3)
**Goal**: Monitor calendar events and proactively detect travel needs

### 3.1 Calendar Monitoring Service
**Estimated Time**: 4-5 hours

#### Steps:
1. **Calendar Monitor Service** (`src/services/calendarMonitor.js`)
   ```javascript
   class CalendarMonitor {
     async detectTravelEvents(userId) {
       // Fetch upcoming calendar events
       // Analyze for travel indicators
       // Compare with user's home location
       // Return potential trips
     }
     
     async analyzeEventForTravel(event, userProfile) {
       // Check event location vs home location
       // Analyze event title/description for travel keywords
       // Determine travel dates
     }
     
     async createTripRecord(tripData) {
       // Save trip to Firestore
       // Trigger flight price monitoring
       // Create travel planning wallet pass
     }
   }
   ```

2. **Travel Detection Logic**
   - Location extraction from event details
   - Distance calculation from home location
   - Date range determination
   - Travel purpose classification (business/personal)

3. **Calendar Webhook Setup**
   ```javascript
   // src/webhooks/calendar.js
   app.post('/webhooks/calendar', async (req, res) => {
     const event = req.body;
     await calendarMonitor.processEvent(event);
     res.status(200).send('OK');
   });
   ```

#### Deliverable:
- Working calendar integration
- Travel event detection
- Automatic trip record creation
- Webhook endpoint for real-time updates

### 3.2 Flight Price Monitoring Service
**Estimated Time**: 3-4 hours

#### Steps:
1. **Flight Monitor Service** (`src/services/flightMonitor.js`)
   ```javascript
   class FlightMonitor {
     async checkAllTrips() {
       // Get all active trips
       // Check current flight prices
       // Compare with stored prices
       // Send alerts for price changes
     }
     
     async getFlightPrices(origin, destination, date) {
       // Call Google Flights API (or mock)
       // Return flight options with prices
     }
     
     async sendPriceAlert(userId, tripId, priceChange) {
       // Send WebSocket notification
       // Update wallet pass
       // Create notification record
     }
   }
   ```

2. **Price Monitoring Logic**
   - Scheduled job every 6 hours
   - Price comparison and trend analysis
   - Alert thresholds (10% price change)
   - Historical price tracking

3. **Cron Job Setup**
   ```javascript
   // src/utils/cronJobs.js
   cron.schedule('0 */6 * * *', () => {
     flightMonitor.checkAllTrips();
   });
   ```

#### Deliverable:
- Flight price monitoring system
- Scheduled price checking
- Price change alerts
- Historical price tracking

---

## 📋 TASK 4: Anomaly Detection Service (Day 3)
**Goal**: Proactively detect unusual spending patterns and alert users

### 4.1 Anomaly Detection Implementation
**Estimated Time**: 4-5 hours

#### Steps:
1. **Anomaly Detector Service** (`src/services/anomalyDetector.js`)
   ```javascript
   class AnomalyDetector {
     async analyze(transaction) {
       // Get user's spending history
       // Calculate spending patterns
       // Identify anomalies using Gemini
       // Generate anomaly score
     }
     
     async calculateSpendingBaseline(userId) {
       // Average spending by category
       // Typical spending times
       // Usual merchant patterns
       // Location-based spending
     }
     
     async detectAnomalies(transaction, baseline) {
       // Amount anomalies (unusually high/low)
       // Time anomalies (unusual spending times)
       // Location anomalies (spending in new locations)
       // Merchant anomalies (new merchants)
     }
     
     async sendAnomalyAlert(userId, anomaly) {
       // Send real-time notification
       // Create anomaly wallet pass
       // Log anomaly for review
     }
   }
   ```

2. **Anomaly Types**
   - **Amount Anomalies**: Spending 3x average amount
   - **Time Anomalies**: Spending at unusual hours
   - **Location Anomalies**: Spending far from usual locations
   - **Frequency Anomalies**: Too many transactions in short time
   - **Merchant Anomalies**: First-time merchants with high amounts

3. **Gemini Integration for Pattern Analysis**
   ```bash
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": [{
         "parts": [{"text": "Analyze spending pattern for anomalies: ${transactionHistory}. Current transaction: ${currentTransaction}. Identify if this is unusual and explain why."}]
       }]
     }'
   ```

#### Deliverable:
- Working anomaly detection system
- Real-time anomaly alerts
- Anomaly scoring and classification
- Gemini-powered pattern analysis

### 4.2 Integration with Transaction Processing
**Estimated Time**: 1-2 hours

#### Steps:
1. **Trigger Anomaly Detection**
   - Call anomaly detector after saving transaction
   - Process anomalies in background
   - Send immediate alerts for high-risk anomalies

#### Deliverable:
- Automatic anomaly detection on new transactions
- Real-time anomaly notifications
- Anomaly wallet passes

---

## 📋 TASK 5: Health Pattern Analysis (Day 3-4)
**Goal**: Correlate spending patterns with calendar stress and health data

### 5.1 Health Analyzer Service
**Estimated Time**: 3-4 hours

#### Steps:
1. **Health Analyzer Service** (`src/services/healthAnalyzer.js`)
   ```javascript
   class HealthAnalyzer {
     async analyzeAllUsers() {
       // Weekly analysis for all users
       // Correlate spending with calendar stress
       // Generate health insights
     }
     
     async analyzeUserHealthPatterns(userId) {
       // Get user's calendar events
       // Get spending data
       // Identify stress periods
       // Correlate spending with stress
     }
     
     async identifyStressPeriods(calendarEvents) {
       // Back-to-back meetings
       // Long meeting days
       // Travel periods
       // Weekend work
     }
     
     async generateHealthInsights(userId, patterns) {
       // Use Gemini to generate insights
       // Create recommendations
       // Send health wallet pass
     }
   }
   ```

2. **Health Correlation Logic**
   - Identify stress indicators in calendar
   - Correlate with food/shopping expenses
   - Track spending during busy periods
   - Generate health recommendations

3. **Weekly Analysis Cron Job**
   ```javascript
   cron.schedule('0 9 * * 1', () => {
     healthAnalyzer.analyzeAllUsers();
   });
   ```

#### Deliverable:
- Health pattern analysis system
- Calendar-spending correlation
- Weekly health insights
- Health recommendation wallet passes

### 5.2 Mock Health App Integration
**Estimated Time**: 2-3 hours

#### Steps:
1. **Mock Health App**
   - Simple web interface showing health data
   - Display spending-health correlations
   - Show recommendations from analysis

#### Deliverable:
- Mock health app demonstration
- Health data visualization
- Integration showcase

---

## 📋 TASK 6: Google Wallet Integration (Day 4)
**Goal**: Create and manage Google Wallet passes for all features

### 6.1 Enhanced Wallet Service
**Estimated Time**: 4-5 hours

#### Steps:
1. **Comprehensive Wallet Service** (`src/services/walletService.js`)
   ```javascript
   class WalletService {
     async createReceiptPass(receiptData) {
       // Create receipt pass
     }
     
     async createTravelPass(travelData) {
       // Create travel planning pass
     }
     
     async createInsightPass(insightData) {
       // Create spending insight pass
     }
     
     async createAnomalyPass(anomalyData) {
       // Create anomaly alert pass
     }
     
     async createHealthPass(healthData) {
       // Create health insight pass
     }
     
     async updatePass(passId, newData) {
       // Update existing pass
       // Send push notification
     }
   }
   ```

2. **Pass Types Implementation**
   - **Receipt Passes**: Transaction details
   - **Travel Passes**: Flight alerts, hotel suggestions
   - **Insight Passes**: Monthly spending summaries
   - **Anomaly Passes**: Unusual spending alerts
   - **Health Passes**: Health-spending correlations

#### Deliverable:
- Complete Google Wallet integration
- Multiple pass types
- Pass update functionality
- Push notifications

---

## 📋 TASK 7: Voice Processing with Gemini Live API (Day 4-5)
**Goal**: Real-time voice processing for expense logging

### 7.1 Gemini Live Service Implementation
**Estimated Time**: 4-5 hours

#### Steps:
1. **Gemini Live Service** (`src/services/geminiLiveService.js`)
   - Implement the complete service from GEMINI_LIVE_API_INTEGRATION.md
   - WebSocket-based real-time communication
   - Function calling for expense logging
   - Asynchronous operations

2. **Voice Processing Endpoints**
   - Session management
   - Audio processing
   - Real-time responses

#### Deliverable:
- Working Gemini Live API integration
- Real-time voice processing
- Function calling for expenses
- WebSocket communication

### 7.2 WebSocket Server Enhancement
**Estimated Time**: 2-3 hours

#### Steps:
1. **Enhanced WebSocket Server** (`src/config/websocket.js`)
   ```javascript
   class WebSocketServer {
     setupConnections() {
       // Handle voice connections
       // Handle notification connections
       // Handle real-time updates
     }
     
     broadcastNotification(userId, notification) {
       // Send notifications to specific users
     }
     
     handleVoiceInput(userId, audioData) {
       // Process voice input via Gemini Live
     }
   }
   ```

#### Deliverable:
- Enhanced WebSocket server
- Real-time voice processing
- Notification broadcasting
- Multi-purpose WebSocket handling

---

## 📋 TASK 8: Notification System (Day 5)
**Goal**: Comprehensive real-time notification system

### 8.1 Notification Service Implementation
**Estimated Time**: 3-4 hours

#### Steps:
1. **Notification Service** (`src/services/notificationService.js`)
   ```javascript
   class NotificationService {
     async sendTravelAlert(userId, tripData) {
       // Send travel booking alert
       // Create travel wallet pass
     }
     
     async sendAnomalyAlert(userId, anomalyData) {
       // Send spending anomaly alert
       // Create anomaly wallet pass
     }
     
     async sendPriceAlert(userId, priceData) {
       // Send flight price change alert
       // Update travel wallet pass
     }
     
     async sendHealthInsight(userId, healthData) {
       // Send health correlation insight
       // Create health wallet pass
     }
     
     async sendSubscriptionReminder(userId, subscriptionData) {
       // Send subscription renewal reminder
       // Create reminder wallet pass
     }
   }
   ```

2. **Notification Types**
   - Travel booking alerts
   - Spending anomaly alerts
   - Flight price changes
   - Health insights
   - Subscription reminders
   - Correlation notifications

#### Deliverable:
- Complete notification system
- Multiple notification types
- Real-time delivery
- Wallet pass integration

---

## 📋 TASK 9: Webhook Endpoints (Day 5)
**Goal**: External webhook endpoints for real-time data

### 9.1 Webhook Implementation
**Estimated Time**: 2-3 hours

#### Steps:
1. **Calendar Webhook** (`src/webhooks/calendar.js`)
   - Receive calendar event changes
   - Trigger travel detection
   - Process event updates

2. **Gmail Webhook** (`src/webhooks/gmail.js`)
   - Receive email notifications
   - Extract receipt emails
   - Process via receipt API

3. **SMS Webhook** (`src/webhooks/sms.js`)
   - Receive SMS notifications
   - Parse transaction SMS
   - Process via receipt API

#### Deliverable:
- Working webhook endpoints
- Real-time external data processing
- Automatic receipt processing from external sources

---

## 📋 TASK 10: Frontend Integration & Demo (Day 5)
**Goal**: Complete React Native app with all features

### 10.1 React Native App
**Estimated Time**: 4-5 hours

#### Steps:
1. **Complete App Setup**
   - Receipt capture and upload
   - Voice input interface
   - Real-time notifications
   - Wallet pass integration
   - Analytics dashboard

2. **Demo Scenarios**
   - Receipt processing demo
   - Travel detection demo
   - Voice input demo
   - Anomaly detection demo
   - Health insights demo

#### Deliverable:
- Complete React Native application
- All features integrated
- Demo-ready application

---

## 🔧 Background Services & Cron Jobs

### Scheduled Jobs Implementation
```javascript
// src/utils/cronJobs.js
const cron = require('node-cron');

// Flight price monitoring - every 6 hours
cron.schedule('0 */6 * * *', () => {
  flightMonitor.checkAllTrips();
});

// Health analysis - weekly on Monday 9 AM
cron.schedule('0 9 * * 1', () => {
  healthAnalyzer.analyzeAllUsers();
});

// Subscription reminders - daily at 10 AM
cron.schedule('0 10 * * *', () => {
  subscriptionMonitor.checkExpiringSubscriptions();
});

// Correlation cleanup - daily at midnight
cron.schedule('0 0 * * *', () => {
  correlationService.cleanupOldCorrelations();
});
```

## 🎯 Complete Success Criteria
- [ ] Receipt photo → Processed data → Firestore → Wallet pass
- [ ] Correlation engine matching SMS + Email + Photo receipts
- [ ] Calendar integration with proactive travel detection
- [ ] Flight price monitoring with alerts
- [ ] Anomaly detection with real-time alerts
- [ ] Health pattern analysis with weekly insights
- [ ] Voice processing with Gemini Live API
- [ ] Real-time notifications via WebSocket
- [ ] Complete Google Wallet integration with multiple pass types
- [ ] Webhook endpoints for external data
- [ ] Working React Native demo application
- [ ] End-to-end proactive AI assistant functionality

This complete implementation plan covers all aspects of Project Raseed, ensuring we build a truly intelligent, proactive financial assistant that leverages Google's ecosystem comprehensively.
