const express = require("express");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./lib/db");
const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'WebSocket server is running' });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
const clients = new Map(); // socket -> { email, room }
const rooms = new Map();   // roomId -> Set<socket>
const userSockets = new Map(); // email -> Set<socket>

function getRoomId(email1, email2) {
  return [email1, email2].sort().join('+');
}

// Function to add contact for a user
async function addContactForUser(userEmail, contactEmail) {
  try {
    // Get the current user
    const currentUser = await User.findOne({ email: userEmail });
    if (!currentUser) return;

    // Get the contact user details
    const contactUser = await User.findOne({ email: contactEmail }).select('name email image');
    
    // Prepare contact data
    const contactData = {
      email: contactEmail,
      name: contactUser?.name || contactEmail.split('@')[0],
      image: contactUser?.image || null,
      found: !!contactUser
    };

    // Initialize contacts array if it doesn't exist
    if (!currentUser.contacts) {
      currentUser.contacts = [];
    }

    // Check if contact already exists
    const contactExists = currentUser.contacts.some(
      (contact) => contact.email === contactEmail
    );

    if (!contactExists) {
      currentUser.contacts.push(contactData);
      await currentUser.save();
      console.log(`✅ Added ${contactEmail} to ${userEmail}'s contacts`);
    }
  } catch (error) {
    console.error(`❌ Error adding contact for ${userEmail}:`, error);
  }
}

// Function to check if a user is in another user's contact list
async function isInContactList(userEmail, contactEmail) {
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user || !user.contacts) return false;
    
    return user.contacts.some(contact => contact.email === contactEmail);
  } catch (error) {
    console.error(`❌ Error checking contact list for ${userEmail}:`, error);
    return false;
  }
}

// Function to send notification about new message from unknown user
async function notifyUnknownMessage(recipientEmail, senderEmail, messageText) {
  try {
    console.log(`🔔 Sending unknown message notification to ${recipientEmail} from ${senderEmail}`);
    const senderUser = await User.findOne({ email: senderEmail }).select('name email image');
    const senderName = senderUser?.name || senderEmail.split('@')[0];
    
    const notificationPayload = JSON.stringify({
      type: "unknown_message",
      from: senderEmail,
      fromName: senderName,
      fromImage: senderUser?.image || null,
      text: messageText,
      timestamp: new Date().toISOString()
    });

    // Send to all sockets of the recipient
    const recipientSockets = userSockets.get(recipientEmail);
    if (recipientSockets) {
      console.log(`📤 Found ${recipientSockets.size} sockets for ${recipientEmail}`);
      recipientSockets.forEach(socket => {
        if (socket.readyState === 1) { // WebSocket.OPEN
          socket.send(notificationPayload);
          console.log(`✅ Sent unknown message notification to ${recipientEmail}`);
        } else {
          console.log(`❌ Socket not ready for ${recipientEmail}, state: ${socket.readyState}`);
        }
      });
    } else {
      console.log(`❌ No sockets found for ${recipientEmail}`);
    }
  } catch (error) {
    console.error(`❌ Error sending unknown message notification:`, error);
  }
}

wss.on("connection", (socket) => {
  socket.on("message", async (data) => {
    try {
      const msg = JSON.parse(data);

      // STEP 1: Join Room
      if (msg.type === "join") {
        const { self, target } = msg;
        const roomId = getRoomId(self, target);
        clients.set(socket, { email: self, room: roomId });

        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        rooms.get(roomId).add(socket);

        // Track user sockets for notifications
        if (!userSockets.has(self)) userSockets.set(self, new Set());
        userSockets.get(self).add(socket);

        console.log(`✅ ${self} joined ${roomId}`);

        // Send chat history
        const history = await Message.find({ roomId }).sort({ createdAt: 1 });
        socket.send(JSON.stringify({ type: 'history', messages: history }));
        return;
      }

      // STEP 2: Send message
      if (msg.type === "chat") {
        const client = clients.get(socket);
        const roomId = client.room;

        // Save to DB
        const messageData = {
          roomId,
          from: client.email,
          text: msg.text,
        };
        if (msg.file) messageData.file = msg.file;
        const saved = await Message.create(messageData);

        const payloadData = {
          type: "chat",
          from: client.email,
          text: msg.text,
          createdAt: saved.createdAt,
        };
        if (msg.file) payloadData.file = msg.file;
        const payload = JSON.stringify(payloadData);

        // Get the other user's email from the room
        const [email1, email2] = roomId.split('+');
        const otherUserEmail = client.email === email1 ? email2 : email1;

        console.log(`💬 Message from ${client.email} to ${otherUserEmail}`);

        // Check if the recipient has the sender in their contact list
        const isContact = await isInContactList(otherUserEmail, client.email);
        console.log(`👥 Is ${client.email} in ${otherUserEmail}'s contacts? ${isContact}`);

        // If not in contact list, send notification about unknown message
        if (!isContact) {
          console.log(`🚨 ${client.email} is NOT in ${otherUserEmail}'s contacts, sending unknown message notification`);
          await notifyUnknownMessage(otherUserEmail, client.email, msg.text);
        } else {
          console.log(`✅ ${client.email} is already in ${otherUserEmail}'s contacts`);
        }

        // Automatically add contacts for both users
        await addContactForUser(client.email, otherUserEmail);
        await addContactForUser(otherUserEmail, client.email);

        // Send notification to both users about contact addition
        const contactAddedPayload = JSON.stringify({
          type: "contact_added",
          message: `Added ${otherUserEmail} to contacts`
        });

        for (let member of rooms.get(roomId)) {
          member.send(payload);
          member.send(contactAddedPayload);
        }
      }
    } catch (err) {
      console.error("❌ WS Error:", err);
    }
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info && rooms.has(info.room)) {
      rooms.get(info.room).delete(socket);
    }
    
    // Remove socket from userSockets tracking
    if (info) {
      const userSocketSet = userSockets.get(info.email);
      if (userSocketSet) {
        userSocketSet.delete(socket);
        if (userSocketSet.size === 0) {
          userSockets.delete(info.email);
        }
      }
    }
    
    clients.delete(socket);
  });
});
