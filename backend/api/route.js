const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { Conversation, Message } = require('./model');

// Chat endpoints
router.post('/chat', controller.handleChat);
router.get('/models/status', controller.getModelsStatus);

// Conversation endpoints (Task 2)
router.get('/conversations', controller.getConversations);
router.get('/conversations/:id', controller.getConversationById);
router.delete('/conversations/:id', controller.deleteConversation);

// Test endpoints
router.get('/test', (req, res) => {
    res.json({
        message: 'PolyChat API is working!',
        status: 'OK',
        availableModels: ['gemini-2.5', 'gpt-4o', 'cohere'],
        timestamp: new Date().toISOString()
    });
});

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Database test endpoints
router.get('/db/status', async (req, res) => {
    const mongoose = require('mongoose');
    try {
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        res.json({
            status: states[state],
            database: mongoose.connection.name || 'N/A',
            models: Object.keys(mongoose.models),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/db/conversations', async (req, res) => {
    try {
        const conversations = await Conversation.find()
            .sort({ updatedAt: -1 })
            .limit(10);
        
        res.json({
            count: conversations.length,
            conversations: conversations
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/db/messages', async (req, res) => {
    try {
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(20);
        
        res.json({
            count: messages.length,
            messages: messages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/db/clear', async (req, res) => {
    try {
        await Message.deleteMany({});
        await Conversation.deleteMany({});
        
        res.json({
            message: 'All conversations and messages deleted',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
