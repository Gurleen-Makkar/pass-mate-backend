# Gemini Live API Integration for Voice Processing

## Overview
This document outlines the integration of Google's Gemini Live API for real-time voice interactions in Project Raseed. The Live API enables conversational AI with interruptions, real-time responses, and function calling.

## API Differentiation

### Gemini 2.5 Flash (Regular API)
- **Use Case**: Image processing, text analysis, receipt extraction
- **Type**: Request-response model
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

### Gemini Live 2.5 Flash Preview (Live API)
- **Use Case**: Real-time voice conversations with function calling
- **Type**: WebSocket-based bidirectional streaming
- **Model**: `gemini-live-2.5-flash-preview`
- **Features**: Real-time audio, interruptions, function calling, asynchronous operations

## Live API Integration Architecture

### 1. Voice Processing Service
**File**: `src/services/geminiLiveService.js`

```javascript
const { GoogleGenAI, Modality, Behavior, FunctionResponseScheduling } = require('@google/genai');

class GeminiLiveService {
  constructor() {
    this.ai = new GoogleGenAI({});
    this.model = 'gemini-live-2.5-flash-preview';
    this.activeSessions = new Map(); // userId -> session
  }

  async initializeSession(userId) {
    // Define expense logging functions
    const expenseFunctions = [
      {
        name: "log_expense",
        description: "Log an expense transaction from voice input",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Amount spent" },
            merchant: { type: "string", description: "Merchant or store name" },
            category: { type: "string", description: "Expense category (food, transport, shopping, etc.)" },
            description: { type: "string", description: "Additional details about the expense" },
            timestamp: { type: "string", description: "When the expense occurred" }
          },
          required: ["amount", "merchant", "category"]
        },
        behavior: Behavior.NON_BLOCKING // Allow continued conversation
      },
      {
        name: "ask_clarification",
        description: "Ask for clarification when expense details are unclear",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string", description: "Question to ask the user" },
            missing_info: { type: "array", items: { type: "string" }, description: "What information is missing" }
          },
          required: ["question"]
        }
      },
      {
        name: "search_spending_history",
        description: "Search user's spending history for context",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query for spending history" },
            date_range: { type: "string", description: "Date range to search (e.g., 'last week', 'this month')" }
          },
          required: ["query"]
        }
      }
    ];

    const tools = [{ functionDeclarations: expenseFunctions }];
    
    const config = {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
      tools: tools
    };

    const session = await this.ai.live.connect({
      model: this.model,
      callbacks: {
        onopen: () => {
          console.log(`Live session opened for user: ${userId}`);
        },
        onmessage: (message) => {
          this.handleMessage(message, userId);
        },
        onerror: (error) => {
          console.error('Live API error:', error);
          this.handleError(error, userId);
        },
        onclose: (reason) => {
          console.log('Live session closed:', reason);
          this.activeSessions.delete(userId);
        }
      },
      config: config
    });

    this.activeSessions.set(userId, session);
    return session;
  }

  async handleMessage(message, userId) {
    if (message.serverContent && message.serverContent.modelTurn) {
      // Handle AI response
      const parts = message.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.text) {
          // Send text response to frontend via WebSocket
          this.sendToFrontend(userId, { 
            type: 'ai_response', 
            content: part.text,
            timestamp: new Date().toISOString()
          });
        }
        if (part.audio) {
          // Send audio response to frontend
          this.sendToFrontend(userId, { 
            type: 'ai_audio', 
            content: part.audio,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    if (message.toolCall) {
      // Handle function calls
      await this.handleFunctionCalls(message.toolCall, userId);
    }
  }

  async handleFunctionCalls(toolCall, userId) {
    const functionResponses = [];
    
    for (const fc of toolCall.functionCalls) {
      if (fc.name === 'log_expense') {
        // Process expense logging
        const expenseData = fc.args;
        const result = await this.logExpense(expenseData, userId);
        
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: result.success ? "Expense logged successfully" : "Failed to log expense",
            expenseId: result.expenseId,
            walletPassId: result.walletPassId,
            scheduling: FunctionResponseScheduling.INTERRUPT // Interrupt to confirm
          }
        });
      }
      
      if (fc.name === 'ask_clarification') {
        // Handle clarification requests
        const clarificationData = fc.args;
        
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: "Clarification question ready",
            scheduling: FunctionResponseScheduling.WHEN_IDLE
          }
        });
      }

      if (fc.name === 'search_spending_history') {
        // Search spending history
        const searchData = fc.args;
        const results = await this.searchSpendingHistory(searchData, userId);
        
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: "Spending history retrieved",
            data: results,
            scheduling: FunctionResponseScheduling.SILENT // Use data in conversation
          }
        });
      }
    }

    // Send function responses back to Live API
    const session = this.activeSessions.get(userId);
    if (session) {
      await session.sendToolResponse({ functionResponses });
    }
  }

  async logExpense(expenseData, userId) {
    try {
      // Store expense in Firestore
      const expense = {
        userId: userId,
        amount: expenseData.amount,
        merchant: expenseData.merchant,
        category: expenseData.category,
        description: expenseData.description || '',
        timestamp: expenseData.timestamp || new Date().toISOString(),
        source: 'voice_input',
        processed_at: new Date().toISOString()
      };

      // Save to Firestore (assuming firebaseService is available)
      const expenseId = await firebaseService.saveTransaction(expense);

      // Create Google Wallet pass
      const walletPass = await walletService.createReceiptPass({
        expenseId: expenseId,
        merchant: expenseData.merchant,
        amount: expenseData.amount,
        category: expenseData.category
      });

      // Trigger correlation service
      correlationService.findMatches(expense);

      return {
        success: true,
        expenseId: expenseId,
        walletPassId: walletPass.id
      };
    } catch (error) {
      console.error('Error logging expense:', error);
      return { success: false, error: error.message };
    }
  }

  async searchSpendingHistory(searchData, userId) {
    try {
      // Query Firestore for spending history
      const results = await firebaseService.getUserTransactions(userId, {
        query: searchData.query,
        dateRange: searchData.date_range
      });

      return {
        transactions: results,
        summary: {
          total_amount: results.reduce((sum, t) => sum + t.amount, 0),
          transaction_count: results.length
        }
      };
    } catch (error) {
      console.error('Error searching spending history:', error);
      return { error: error.message };
    }
  }

  sendToFrontend(userId, data) {
    // Send data to frontend via WebSocket
    const wsConnection = global.wsConnections?.get(userId);
    if (wsConnection) {
      wsConnection.send(JSON.stringify(data));
    }
  }

  handleError(error, userId) {
    this.sendToFrontend(userId, {
      type: 'error',
      message: 'Voice processing error occurred',
      error: error.message
    });
  }

  async sendAudioToSession(userId, audioData) {
    const session = this.activeSessions.get(userId);
    if (session) {
      await session.sendClientContent({
        turns: {
          parts: [{
            inlineData: {
              mimeType: 'audio/wav',
              data: audioData
            }
          }]
        }
      });
    }
  }

  async sendTextToSession(userId, text) {
    const session = this.activeSessions.get(userId);
    if (session) {
      await session.sendClientContent({
        turns: { parts: [{ text: text }] }
      });
    }
  }

  closeSession(userId) {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.close();
      this.activeSessions.delete(userId);
    }
  }
}

module.exports = new GeminiLiveService();
```

