const mongoose = require('mongoose');

/**
 * Conversation Schema
 * Stores metadata about each conversation/chat
 */
const conversationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: String,
        default: 'default_user',
        index: true
    },
    messageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Automatically manage createdAt and updatedAt
});

/**
 * Message Schema
 * Stores individual messages within conversations
 */
const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    model: {
        type: String,
        enum: ['gpt-4o', 'gemini-2.5', 'claude-3.5', 'auto'],
        required: function() {
            return this.role === 'assistant';
        }
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    tokens: {
        prompt: {
            type: Number,
            default: 0
        },
        completion: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ updatedAt: -1 });
messageSchema.index({ conversationId: 1, timestamp: 1 });

// Virtual for getting messages of a conversation
conversationSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'conversationId'
});

// Update the updatedAt timestamp before saving
conversationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to increment message count
conversationSchema.methods.incrementMessageCount = async function() {
    this.messageCount += 1;
    this.updatedAt = Date.now();
    await this.save();
};

// Static method to get recent conversations
conversationSchema.statics.getRecent = function(userId, limit = 10) {
    return this.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
};

// Static method to get conversation with messages
conversationSchema.statics.getWithMessages = async function(conversationId) {
    const conversation = await this.findById(conversationId);
    if (!conversation) return null;
    
    const Message = mongoose.model('Message');
    const messages = await Message.find({ conversationId })
        .sort({ timestamp: 1 })
        .exec();
    
    return {
        ...conversation.toObject(),
        messages
    };
};

// Create models
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = {
    Conversation,
    Message
};
