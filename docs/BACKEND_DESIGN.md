# Project Raseed - Revised Backend Design Document

## Overview
This document outlines the corrected backend architecture for Project Raseed, focusing on proactive AI-driven notifications and unified receipt processing.

## Key Design Changes Based on Feedback

### 1. Receipt Processing Endpoint
**Endpoint**: `POST /api/receipts`
**Input Types**: 
```javascript
{
  "type": "image",           // photo/video upload
  "type": "email",           // email receipt
  "type": "sms",             // SMS transaction
  "type": "voice",           // voice input
  "type": "audio",           // audio file
  "data": "...",             // actual data
  "metadata": {
    "location": "lat,lng",
    "timestamp": "ISO_string",
    "source": "mobile_app|email_listener|sms_webhook"
  }
}
```

### 2. Proactive Backend Services (Not User-Triggered APIs)
Instead of user-calling APIs, the backend proactively monitors and pushes notifications.

## Revised API Architecture

### 1. Receipt Processing API

#### POST /api/receipts
**Purpose**: Unified receipt processing for all input types
**Input Types & Processing**:

**Type: "image"**
```javascript
{
  "type": "image",
  "data": "base64_image_data",
  "metadata": {
    "location": "12.9716,77.5946",
    "timestamp": "2025-01-24T14:30:00Z"
  }
}
```
**Process**: Gemini Vision API → Extract receipt data → Store → Create wallet pass

**Type: "email"**
```javascript
{
  "type": "email",
  "data": {
    "subject": "Receipt from Amazon",
    "body": "email_content",
    "attachments": ["base64_pdf_data"]
  },
  "metadata": {
    "timestamp": "2025-01-24T14:30:00Z",
    "source": "gmail_webhook"
  }
}
```
**Process**: Parse email → Extract attachments → Process like image → Correlate

**Type: "sms"**
```javascript
{
  "type": "sms",
  "data": {
    "message": "Your card ending 1234 was charged Rs.250 at McDonald's on 24-Jan-25",
    "sender": "HDFC-BANK"
  },
  "metadata": {
    "timestamp": "2025-01-24T14:30:00Z",
    "source": "sms_webhook"
  }
}
```
**Process**: Parse SMS → Extract transaction details → Store → Attempt correlation

**Type: "voice"**
```javascript
{
  "type": "voice",
  "data": {
    "transcript": "I spent 250 rupees at McDonald's for lunch"
  },
  "metadata": {
    "location": "12.9716,77.5946",
    "timestamp": "2025-01-24T14:30:00Z"
  }
}
```
**Process**: Gemini function calling → Extract expense → Store → Create pass

**Type: "audio"**
```javascript
{
  "type": "audio",
  "data": "base64_audio_data",
  "metadata": {
    "location": "12.9716,77.5946",
    "timestamp": "2025-01-24T14:30:00Z"
  }
}
```
**Process**: Speech-to-text → Process like voice type

### 2. Proactive Background Services

#### Calendar Monitoring Service
**File**: `src/services/calendarMonitor.js`
**Purpose**: Continuously monitor calendar for travel events
**Trigger**: Webhook from Google Calendar API
**Process Flow**:
1. Receive calendar event webhook
2. Analyze event for travel indicators
3. Check existing bookings in Firestore
4. Query flight prices if travel detected
5. **Push notification to frontend**: "Flight to Mumbai needed for Jan 30 meeting"
6. Create travel planning wallet pass

**Implementation**:
```javascript
// Webhook endpoint for calendar events
app.post('/webhooks/calendar', (req, res) => {
  const event = req.body;
  calendarMonitor.processEvent(event);
});
```

#### Anomaly Detection Service
**File**: `src/services/anomalyDetector.js`
**Purpose**: Continuously analyze spending patterns
**Trigger**: After each transaction is stored
**Process Flow**:
1. New transaction stored in Firestore
2. Trigger anomaly analysis
3. Compare with user's spending history
4. Use Gemini to identify unusual patterns
5. **Push notification to frontend**: "Unusual spending detected: ₹5000 at electronics store"
6. Create alert wallet pass

#### Flight Price Monitor Service
**File**: `src/services/flightMonitor.js`
**Purpose**: Monitor flight prices for detected trips
**Trigger**: Scheduled job (every 6 hours)
**Process Flow**:
1. Query active trips from Firestore
2. Check current flight prices
3. Compare with stored baseline prices
4. **Push notification if price change**: "Flight price dropped by ₹2000 for Mumbai trip"
5. Update wallet pass with new price

#### Health Pattern Analyzer Service
**File**: `src/services/healthAnalyzer.js`
**Purpose**: Analyze spending vs calendar stress patterns
**Trigger**: Weekly analysis job
**Process Flow**:
1. Fetch user's calendar events and spending data
2. Identify stress periods (back-to-back meetings)
3. Correlate with food/shopping expenses
4. **Push notification**: "You spent 40% more on food during busy weeks"
5. Create health insight wallet pass

### 3. Webhook Endpoints (External Triggers)

