// WebSocket message types
const WS_MESSAGE_TYPES = {
  JOIN: "join",
  CHAT: "chat",
  DELIVERED: "delivered",
  SEEN: "seen",
  DELETE_FOR_ME: "delete_for_me",
  STATUS: "status",
  UNKNOWN_MESSAGE: "unknown_message",
  CONTACT_ADDED: "contact_added",
  HISTORY: "history",
  STATUS_UPDATE: "status_update",
};

// Message status values
const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  SEEN: "seen",
};

// Default delay for contact addition notification (ms)
const DEFAULT_CONTACT_ADDED_DELAY = process.env.CONTACT_ADDED_DELAY || 100;

// Default port (should be set via env, fallback here)
const DEFAULT_PORT = process.env.PORT || 3001;

module.exports = {
  WS_MESSAGE_TYPES,
  MESSAGE_STATUS,
  DEFAULT_CONTACT_ADDED_DELAY,
  DEFAULT_PORT,
}; 