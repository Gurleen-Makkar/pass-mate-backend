const { callGemini } = require('../client/geminiClient');

class GeminiService {
    constructor() {
        this.models = {
            FLASH: 'gemini-2.5-flash',
            PRO: 'gemini-2.5-pro',
        };
        this.currentModel = this.models.FLASH;
    }

    setModel(modelName) {
        if (this.models[modelName]) {
            this.currentModel = this.models[modelName];
            console.log(`🤖 Switched to model: ${this.currentModel}`);
        } else {
            console.warn(`⚠️  Model ${modelName} not found. Available models:`, Object.keys(this.models));
        }
    }

    async processExpenseInput(inputData) {
        try {
            const { type, data, metadata = {} } = inputData;

            console.log(`💰 Processing ${type} expense input...`);

            let prompt, parts;

            switch (type) {
                case 'image':
                    return await this.processImageInput(data, metadata);
                case 'audio':
                    return await this.processAudioInput(data, metadata);
                case 'text':
                    return await this.processTextInput(data, metadata);
                case 'email':
                    return await this.processEmailInput(data, metadata);
                default:
                    throw new Error(`Unsupported input type: ${type}`);
            }

        } catch (error) {
            console.error('❌ Expense processing error:', error.message);
            throw new Error(`Failed to process ${inputData.type} input: ${error.message}`);
        }
    }

    async processImageInput(imageData, metadata) {
        const prompt = `Extract expense data from this image and return ONLY a valid JSON object:
{
  "expense_detected": boolean,
  "merchant": "store/restaurant name" or null,
  "amount": number or null,
  "currency": "currency code (e.g., INR, USD)" or null,
  "items": [{"name": "item", "quantity": number, "price": number}] or [],
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ format" or null,
  "category": "food|shopping|transport|entertainment|other" or null,
  "confidence": number (0-100),
  "action_type": "expense|deletion|query",
  "deletion_target": "specific item to delete" or null
}`;

        // Extract base64 and mime type from imageData object
        const base64Data = typeof imageData === 'string' ? imageData : imageData.base64;
        const mimeType = typeof imageData === 'string' ? 'image/jpeg' : (imageData.mimeType || 'image/jpeg');

        const parts = [
            { text: prompt },
            {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            }
        ];

        const contents = [{ parts }];
        const response = await callGemini(contents, this.currentModel);
        return this.parseUnifiedResponse(response, 'image', metadata);
    }

    async processAudioInput(audioData, metadata) {
        const prompt = `Extract expense information from this audio and return ONLY a valid JSON object:
{
  "expense_detected": boolean,
  "merchant": "store/restaurant name" or null,
  "amount": number or null,
  "currency": "currency code (e.g., INR, USD)" or null,
  "category": "food|shopping|transport|entertainment|other" or null,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ format" or null,
  "confidence": number (0-100),
  "action_type": "expense|deletion|query",
  "deletion_target": "specific item to delete" or null,
  "transcript": "what the user said"
}`;

        // Extract base64 and mime type from audioData object
        const base64Data = typeof audioData === 'string' ? audioData : audioData.base64;
        const mimeType = typeof audioData === 'string' ? 'audio/mp3' : (audioData.mimeType || 'audio/mp3');

        const parts = [
            { text: prompt },
            {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            }
        ];

        const contents = [{ parts }];
        const response = await callGemini(contents, this.currentModel);
        return this.parseUnifiedResponse(response, 'audio', metadata);
    }

    async processTextInput(text, metadata) {
        const prompt = `Extract expense information from this text: "${text}"

Return ONLY a JSON object:
{
  "expense_detected": boolean,
  "merchant": "store/restaurant name" or null,
  "amount": number or null,
  "currency": "currency code (e.g., INR, USD)" or null,
  "category": "food|shopping|transport|entertainment|other" or null,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ format" or null,
  "confidence": number (0-100),
  "action_type": "expense|deletion|query",
  "deletion_target": "specific item to delete" or null
}`;

        const contents = [{ parts: [{ text: prompt }] }];
        const response = await callGemini(contents, this.currentModel);
        return this.parseUnifiedResponse(response, 'text', metadata);
    }