#### POST /webhooks/calendar
**Purpose**: Receive Google Calendar event notifications
**Trigger**: Google Calendar API webhook
**Process**: Trigger calendar monitoring service

#### POST /webhooks/gmail
**Purpose**: Receive Gmail notifications for receipts
**Trigger**: Gmail API webhook for receipt emails
**Process**: Extract receipt → Process via /api/receipts

#### POST /webhooks/sms
**Purpose**: Receive SMS transaction notifications
**Trigger**: SMS gateway webhook
**Process**: Parse SMS → Process via /api/receipts

### 4. Push Notification API

#### POST /api/notifications/send
**Purpose**: Send push notifications to frontend
**Input**:
```javascript
{
  "userId": "user123",
  "type": "travel_alert|anomaly_detected|price_change|health_insight",
  "title": "Flight Booking Needed",
  "message": "Book flight to Mumbai for Jan 30 meeting - prices increasing",
  "data": {
    "actionType": "open_travel_booking",
    "tripId": "trip123"
  }
}
```

## Revised Data Flow Diagrams

### 1. Proactive Travel Detection Flow
```
Google Calendar Webhook → Calendar Monitor Service → Travel Detection → 
Flight Price Check → Notification Service → Push to Frontend → 
Wallet Pass Creation → User Action
```

### 2. Anomaly Detection Flow
```
Transaction Stored → Anomaly Detector Service → Pattern Analysis → 
Gemini Analysis → Anomaly Detected → Notification Service → 
Push to Frontend → Alert Wallet Pass
```

### 3. Receipt Correlation Flow
```
SMS Webhook → Receipt API (type: sms) → Correlation Service → 
Email Webhook → Receipt API (type: email) → Correlation Match → 
Photo Upload → Receipt API (type: image) → Merge Transactions → 
Update Wallet Pass → Notify User
```

### 4. Health Pattern Analysis Flow
```
Weekly Cron Job → Health Analyzer → Calendar + Spending Data → 
Pattern Detection → Insight Generation → Notification Service → 
Push to Frontend → Health Wallet Pass
```

### 5. Voice Input Processing Flow
```
Mobile App → Audio Recording → Speech-to-Text → Receipt API (type: voice) → 
Gemini Function Calling → Expense Extraction → Firestore Storage → 
Wallet Pass Creation → Response to App
```

## Background Job Architecture

### 1. Scheduled Jobs
```javascript
// Price monitoring - every 6 hours
cron.schedule('0 */6 * * *', () => {
  flightMonitor.checkAllTrips();
});

// Health analysis - weekly
cron.schedule('0 9 * * 1', () => {
  healthAnalyzer.analyzeAllUsers();
});

// Subscription reminders - daily
cron.schedule('0 10 * * *', () => {
  subscriptionMonitor.checkExpiringSubscriptions();
});
```

### 2. Event-Driven Jobs
```javascript
// After transaction storage
firestore.onTransactionCreated((transaction) => {
  anomalyDetector.analyze(transaction);
  correlationService.findMatches(transaction);
});

// After calendar event
calendar.onEventCreated((event) => {
  calendarMonitor.processEvent(event);
});
```

## Gemini Function Calling Implementation

### Voice Processing with Function Calling
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Extract expense from: I spent 250 rupees at McDonald'\''s for lunch"}]
    }],
    "tools": [{
      "function_declarations": [{
        "name": "log_expense",
        "description": "Log an expense transaction",
        "parameters": {
          "type": "object",
          "properties": {
            "amount": {"type": "number", "description": "Amount spent"},
            "merchant": {"type": "string", "description": "Merchant name"},
            "category": {"type": "string", "description": "Expense category"},
            "timestamp": {"type": "string", "description": "Transaction time"}
          },
          "required": ["amount", "merchant", "category"]
        }
      }]
    }]
  }'
```

## Frontend Integration Points

### 1. WebSocket Connection for Real-time Notifications
```javascript
// Frontend connects to WebSocket
const ws = new WebSocket('ws://localhost:3000/notifications');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  showNotification(notification);
};
```

### 2. Push Notification Handling
```javascript
// Frontend receives push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  if (data.type === 'travel_alert') {
    // Show travel booking notification
    showTravelAlert(data);
  } else if (data.type === 'anomaly_detected') {
    // Show spending anomaly alert
    showAnomalyAlert(data);
  }
});
```

## Service Implementation Priority

### Day 1: Core Receipt Processing
1. Unified `/api/receipts` endpoint with type handling
2. Basic Gemini integration for image processing
3. Firestore storage setup

### Day 2: Proactive Services Setup
1. Calendar monitoring service
2. Anomaly detection service
3. Push notification system

### Day 3: Advanced Features
1. Correlation engine
2. Flight price monitoring
3. Health pattern analysis

### Day 4: Integration & Testing
1. Webhook endpoints
2. Frontend integration
3. End-to-end testing

This revised design focuses on proactive AI-driven services that push notifications to users rather than waiting for user requests, making the system truly intelligent and helpful.
