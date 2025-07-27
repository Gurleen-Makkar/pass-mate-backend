# PassMate Backend - AI Personal Assistant for Google Wallet

PassMate Backend is a Node.js-based server that powers an intelligent AI personal assistant integrated with Google Wallet. It provides proactive financial insights, receipt processing, travel detection, spending anomaly alerts, and health pattern analysis using Google's Gemini Live API.

## Features

- **Unified Receipt Processing**: Handle receipts from images, emails, SMS, voice, and audio inputs
- **Real-time AI Processing**: Google Gemini Live API integration for voice interactions and intelligent analysis
- **Proactive Services**: Automatic travel detection, spending anomaly alerts, and health pattern analysis
- **Correlation Engine**: Automatically match transactions from different sources (SMS + Email + Photo)
- **Google Wallet Integration**: Create and manage wallet passes for receipts, travel, insights, and alerts
- **WebSocket Communication**: Real-time notifications and voice processing
- **Firebase Integration**: Secure data storage and user management
- **Scheduled Monitoring**: Background services for flight prices, subscriptions, and health analysis
- **Webhook Endpoints**: External integrations for calendar, Gmail, and SMS notifications

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Real-time Communication**: WebSocket (ws library)
- **AI Integration**: Google Gemini Live API
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Processing**: Multer for uploads
- **Scheduling**: Node-cron for background jobs
- **HTTP Client**: Axios for external API calls

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Firebase project with Firestore enabled
- Google Gemini API key
- Google Wallet API credentials (for wallet pass creation)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Gurleen-Makkar/pass-mate-backend.git
cd pass-mate-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com

# Google APIs
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_WALLET_ISSUER_ID=your_wallet_issuer_id
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_FLIGHTS_API_KEY=your_flights_api_key

# WebSocket Configuration
WS_PORT=8080

# Security
JWT_SECRET=your_jwt_secret_key
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 4. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Create a service account and download the JSON key
4. Add the service account credentials to your `.env` file

### 5. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will be available at:
- **HTTP API**: `http://localhost:8080`
- **WebSocket**: `ws://localhost:8080`
- **Health Check**: `http://localhost:8080/`

## API Endpoints

### Core Receipt Processing

#### POST /api/receipts
Process receipts from various input types

**Request Body**:
```json
{
  "type": "image|email|sms|voice|audio",
  "data": "base64_image_data|email_content|sms_text|voice_transcript|audio_data",
  "metadata": {
    "location": "lat,lng",
    "timestamp": "ISO_string",
    "source": "mobile_app|email_listener|sms_webhook"
  }
}
```

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "transaction_id",
    "merchant": "McDonald's",
    "amount": 250,
    "currency": "INR",
    "category": "Food & Dining",
    "items": ["Big Mac", "Fries", "Coke"],
    "date": "2025-01-27T14:30:00Z"
  },
  "wallet_pass_url": "https://pay.google.com/gp/v/save/..."
}
```

### Analytics & Insights

#### GET /api/receipts/transactions
Get user transactions with filtering

**Query Parameters**:
- `userId`: User ID (required)
- `category`: Filter by category
- `dateFrom`: Start date (ISO string)
- `dateTo`: End date (ISO string)
- `limit`: Number of results (default: 50)

#### GET /api/receipts/analytics
Get spending analytics and insights

**Query Parameters**:
- `userId`: User ID (required)
- `period`: Analysis period (week|month|year)

### Health Check

#### GET /api/health
Server health status

#### GET /
Basic server information

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8080?userId=user123');
```

### Supported Events

#### Voice Input Processing
```json
{
  "type": "voice_input",
  "data": {
    "audio": "base64_audio_data",
    "session_id": "session_123"
  }
}
```

#### Real-time Notifications
```json
{
  "type": "notification",
  "data": {
    "title": "Travel Alert",
    "message": "Flight booking needed for Mumbai trip",
    "action_type": "travel_booking",
    "data": {...}
  }
}
```

## Webhook Endpoints