## API Endpoints for Live Voice Processing

### 1. Initialize Voice Session
```javascript
// POST /api/voice/session/start
app.post('/api/voice/session/start', async (req, res) => {
  try {
    const { userId } = req.body;
    const session = await geminiLiveService.initializeSession(userId);
    
    res.json({
      success: true,
      sessionId: session.id,
      message: 'Voice session initialized'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Send Audio to Live Session
```javascript
// POST /api/voice/audio
app.post('/api/voice/audio', upload.single('audio'), async (req, res) => {
  try {
    const { userId } = req.body;
    const audioData = req.file.buffer.toString('base64');
    
    await geminiLiveService.sendAudioToSession(userId, audioData);
    
    res.json({ success: true, message: 'Audio sent to Live API' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Send Text to Live Session
```javascript
// POST /api/voice/text
app.post('/api/voice/text', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    await geminiLiveService.sendTextToSession(userId, text);
    
    res.json({ success: true, message: 'Text sent to Live API' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Close Voice Session
```javascript
// POST /api/voice/session/close
app.post('/api/voice/session/close', async (req, res) => {
  try {
    const { userId } = req.body;
    
    geminiLiveService.closeSession(userId);
    
    res.json({ success: true, message: 'Voice session closed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## WebSocket Integration for Real-time Communication

```javascript
const WebSocket = require('ws');

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ port: 8080 });

// Store WebSocket connections
global.wsConnections = new Map();

wss.on('connection', (ws, req) => {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
  
  if (userId) {
    global.wsConnections.set(userId, ws);
    console.log(`WebSocket connected for user: ${userId}`);
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'voice_input') {
        // Handle voice input from frontend
        await geminiLiveService.sendAudioToSession(userId, data.audioData);
      } else if (data.type === 'text_input') {
        // Handle text input from frontend
        await geminiLiveService.sendTextToSession(userId, data.text);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    global.wsConnections.delete(userId);
    geminiLiveService.closeSession(userId);
    console.log(`WebSocket disconnected for user: ${userId}`);
  });
});
```

## Frontend Integration Example

```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8080?userId=user123');

ws.onopen = () => {
  console.log('Connected to voice processing service');
  
  // Initialize voice session
  fetch('/api/voice/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user123' })
  });
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'ai_response') {
    // Display AI text response
    displayAIResponse(data.content);
  } else if (data.type === 'ai_audio') {
    // Play AI audio response
    playAudioResponse(data.content);
  } else if (data.type === 'error') {
    // Handle errors
    showError(data.message);
  }
};

// Send voice input
function sendVoiceInput(audioBlob) {
  const reader = new FileReader();
  reader.onload = () => {
    const audioData = reader.result.split(',')[1]; // Remove data:audio/wav;base64,
    ws.send(JSON.stringify({
      type: 'voice_input',
      audioData: audioData
    }));
  };
  reader.readAsDataURL(audioBlob);
}

// Send text input
function sendTextInput(text) {
  ws.send(JSON.stringify({
    type: 'text_input',
    text: text
  }));
}
```

## Key Differences from Regular Gemini API

### 1. Connection Type
- **Regular API**: HTTP request-response
- **Live API**: WebSocket bidirectional streaming

### 2. Function Calling
- **Regular API**: Synchronous function execution
- **Live API**: Asynchronous with scheduling options (INTERRUPT, WHEN_IDLE, SILENT)

### 3. Audio Handling
- **Regular API**: No native audio support
- **Live API**: Real-time audio input/output with interruption capabilities

### 4. Conversation Flow
- **Regular API**: Stateless, each request independent
- **Live API**: Stateful conversation with context maintained

## Implementation Priority

### Day 1: Basic Live API Setup
1. Initialize Gemini Live service
2. Basic function calling for expense logging
3. WebSocket connection setup

### Day 2: Advanced Features
1. Asynchronous function calling
2. Audio processing integration
3. Real-time response handling

### Day 3: Integration
1. Connect with existing services (Firestore, Wallet)
2. Correlation engine integration
3. Error handling and recovery

This Live API integration enables natural voice conversations where users can interrupt the AI, get real-time responses, and have their expenses logged automatically through function calling.
