const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  url: String,
  name: String,
  type: String,
  size: Number
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  roomId: String,
  from: String,
  text: String,
  file: FileSchema,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
