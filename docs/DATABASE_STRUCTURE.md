# Project Raseed - Database Structure (Firestore)

## Overview

This document outlines the complete Firestore database structure for Project Raseed, including all collections, document schemas, indexes, and relationships.

---

## 🗄️ Collections Structure

### 1. **users** Collection

**Purpose**: Store user profiles, preferences, and settings

```javascript
users/{userId} = {
  // Basic Profile
  userId: "user123",
  profile: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+91-9876543210",
    home_location: {
      address: "Bangalore, India",
      coordinates: {
        lat: 12.9716,
        lng: 77.5946
      }
    },
    avatar_url: "https://...",
    preferences: {
      currency: "INR",
      language: "en",
      timezone: "Asia/Kolkata"
    }
  },

  // Metadata
  created_at: "2025-01-24T10:30:00Z",
  updated_at: "2025-01-24T10:30:00Z",
  last_active: "2025-01-24T10:30:00Z"
}
```

### 2. **transactions** Collection

**Purpose**: Store all expense transactions from various sources

```javascript
transactions/{transactionId} = {
  // Basic Transaction Info
  userId: "user123",
  merchant: "McDonald's",
  amount: 250.00,
  currency: "INR",
  category: "food",

  // Items (for detailed receipts)
  items: [
    {
      name: "Big Mac Meal",
      quantity: 1,
      price: 180.00
    },
    {
      name: "Coca Cola",
      quantity: 1,
      price: 70.00
    }
  ],

  // Timing & Location
  timestamp: "2025-01-24T14:30:00Z",
  location: {
    address: "MG Road, Bangalore",
    coordinates: {
      lat: 12.9716,
      lng: 77.5946
    }
  },

  // Source Information
  sources: [
    {
      "input_type": "image_upload", // image_upload|email|sms|voice|audio|manual
      "uri": "gs://your-bucket-name/path/to/image.jpg" // optional
    }
  ],

  // Action Handling
  action_type: "expense", // expense|deletion|query

  // Wallet Integration
  wallet_pass_id: "pass_789",
  wallet_pass_url: "https://...",

  // Trip Association
  trip_id: "trip_123", // If part of a trip

  // Metadata
  created_at: "2025-01-24T14:30:00Z",
  updated_at: "2025-01-24T14:30:00Z",
  status: "active" // active|deleted|archived
}
```

### 3. **trips** Collection

**Purpose**: Store detected and planned trips

```javascript
trips/{tripId} = {
  // Trip Basic Info
  trip_id: "trip_123",
  userId: "user123",

  // Trip Details
  destination: "Mumbai",
  origin: "Bangalore",
  purpose: "business", // business|personal|vacation

  // Dates
  start_date: "2025-02-15T09:00:00Z",
  end_date: "2025-02-17T18:00:00Z",

  // Detection Source
  detected_from: "calendar_event", // calendar_event|manual|spending_pattern
  calendar_event_id: "cal_event_456",

  // Associated Expenses
  expenses: ["trans_101", "trans_102"], // Transaction IDs

  // Associated passes
  wallet_passes: ["pass_789"], // Wallet pass IDs

  // Metadata
  created_at: "2025-01-24T10:00:00Z",
  updated_at: "2025-01-24T15:00:00Z"
}
```

### 4. **reminders** Collection

**Purpose**: Store recurring payment reminders and subscription tracking

```javascript
reminders/{reminderId} = {
  // Reminder Info
  reminder_id: "reminder_123",
  userId: "user123",
  
  // Service Details
  service_name: "Netflix",
  category: "entertainment",
  amount: 649.00,
  currency: "INR",
  
  // Reminder Schedule
  reminder_type: "subscription", // subscription|bill|payment|custom
  frequency: "monthly", // monthly|yearly|weekly|quarterly
  next_due_date: "2025-02-24T00:00:00Z",
  last_payment_date: "2025-01-24T00:00:00Z",
  
  // Detection & Tracking
  detected_from: "transaction_pattern", // transaction_pattern|manual|email
  related_transactions: ["trans_201", "trans_202"],
  confidence_score: 85, // How confident we are this is recurring
  
  // Reminder Settings
  reminder_days_before: 3, // Remind 3 days before due date
  reminder_sent: false,
  reminder_date: "2025-02-21T10:00:00Z",
  
  // Status & User Actions
  status: "active", // active|paused|cancelled|completed
  user_acknowledged: false,
  snooze_until: null, // If user snoozed the reminder
  
  // Wallet Integration
  reminder_pass_id: "reminder_pass_456",
  
  // Metadata
  created_at: "2025-01-24T10:00:00Z",
  updated_at: "2025-01-24T10:00:00Z"
}
```


### 5. **anomalies** Collection

**Purpose**: Store detected spending anomalies and alerts

```javascript
anomalies/{anomalyId} = {
  // Anomaly Info
  anomaly_id: "anom_123",
  userId: "user123",
  transaction_id: "trans_123",

  // Anomaly Details
  anomaly_type: "amount_spike", // amount_spike|time_unusual|location_unusual|frequency_high
  anomaly_score: 85,
  risk_level: "medium", // low|medium|high

  // Analysis
  anomaly_reasons: [
    "Amount ₹5000 is 5x higher than average ₹1000",
    "First time spending at this merchant"
  ],
  potential_causes: [
    "Special occasion purchase",
    "Emergency expense",
    "Fraudulent transaction"
  ],

  // Baseline Comparison
  user_baseline: {
    avg_amount: 1000,
    avg_daily_spending: 2500,
    category_avg: 800
  },

  // Gemini Analysis
  gemini_analysis: {
    analyzed: true,
    analysis_timestamp: "2025-01-24T14:35:00Z",
    detailed_insights: ["..."],
    recommendations: ["..."]
  },

  // User Response
  user_acknowledged: false,
  user_feedback: null, // "legitimate"|"fraudulent"|"mistake"

  // Wallet Integration
  alert_pass_id: "alert_pass_456",

  // Metadata
  detected_at: "2025-01-24T14:30:00Z",
  status: "active" // active|resolved|dismissed
}
```

