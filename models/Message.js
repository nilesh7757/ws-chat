const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId: String,
  from: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
