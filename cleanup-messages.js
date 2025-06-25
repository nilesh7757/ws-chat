const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';

const Message = require('./models/Message');

async function cleanup() {
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const result = await Message.deleteMany({ file: { $type: 'string' } });
  console.log('Deleted messages with string file field:', result.deletedCount);
  await mongoose.disconnect();
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
}); 