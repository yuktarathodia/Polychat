const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CohereClient } = require('cohere-ai');
const { Conversation, Message } = require('./model');

// Initialize API clients
const githubModels = process.env.GITHUB_TOKEN 
    ? new OpenAI({
        baseURL: 'https://models.inference.ai.azure.com',
        apiKey: process.env.GITHUB_TOKEN
    })
    : null;

const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const cohere = process.env.COHERE_API_KEY 
    ? new CohereClient({ token: process.env.COHERE_API_KEY })
    : null;

// ============================================
// HISTORY FORMATTING FUNCTIONS
// ============================================

function formatHistoryForOpenAI(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return [];
    return chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

function formatHistoryForGemini(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return [];
    return chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));
}

function formatHistoryForCohere(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return [];
    return chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: msg.content
    }));
}

// ============================================
// MODEL API CALL FUNCTIONS
// ============================================

async function callGPT4oMini(prompt, chatHistory) {
    if (!githubModels) {
        throw new Error('GitHub Models not configured. Add GITHUB_TOKEN to .env');
    }

    console.log('Calling GPT-4o-mini via GitHub Models...');
    
    const messages = [
        ...formatHistoryForOpenAI(chatHistory),
        { role: 'user', content: prompt }
    ];

    const completion = await githubModels.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
    });

    return {
        response: completion.choices[0].message.content,
        model: 'gpt-4o',
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
    };
}

async function callGemini(prompt, chatHistory) {
    if (!genAI) {
        throw new Error('Gemini not configured. Add GEMINI_API_KEY to .env');
    }

    console.log('Calling Gemini 2.5 Flash...');
    
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash'
    });
    
    const chat = model.startChat({
        history: formatHistoryForGemini(chatHistory),
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    return {
        response: response.text(),
        model: 'gemini-2.5',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
}

async function callCohere(prompt, chatHistory) {
    if (!cohere) {
        throw new Error('Cohere not configured. Add COHERE_API_KEY to .env');
    }

    console.log('Calling Cohere Command-R...');
    
    const response = await cohere.chat({
        model: 'command-a-03-2025',
        message: prompt,
        chatHistory: formatHistoryForCohere(chatHistory),
        temperature: 0.7,
        maxTokens: 1000
    });

    return {
        response: response.text,
        model: 'cohere',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
}

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

/**
 * Save conversation and messages to MongoDB
 */
async function saveToDatabase(conversationId, userPrompt, assistantResponse, modelUsed, tokens) {
    try {
        let conversation;

        if (conversationId) {
            // Existing conversation
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
        } else {
            // New conversation - create with title from first prompt
            const title = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
            conversation = new Conversation({
                title: title,
                userId: 'default_user'
            });
            await conversation.save();
        }

        // Save user message
        const userMessage = new Message({
            conversationId: conversation._id,
            role: 'user',
            content: userPrompt,
            timestamp: new Date()
        });
        await userMessage.save();

        // Save assistant message
        const assistantMessage = new Message({
            conversationId: conversation._id,
            role: 'assistant',
            content: assistantResponse,
            model: modelUsed,
            timestamp: new Date(),
            tokens: {
                prompt: tokens.promptTokens,
                completion: tokens.completionTokens,
                total: tokens.totalTokens
            }
        });
        await assistantMessage.save();

        // Update conversation
        await conversation.incrementMessageCount();
        await conversation.incrementMessageCount();

        console.log(`✓ Saved to MongoDB - Conversation ID: ${conversation._id}`);

        return conversation._id;

    } catch (error) {
        console.error('❌ MongoDB save error:', error.message);
        // Don't fail the request if DB save fails
        return null;
    }
}

// ============================================
// MAIN HANDLER
// ============================================

/**
 * Main chat handler - routes to appropriate model and saves to DB
 */
async function handleChat(req, res) {
    try {
        const { model, prompt, chatHistory, conversationId } = req.body;

        // Validate required fields
        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Model and prompt are required'
            });
        }

        if (!prompt.trim()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Prompt cannot be empty'
            });
        }

        if (chatHistory && !Array.isArray(chatHistory)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'chatHistory must be an array'
            });
        }

        console.log(`\n=== Chat Request ===`);
        console.log(`Model: ${model}`);
        console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
        console.log(`History: ${chatHistory ? chatHistory.length : 0} messages`);
        console.log(`Conversation ID: ${conversationId || 'new'}`);

        let result;

        // Route to appropriate model
        switch (model) {
            case 'gpt-4o':
                result = await callGPT4oMini(prompt, chatHistory || []);
                break;
                
            case 'gemini-2.5':
                result = await callGemini(prompt, chatHistory || []);
                break;
                
            case 'cohere':
                result = await callCohere(prompt, chatHistory || []);
                break;
                
            default:
                return res.status(400).json({
                    error: 'Invalid Model',
                    message: `Model "${model}" is not supported. Available models: gpt-4o, gemini-2.5, cohere`
                });
        }

        // Add timestamp
        result.timestamp = new Date().toISOString();

        // Save to MongoDB
        const savedConversationId = await saveToDatabase(
            conversationId,
            prompt,
            result.response,
            result.model,
            {
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
                totalTokens: result.totalTokens
            }
        );

        // Add conversation ID to response
        if (savedConversationId) {
            result.conversationId = savedConversationId.toString();
        }

        console.log(`✓ Success - ${result.response.length} chars, ${result.totalTokens} tokens`);
        console.log(`===================\n`);

        res.status(200).json(result);

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            model: req.body?.model || 'unknown'
        });
    }
}

/**
 * Get status of all configured models
 */
function getModelsStatus(req, res) {
    try {
        const models = {
            'gpt-4o': {
                available: !!githubModels,
                name: 'GPT-4o Mini',
                provider: 'GitHub Models'
            },
            'gemini-2.5': {
                available: !!genAI,
                name: 'Gemini 2.5 Flash',
                provider: 'Google AI Studio'
            },
            'cohere': {
                available: !!cohere,
                name: 'Command-R',
                provider: 'Cohere'
            }
        };

        const availableCount = Object.values(models).filter(m => m.available).length;

        res.status(200).json({
            models: models,
            availableModels: availableCount,
            totalModels: 3,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in getModelsStatus:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
}

// Add these functions to the existing controller.js

/**
 * Get all conversations for sidebar
 */
async function getConversations(req, res) {
    try {
        const conversations = await Conversation.find()
            .sort({ updatedAt: -1 })
            .limit(20)
            .select('title updatedAt messageCount');

        res.status(200).json({
            conversations: conversations,
            count: conversations.length
        });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
}

/**
 * Get single conversation with all messages
 */
async function getConversationById(req, res) {
    try {
        const { id } = req.params;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Conversation not found'
            });
        }

        const messages = await Message.find({ conversationId: id })
            .sort({ timestamp: 1 });

        res.status(200).json({
            conversation: conversation,
            messages: messages
        });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
}

/**
 * Delete conversation and its messages
 */
async function deleteConversation(req, res) {
    try {
        const { id } = req.params;

        await Message.deleteMany({ conversationId: id });
        await Conversation.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
}

// Update module.exports to include new functions
module.exports = {
    handleChat,
    getModelsStatus,
    getConversations,
    getConversationById,
    deleteConversation
};