### Calendar Integration
#### POST /webhooks/calendar
Receives Google Calendar event notifications for travel detection

### Email Integration  
#### POST /webhooks/gmail
Process receipt emails automatically

### SMS Integration
#### POST /webhooks/sms
Process transaction SMS notifications

## Project Structure

```
src/
├── controllers/           # Request handlers
│   ├── receiptController.js
│   └── analyticsController.js
├── services/             # Business logic
│   ├── geminiService.js     # Gemini API integration
│   ├── geminiLiveService.js # Gemini Live API for voice
│   ├── firebaseService.js   # Firebase operations
│   ├── walletService.js     # Google Wallet integration
│   ├── correlationService.js # Transaction correlation
│   ├── anomalyDetector.js   # Spending anomaly detection
│   ├── flightMonitor.js     # Flight price monitoring
│   ├── healthAnalyzer.js    # Health pattern analysis
│   └── notificationService.js # Real-time notifications
├── routes/               # API routes
│   ├── index.js
│   ├── receiptRoutes.js
│   └── reminderRoutes.js
├── config/               # Configuration
│   └── firebase.js
└── client/               # API clients
    └── geminiClient.js
```

## Background Services

### Scheduled Jobs

The server runs several background services:

- **Flight Price Monitoring**: Every 6 hours
- **Health Pattern Analysis**: Weekly on Mondays at 9 AM
- **Subscription Reminders**: Daily at 10 AM
- **Anomaly Detection**: Triggered on new transactions

### Proactive Features

1. **Travel Detection**: Monitors calendar events for travel needs
2. **Spending Anomalies**: Alerts for unusual spending patterns
3. **Price Monitoring**: Tracks flight prices for detected trips
4. **Health Insights**: Correlates spending with calendar stress patterns
5. **Correlation Engine**: Matches transactions from different sources

## Gemini Live API Integration

The server supports real-time voice processing using Google's Gemini Live API:

- **Voice-to-Text**: Convert audio input to text
- **Function Calling**: Execute expense logging functions
- **Real-time Responses**: Provide immediate feedback
- **Session Management**: Handle multiple concurrent voice sessions

## Firebase Database Schema

### Collections

#### transactions
```javascript
{
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
  anomaly_score: number
}
```

#### trips
```javascript
{
  userId: string,
  destination: string,
  origin: string,
  start_date: timestamp,
  end_date: timestamp,
  flight_prices: array,
  status: 'detected|booked|completed'
}
```

#### users
```javascript
{
  profile: { name, email, home_location, preferences },
  settings: { notification_preferences, spending_limits }
}
```

## Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment

1. **Build and Deploy**:
   ```bash
   npm start
   ```

2. **Environment Variables**: Ensure all production environment variables are set

3. **Google Cloud Run** (recommended):
   ```bash
   gcloud run deploy passmate-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Security Features

- **CORS Protection**: Configured for frontend origins
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses
- **Environment Isolation**: Separate configs for dev/production
- **Firebase Security Rules**: Database access control

## Monitoring & Logging

- **Health Endpoints**: Server status monitoring
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Request/response timing
- **WebSocket Monitoring**: Connection status tracking

## Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite (placeholder)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## Documentation

Detailed documentation available in the `docs/` directory:

- [Backend Design](docs/BACKEND_DESIGN.md) - Architecture and design decisions
- [Database Structure](docs/DATABASE_STRUCTURE.md) - Firestore schema details
- [Gemini Live API Integration](docs/GEMINI_LIVE_API_INTEGRATION.md) - Voice processing setup
- [Implementation Tasks](docs/IMPLEMENTATION_TASKS_COMPLETE.md) - Development roadmap

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in the `docs/` directory
- Review the Google Gemini API documentation
- Check Firebase documentation for database issues

## License

This project is licensed under the ISC License.

---

*PassMate Backend is an experimental showcase of Google's Gemini Live API and Wallet integration capabilities, designed to demonstrate proactive AI-driven financial assistance.*