    async processEmailInput(emailData, metadata) {
        const prompt = `Extract expense/transaction information from this email:

Subject: ${emailData.subject}
From: ${emailData.sender}
Body: ${emailData.body}

Return ONLY a JSON object:
{
  "expense_detected": boolean,
  "merchant": "store/service name" or null,
  "amount": number or null,
  "currency": "currency code (e.g., INR, USD)" or null,
  "category": "food|shopping|transport|entertainment|other" or null,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ format" or null,
  "confidence": number (0-100),
  "action_type": "expense|deletion|query",
  "deletion_target": "specific item to delete" or null,
  "items": [{"name": "item", "quantity": number, "price": number}] or [],
  "order_id": "order/transaction ID" or null
}`;

        const contents = [{ parts: [{ text: prompt }] }];
        const response = await callGemini(contents, this.currentModel);
        return this.parseUnifiedResponse(response, 'email', metadata);
    }

    parseUnifiedResponse(responseText, inputType, metadata) {
        try {
            let jsonText = responseText.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            // Fix common JSON issues
            jsonText = jsonText.replace(/\n/g, ' '); // Remove newlines
            // jsonText = jsonText.replace(/\s+/g, ' '); // Normalize whitespace
            jsonText = jsonText.replace(/,\s*}/g, '}'); // Remove trailing commas before }
            jsonText = jsonText.replace(/,\s*]/g, ']'); // Remove trailing commas before ]

            const parsedData = JSON.parse(jsonText);

            // Add metadata
            parsedData.input_type = inputType;
            parsedData.processed_at = new Date().toISOString();
            parsedData.location = metadata.location || null;

            // Set defaults
            parsedData.expense_detected = parsedData.expense_detected || false;
            parsedData.confidence = parsedData.confidence || 0;
            parsedData.action_type = parsedData.action_type || 'expense';
            parsedData.currency = parsedData.currency || 'INR';

            return parsedData;

        } catch (error) {
            console.error('❌ Failed to parse response:', error.message);
            return {
                expense_detected: false,
                merchant: null,
                amount: null,
                currency: 'INR',
                category: null,
                timestamp: null,
                confidence: 0,
                action_type: 'expense',
                deletion_target: null,
                input_type: inputType,
                processed_at: new Date().toISOString(),
                location: metadata.location || null,
                parsing_error: error.message,
                raw_response: responseText
            };
        }
    }

    async analyzeAnomalies(transaction, baseline, simpleAnomalies) {
        const prompt = `Analyze this transaction for anomalies:

Transaction: ${JSON.stringify(transaction, null, 2)}
User Baseline: ${JSON.stringify(baseline, null, 2)}
Simple Analysis: ${JSON.stringify(simpleAnomalies, null, 2)}

Provide detailed analysis in JSON format:
{
  "anomaly_detected": boolean,
  "anomaly_score": number (0-100),
  "anomaly_reasons": ["detailed reason 1", "detailed reason 2"],
  "potential_causes": ["cause1", "cause2"],
  "risk_level": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`;

        const contents = [{ parts: [{ text: prompt }] }];
        const response = await callGemini(contents, this.currentModel);

        try {
            const analysis = this.parseAnalysisResponse(response);
            analysis.simple_check = false;
            return analysis;
        } catch (error) {
            return simpleAnomalies; // Fallback to simple analysis
        }
    }

    // Flexible correlation analysis
    async analyzeCorrelations(data, correlationType) {
        try {
            console.log(`🔗 Analyzing ${correlationType} correlations...`);

            const prompt = `Analyze correlations in this data for ${correlationType}:

Data: ${JSON.stringify(data, null, 2)}

Return analysis in JSON format:
{
  "correlation_found": boolean,
  "correlation_strength": number (0-100),
  "correlation_factors": ["factor1", "factor2"],
  "insights": ["insight1", "insight2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await callGemini(contents, this.currentModel);
            return this.parseAnalysisResponse(response);

        } catch (error) {
            console.error('❌ Correlation analysis error:', error.message);
            return {
                correlation_found: false,
                correlation_strength: 0,
                correlation_factors: [],
                insights: ['Analysis temporarily unavailable'],
                recommendations: ['Please try again later']
            };
        }
    }

    parseAnalysisResponse(responseText) {
        try {
            let jsonText = responseText.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('❌ Failed to parse analysis response:', error.message);
            return {
                error: 'Failed to parse response',
                raw_response: responseText
            };
        }
    }

    getAvailableModels() {
        return this.models;
    }

    getCurrentModel() {
        return this.currentModel;
    }
}

module.exports = new GeminiService();
