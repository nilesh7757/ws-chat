const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';
  
  if (!process.env.MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI environment variable is not set!");
    console.warn("Using default MongoDB URI: mongodb://localhost:27017/chat-app");
    console.warn("Please create a .env file in the ws-server directory with:");
    console.warn("MONGODB_URI=mongodb://localhost:27017/chat-app");
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Please make sure MongoDB is running or set the correct MONGODB_URI");
    process.exit(1);
  }
}

module.exports = { connectDB };
