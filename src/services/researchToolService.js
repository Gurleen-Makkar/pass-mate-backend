/**
 *  Tool Service
 * 
 * A modular tool-based service for tasks.
 * This service provides a framework where tools can call other tools,
 * agents can call tools, and AI models can orchestrate the  flow.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService = require('./geminiService');

class ToolService {
    constructor() {
        // Registry of available tools
        this.tools = new Map();

        // Activesessions
        this.sessions = new Map();

        // Register built-in tools
        this.registerBuiltInTools();
    }

    /**
     * Register built-intools
     */
    registerBuiltInTools() {
        // Web search tool
        this.registerTool('web_search', async (params, context) => {
            console.log('🔍 Executing web search:', params.query);
            // Placeholder for actual web search implementation
            return {
                type: 'search_results',
                query: params.query,
                results: [
                    { title: 'Example result 1', snippet: 'This is an example search result' },
                    { title: 'Example result 2', snippet: 'This is another example search result' }
                ]
            };
        });

        // Credit card comparison tool
        this.registerTool('compare_credit_cards', async (params, context) => {
            console.log('💳 Comparing credit cards for:', params.category);
            // Placeholder for actual comparison implementation
            return {
                type: 'comparison_results',
                category: params.category,
                cards: [
                    { name: 'Example Card 1', features: ['No annual fee', '2% cashback'] },
                    { name: 'Example Card 2', features: ['Travel rewards', 'Sign-up bonus'] }
                ]
            };
        });

        // Feature extraction tool
        this.registerTool('extract_features', async (params, context) => {
            console.log('🔎 Extracting features for:', params.item);
            // Placeholder for actual feature extraction implementation
            return {
                type: 'feature_extraction',
                item: params.item,
                features: ['Feature 1', 'Feature 2', 'Feature 3']
            };
        });

        // AI analysis tool using Gemini
        this.registerTool('ai_analysis', async (params, context) => {
            console.log('🤖 Performing AI analysis on:', params.data);

            const prompt = `Analyze this data and provide insights:

${JSON.stringify(params.data, null, 2)}

Return analysis in JSON format:
{
"insights": ["insight1", "insight2"],
"recommendations": ["recommendation1", "recommendation2"]
}`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await geminiService.callGemini(contents, geminiService.models.FLASH);

            try {
                // Parse the response
                let jsonText = response.trim();
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }

                return JSON.parse(jsonText);
            } catch (error) {
                console.error('❌ Failed to parse AI analysis response:', error);
                return {
                    error: 'Failed to parse response',
                    raw_response: response
                };
            }
        });
    }

    /**
     * Register a new tool
     * @param {string} toolName - Name of the tool
     * @param {Function} handler - Tool handler function
     */
    registerTool(toolName, handler) {
        if (this.tools.has(toolName)) {
            console.warn(`⚠️ Tool ${toolName} already registered, overwriting`);
        }

        this.tools.set(toolName, handler);
        console.log(`🔧 Registered tool: ${toolName}`);
    }

    /**
     * Execute a tool
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} params - Tool parameters
     * @param {Object} context - Execution context
     * @returns {Object} Tool execution result
     */
    async executeTool(toolName, params, context = {}) {
        const tool = this.tools.get(toolName);

        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        try {
            console.log(`🔧 Executing tool: ${toolName}`);
            const result = await tool(params, context);
            return result;
        } catch (error) {
            console.error(`❌ Error executing tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * Start a newsession
     * @param {Object} request -request
     * @returns {Object} Session information
     */
    async startSession(request) {
        try {
            const { topic, context = {}, userId } = request;

            if (!topic) {
                throw new Error(' topic is required');
            }

            // Create a new session
            const sessionId = uuidv4();
            const session = {
                id: sessionId,
                topic,
                context,
                userId,
                status: 'initialized',
                startTime: new Date().toISOString(),
                steps: [],
                results: []
            };

            // Store the session
            this.sessions.set(sessionId, session);

            console.log(`🔍session started: ${sessionId} for topic: ${topic}`);

            return {
                sessionId,
                status: session.status,
                message: ' session initialized'
            };
        } catch (error) {
            console.error('❌ Error startingsession:', error);
            throw error;
        }
    }

    /**
     * Execute aplan using Gemini to determine next steps
     * @param {string} sessionId - ID of thesession
     * @returns {Object} Execution results
     */
    async executePlan(sessionId) {
        try {
            const session = this.sessions.get(sessionId);

            if (!session) {
                throw new Error(`Session not found: ${sessionId}`);
            }

            // Update session status
            session.status = 'in_progress';

            console.log(`🔍 Executing plan for session: ${sessionId}`);

            // Use Gemini to determine next steps
            const nextSteps = await this.determineNextSteps(session);

            if (!nextSteps || nextSteps.length === 0) {
                session.status = 'completed';
                return {
                    sessionId,
                    status: session.status,
                    message: 'Session completed',
                    results: session.results
                };
            }

            // Execute each step
            for (const step of nextSteps) {
                const stepResult = await this.executeStep(sessionId, step);
                session.steps.push({
                    ...step,
                    result: stepResult,
                    timestamp: new Date().toISOString()
                });
                session.results.push(stepResult);
            }

            // Check if more steps are needed
            const needsMoreSteps = await this.checkIfMoreStepsNeeded(session);

            if (!needsMoreSteps) {
                session.status = 'completed';
            }

            return {
                sessionId,
                status: session.status,
                stepsExecuted: nextSteps.length,
                results: session.results
            };
        } catch (error) {
            console.error(`❌ Error executing plan for session ${sessionId}:`, error);

            // Update session status to error
            const session = this.sessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.error = error.message;
            }

            throw error;
        }
    }

    /**
     * Determine nextsteps using Gemini
     * @param {Object} session - Session
     * @returns {Array} Next  steps
     */
    async determineNextSteps(session) {
        try {
            const { topic, results } = session;

            // Create a prompt for Gemini to determine next steps
            const prompt = `You are a  assistant. Based on the  topic and any existing results, 
determine the next 1-3  steps to take.

 Topic: ${topic}

${results.length > 0 ? `Existing Results: ${JSON.stringify(results, null, 2)}` : 'No existing results yet.'}

Return ONLY a valid JSON array of  steps in this format:
[
{
"tool": "tool_name",
"params": { "param1": "value1", "param2": "value2" },
"reason": "Why this step is necessary"
}
]

Available tools:
- web_search: Search the web for information. Params: { "query": "search query" }
- compare_credit_cards: Compare credit cards for a category. Params: { "category": "category name" }
- extract_features: Extract features from an item. Params: { "item": "item name" }
- ai_analysis: Analyze data with AI. Params: { "data": any_data_object }`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await geminiService.callGemini(contents, geminiService.models.FLASH);

            try {
                // Parse the response
                let jsonText = response.trim();
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

                const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }

                const steps = JSON.parse(jsonText);

                // Validate steps
                return steps.filter(step => {
                    if (!step.tool || !this.tools.has(step.tool)) {
                        console.warn(`⚠️ Invalid tool in  step: ${step.tool}`);
                        return false;
                    }
                    return true;
                });
            } catch (error) {
                console.error('❌ Failed to parse next steps response:', error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error determining next steps:', error);
            return [];
        }
    }

    /**
     * Execute a single  step
     * @param {string} sessionId - ID of the  session
     * @param {Object} step -  step to execute
     * @returns {Object} Step result
     */
    async executeStep(sessionId, step) {
        try {
            const session = this.sessions.get(sessionId);

            if (!session) {
                throw new Error(` session not found: ${sessionId}`);
            }

            console.log(`🔧 Executing  step: ${step.tool} for session: ${sessionId}`);

            // Execute the tool
            const result = await this.executeTool(step.tool, step.params, {
                sessionId,
                topic: session.topic,
                userId: session.userId
            });

            return {
                tool: step.tool,
                params: step.params,
                result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ Error executing  step for session ${sessionId}:`, error);
            return {
                tool: step.tool,
                params: step.params,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check if more  steps are needed
     * @param {Object} session -  session
     * @returns {boolean} Whether more steps are needed
     */
    async checkIfMoreStepsNeeded(session) {
        try {
            const { topic, results } = session;

            // Create a prompt for Gemini to determine if more steps are needed
            const prompt = `You are a assistant. Based on the  topic and existing results, 
determine if more  steps are needed.

 Topic: ${topic}

Existing Results: ${JSON.stringify(results, null, 2)}

Return ONLY a valid JSON object in this format:
{
"more_steps_needed": true/false,
"reason": "Explanation of why more steps are needed or not"
}`;

            const contents = [{ parts: [{ text: prompt }] }];
            const response = await geminiService.callGemini(contents, geminiService.models.FLASH);

            try {
                // Parse the response
                let jsonText = response.trim();
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }

                const decision = JSON.parse(jsonText);
                return decision.more_steps_needed === true;
            } catch (error) {
                console.error('❌ Failed to parse more steps decision:', error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking if more steps needed:', error);
            return false;
        }
    }

    /**
     * Get the status of a  session
     * @param {string} sessionId - ID of the  session
     * @returns {Object} Session status
     */
    getSessionStatus(sessionId) {
