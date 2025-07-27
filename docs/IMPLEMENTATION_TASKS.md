# Project Raseed - Implementation Tasks

## Overview
This document breaks down the implementation into end-to-end features, each building upon the previous one. Each task is complete and functional before moving to the next.

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
   │   │   └── receiptController.js
   │   ├── services/
   │   │   ├── geminiService.js
   │   │   ├── firebaseService.js
   │   │   └── walletService.js
   │   ├── middleware/
   │   │   └── auth.js
   │   ├── utils/
   │   │   └── helpers.js
   │   └── config/
   │       └── firebase.js
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
   ```

3. **Basic Server Setup** (`server.js`)
   - Express server with CORS
   - Multer for file uploads
   - Basic error handling
   - Health check endpoint

4. **Firebase Configuration** (`src/config/firebase.js`)
   - Initialize Firebase Admin SDK
   - Firestore connection
   - Authentication setup

#### Deliverable:
- Working Express server
- Firebase connection established
- Basic file upload capability
- Health check endpoint responding

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
           {"text": "Extract receipt data in JSON format: {merchant, total_amount, items[], date, tax, currency}"},
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

### 1.3 Firestore Integration
**Estimated Time**: 2-3 hours

#### Steps:
1. **Firebase Service Implementation** (`src/services/firebaseService.js`)
   ```javascript
   class FirebaseService {
     async saveTransaction(transactionData) {
       // Save to Firestore transactions collection
       // Return transaction ID
     }
     
     async getUserTransactions(userId, filters) {
       // Query user's transactions
       // Apply filters (date, category, etc.)
     }
   }
   ```

2. **Database Schema Implementation**
   ```javascript
   // Firestore Collections
   transactions: {
     [transactionId]: {
       userId: string,
       merchant: string,
       amount: number,
       currency: string,
       items: array,
       category: string,
       date: timestamp,
       source: 'image_upload',
       processed_at: timestamp,
       raw_data: object
     }
   }
   ```

3. **Data Validation**
   - Validate extracted receipt data
   - Sanitize inputs
   - Handle missing fields

#### Deliverable:
- Working Firestore integration
- Transaction data storage
- Data validation and sanitization
- Query functionality for user transactions

### 1.4 Receipt Controller Implementation
**Estimated Time**: 2-3 hours

#### Steps:
1. **Receipt Controller** (`src/controllers/receiptController.js`)
   ```javascript
   class ReceiptController {
     async processReceipt(req, res) {
       // Handle file upload
       // Process with Gemini
       // Save to Firestore
       // Return response
     }
   }
   ```

2. **API Endpoint Implementation**
   ```javascript
   // POST /api/receipts
   // Input: multipart/form-data with image file
   // Output: processed receipt data + transaction ID
   ```

3. **Error Handling**
   - File validation (size, type)
   - Gemini API errors
   - Firestore errors
   - Proper HTTP status codes

#### Deliverable:
- Working `/api/receipts` endpoint
- Complete receipt processing pipeline
- Proper error handling and responses
- API documentation

### 1.5 Basic Authentication
**Estimated Time**: 2 hours

#### Steps:
1. **Firebase Auth Middleware** (`src/middleware/auth.js`)
   ```javascript
   async function authenticateToken(req, res, next) {
     // Verify Firebase ID token
     // Extract user information
     // Add to request object
   }
   ```

2. **Protected Routes**
   - Apply auth middleware to receipt endpoints
   - Handle authentication errors
   - Return proper error responses

#### Deliverable:
- Working Firebase authentication
- Protected API endpoints
- User identification in requests

### 1.6 Testing & Validation
**Estimated Time**: 1-2 hours

#### Steps:
1. **Manual Testing**
   - Test with various receipt images
   - Verify data extraction accuracy
   - Check Firestore storage
   - Test error scenarios

2. **API Testing**
   - Use Postman/curl to test endpoints
   - Verify response formats
   - Test authentication flow

#### Deliverable:
- Fully working receipt processing pipeline
- Tested with real receipt images
- Documented API behavior

---

## 📋 TASK 2: Google Wallet Integration (Day 2-3)
**Goal**: Create Google Wallet passes for processed receipts

### 2.1 Google Wallet Service Setup
**Estimated Time**: 3-4 hours

#### Steps:
1. **Google Cloud Console Setup**
   - Enable Google Wallet API
   - Create service account
   - Generate credentials
   - Set up issuer account

2. **Wallet Service Implementation** (`src/services/walletService.js`)
   ```javascript
   class WalletService {
     async createReceiptPass(receiptData) {
       // Create generic pass object
       // Call Google Wallet API
       // Return pass URL/ID
     }
   }
   ```

3. **Pass Creation Logic**
   - Format receipt data for wallet pass
   - Create pass with merchant, amount, date
   - Handle pass creation errors

#### Deliverable:
- Working Google Wallet integration
- Receipt passes created successfully
- Pass URLs returned to frontend

### 2.2 Integration with Receipt Processing
**Estimated Time**: 1-2 hours

#### Steps:
1. **Update Receipt Controller**
   - Add wallet pass creation after Firestore save
   - Include pass URL in API response
   - Handle wallet creation errors gracefully

2. **Enhanced Response Format**
   ```javascript
   {
     success: true,
     transaction: { /* transaction data */ },
     walletPass: {
       id: "pass_id",
       url: "wallet_pass_url"
     }
   }
   ```

#### Deliverable:
- Receipts automatically create wallet passes
- Pass URLs included in API responses
- Error handling for pass creation failures

---

## 📋 TASK 3: Proactive Calendar Integration (Day 3-4)
**Goal**: Monitor calendar events and detect travel needs

### 3.1 Calendar Monitoring Service
**Estimated Time**: 4-5 hours

#### Steps:
1. **Google Calendar API Setup**
   - Enable Calendar API
   - Set up OAuth 2.0 credentials
   - Implement calendar access

2. **Calendar Monitor Service** (`src/services/calendarMonitor.js`)
   ```javascript
   class CalendarMonitor {
     async detectTravelEvents(userId) {
       // Fetch upcoming calendar events
       // Analyze for travel indicators
       // Return potential trips
     }
   }
   ```

3. **Travel Detection Logic**
   - Identify location mentions in event titles/descriptions
   - Compare with user's home location
   - Detect date ranges requiring travel

#### Deliverable:
- Working calendar integration
- Travel event detection
- Structured trip data

### 3.2 Flight Price Monitoring (Mock Implementation)
**Estimated Time**: 2-3 hours

#### Steps:
1. **Mock Flight Service** (`src/services/flightService.js`)
   ```javascript
   class FlightService {
     async getFlightPrices(origin, destination, date) {
       // Mock flight price data
       // Simulate price changes
       // Return flight options
     }
   }
   ```

2. **Price Monitoring Logic**
   - Store baseline prices for detected trips
   - Simulate price changes over time
   - Generate price alerts

#### Deliverable:
- Mock flight price monitoring
- Price change detection
- Alert generation system

### 3.3 Push Notification System
**Estimated Time**: 2-3 hours

#### Steps:
1. **WebSocket Server Setup**
   ```javascript
   // WebSocket server for real-time notifications
   const wss = new WebSocket.Server({ port: 8080 });
   ```

2. **Notification Service** (`src/services/notificationService.js`)
   ```javascript
   class NotificationService {
     async sendTravelAlert(userId, tripData) {
       // Send travel booking alert
       // Create travel planning wallet pass
     }
   }
   ```

#### Deliverable:
- Real-time notification system
- Travel alerts sent to frontend
- Travel planning wallet passes

---

## 📋 TASK 4: Voice Processing Integration (Day 4-5)
**Goal**: Process voice input for expense logging

### 4.1 Basic Voice Processing
**Estimated Time**: 3-4 hours

#### Steps:
1. **Voice Processing Endpoint**
   ```javascript
   // POST /api/receipts (type: voice)
   // Input: { type: "voice", data: { transcript: "..." } }
   ```

2. **Gemini Function Calling**
   - Use regular Gemini 2.5 Flash with function calling
   - Extract expense details from voice transcript
   - Create transaction record

#### Deliverable:
- Voice input processing
- Expense extraction from speech
- Transaction creation from voice

### 4.2 WebSocket Integration for Voice
**Estimated Time**: 2-3 hours

#### Steps:
1. **Real-time Voice Processing**
   - WebSocket endpoint for voice data
   - Real-time transcription processing
   - Immediate expense logging

#### Deliverable:
- Real-time voice processing
- WebSocket-based voice input
- Immediate feedback to user

---

## 📋 TASK 5: Frontend Integration & Demo (Day 5)
**Goal**: Create working frontend demo

### 5.1 Basic React Native Setup
**Estimated Time**: 2-3 hours

#### Steps:
1. **Expo Project Setup**
   - Initialize React Native project
   - Set up navigation
   - Basic UI components

2. **API Integration**
   - HTTP client setup
   - Authentication flow
   - Receipt upload functionality

#### Deliverable:
- Working React Native app
- Receipt photo capture and upload
- Authentication with Firebase

### 5.2 Demo Preparation
**Estimated Time**: 2-3 hours

#### Steps:
1. **Demo Data Setup**
   - Sample receipt images
   - Mock user accounts
   - Test scenarios

2. **Demo Flow**
   - Receipt capture → Processing → Wallet pass
   - Calendar integration demo
   - Voice input demo

#### Deliverable:
- Complete demo application
- End-to-end functionality
- Ready for presentation

---

## 🔧 Development Guidelines

### Code Standards
- Use ES6+ JavaScript features
- Implement proper error handling
- Add logging for debugging
- Follow RESTful API conventions

### Testing Strategy
- Manual testing after each task
- API testing with Postman
- End-to-end testing before demo

### Documentation
- Update API documentation after each task
- Document environment setup steps
- Create demo script for presentation

### Git Workflow
- Commit after each completed subtask
- Use descriptive commit messages
- Create branches for major features

---

### Success Criteria
- [ ] Receipt photo → Processed data → Firestore → Wallet pass
- [ ] Calendar integration with travel detection
- [ ] Voice input for expense logging
- [ ] Real-time notifications
- [ ] Working demo application

This task breakdown ensures we build incrementally, with each task being a complete, testable feature that builds upon the previous one.
