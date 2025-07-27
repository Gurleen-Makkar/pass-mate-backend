const axios = require('axios');

class GeminiClient {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

        // Configure axios client
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    // Generic method to call Gemini API
    async callGemini(contents, model = 'gemini-2.5-flash') {
        try {
            if (!this.apiKey) {
                throw new Error('Gemini API key not found in environment variables');
            }

            const url = `/${model}:generateContent`;

            const requestBody = {
                contents,
            };

            console.log(`🤖 Calling Gemini API with model: ${model}`);

            const response = await this.client.post(url, requestBody, {
                params: { key: this.apiKey }
            });

            if (response.data.error) {
                throw new Error(`Gemini API error: ${response.data.error.message}`);
            }

            if (!response.data.candidates || !response.data.candidates[0]) {
                throw new Error('No response from Gemini API');
            }

            const generatedText = response.data.candidates[0].content.parts[0].text;
            console.log('✅ Gemini API response received');

            return generatedText;

        } catch (error) {
            if (error.response) {
                console.error('❌ Gemini API error:', error.response.data);
                throw new Error(`Gemini API error: ${error.response.data.error?.message || 'Unknown error'}`);
            } else if (error.request) {
                console.error('❌ Network error:', error.message);
                throw new Error('Network error calling Gemini API');
            } else {
                console.error('❌ Gemini client error:', error.message);
                throw error;
            }
        }
    }
}

// Export singleton instance and the callGemini method
const geminiClient = new GeminiClient();

module.exports = {
    callGemini: geminiClient.callGemini.bind(geminiClient),
    geminiClient
};
