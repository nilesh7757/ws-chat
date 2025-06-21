const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set!");
    console.error("Please create a .env file in the ws-server directory with:");
    console.error("MONGODB_URI=mongodb://localhost:27017/chat-app");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ MongoDB connected");
}

module.exports = { connectDB };
