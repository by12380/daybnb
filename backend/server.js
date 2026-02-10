require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const { initializeSocket } = require("./src/socket");

const PORT = process.env.PORT || 5000;

// Create an HTTP server from the Express app so Socket.IO can share it
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`
  ┌────────────────────────────────────────────┐
  │                                            │
  │   Daybnb API Server                        │
  │   Running on http://localhost:${PORT}        │
  │   Environment: ${(process.env.NODE_ENV || "development").padEnd(24)}│
  │                                            │
  │   Health check: /api/health                │
  │   Socket.IO:    enabled                    │
  │                                            │
  └────────────────────────────────────────────┘
  `);
});
