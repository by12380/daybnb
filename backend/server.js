require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ┌────────────────────────────────────────────┐
  │                                            │
  │   Daybnb API Server                        │
  │   Running on http://localhost:${PORT}        │
  │   Environment: ${(process.env.NODE_ENV || "development").padEnd(24)}│
  │                                            │
  │   Health check: /api/health                │
  │                                            │
  └────────────────────────────────────────────┘
  `);
});
