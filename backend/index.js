const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const chatRoutes = require("./api/route");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (FIXED - removed deprecated options)
const connectToDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn("⚠️  MONGODB_URI not found in .env");
      console.warn("⚠️  Running without database connection");
      return;
    }

    const mongoUri = process.env.MONGODB_URI;
    
    // Connect without deprecated options
    await mongoose.connect(mongoUri);
    
    console.log("✓ Connected to MongoDB successfully");
    console.log(`✓ Database: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.warn("⚠️  Continuing without MongoDB");
  }
};

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

// Connect to database
connectToDatabase();

// Routes
app.use("/api", chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PolyChat API Server',
    status: 'running',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      models: '/api/models/status'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n=================================");
  console.log("🚀 PolyChat Backend Server");
  console.log("=================================");
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI ? '✓ Configured' : '✗ Not configured'}`);
  console.log("=================================\n");
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✓ MongoDB connection closed');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