### 8. **health_insights** Collection

**Purpose**: Store health-spending correlation insights

```javascript
health_insights/{insightId} = {
  // Insight Info
  insight_id: "health_123",
  userId: "user123",

  // Analysis Period
  analysis_period: {
    start_date: "2025-01-01T00:00:00Z",
    end_date: "2025-01-31T23:59:59Z",
    period_type: "monthly" // weekly|monthly|quarterly
  },

  // Correlation Data
  correlation_type: "stress_spending", // stress_spending|travel_health|meeting_food
  correlation_strength: 75, // 0-100
  correlation_found: true,

  // Insights
  correlation_factors: [
    "High meeting density correlates with increased food spending",
    "Back-to-back meetings lead to 40% more food delivery orders"
  ],

  // Data Analysis
  spending_data: {
    total_amount: 25000,
    category_breakdown: {
      food: 15000,
      shopping: 8000,
      entertainment: 2000
    },
    stress_periods: [
      {
        period: "2025-01-15 to 2025-01-20",
        meeting_count: 25,
        spending_increase: "45%"
      }
    ]
  },

  // Calendar Data
  calendar_data: {
    total_meetings: 45,
    avg_meeting_duration: 60,
    back_to_back_days: 8,
    weekend_work: 2
  },

  // Recommendations
  health_insights: [
    "Consider meal prep during busy weeks",
    "Schedule buffer time between meetings"
  ],
  recommendations: [
    "Set up automatic healthy meal delivery",
    "Block calendar for lunch breaks"
  ],

  // Wallet Integration
  health_pass_id: "health_pass_789",

  // Metadata
  generated_at: "2025-01-31T09:00:00Z",
  status: "active" // active|archived
}
```

### 9. **notifications** Collection

**Purpose**: Track all notifications sent to users

```javascript
notifications/{notificationId} = {
  // Notification Info
  notification_id: "notif_123",
  userId: "user123",

  // Notification Details
  type: "anomaly_alert", // anomaly_alert|travel_alert|price_change|health_insight|correlation_found
  title: "Unusual Spending Detected",
  message: "You spent ₹5000 at Electronics Store - 5x your average",

  // Related Data
  related_id: "anom_123", // ID of related anomaly/trip/etc
  related_type: "anomaly",

  // Delivery
  delivery_method: "websocket", // websocket|push|email
  delivered_at: "2025-01-24T14:35:00Z",

  // User Interaction
  read: false,
  read_at: null,
  action_taken: null, // dismissed|acknowledged|acted_upon

  // Metadata
  created_at: "2025-01-24T14:35:00Z",
  expires_at: "2025-01-31T14:35:00Z"
}
```

---

## 🔍 Indexes Required

### Firestore Composite Indexes

```javascript
// For transaction queries
{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "timestamp", order: "DESCENDING" }
  ]
}

{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "category", order: "ASCENDING" },
    { field: "timestamp", order: "DESCENDING" }
  ]
}

// For correlation queries
{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "timestamp", order: "ASCENDING" },
    { field: "amount", order: "ASCENDING" }
  ]
}

// For trip queries
{
  collection: "trips",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "status", order: "ASCENDING" },
    { field: "start_date", order: "DESCENDING" }
  ]
}

// For anomaly queries
{
  collection: "anomalies",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "detected_at", order: "DESCENDING" }
  ]
}

// For reminder queries
{
  collection: "reminders",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "next_due_date", order: "ASCENDING" }
  ]
}

{
  collection: "reminders",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "status", order: "ASCENDING" },
    { field: "next_due_date", order: "ASCENDING" }
  ]
}

// For health insights queries
{
  collection: "health_insights",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "generated_at", order: "DESCENDING" }
  ]
}

// For notifications queries
{
  collection: "notifications",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "created_at", order: "DESCENDING" }
  ]
}

{
  collection: "notifications",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "read", order: "ASCENDING" },
    { field: "created_at", order: "DESCENDING" }
  ]
}
```

---

## 📊 Data Relationships

### Primary Relationships

-   **users** ← **transactions** (userId)
-   **users** ← **trips** (userId)
-   **transactions** ← **trips** (expenses array)
-   **users** ← **anomalies** (userId)
-   **transactions** ← **anomalies** (transaction_id)
-   **users** ← **reminders** (userId)
-   **transactions** ← **reminders** (related_transactions array)
-   **users** ← **health_insights** (userId)
-   **users** ← **notifications** (userId)

### Data Flow

1. **Transaction Created** → Triggers anomaly detection → Checks for recurring patterns → Creates/updates reminders
2. **Calendar Event** → Triggers travel detection → Creates trip → Associates expenses
3. **Anomaly Detected** → Creates notification → Creates wallet pass
4. **Reminder Due** → Sends notification → Creates reminder wallet pass
5. **Weekly Schedule** → Triggers health analysis → Creates insights → Creates notification

---

## 🔒 Security Rules

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /transactions/{transactionId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    match /trips/{tripId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
    
    match /reminders/{reminderId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
    
    match /anomalies/{anomalyId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
    
    match /health_insights/{insightId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
    
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

This database structure supports all the features in Project Raseed including receipt processing, correlation, anomaly detection, travel planning, health insights, and Google Wallet integration.
