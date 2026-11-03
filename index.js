const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const trackingRoutes = require('./routes/trackingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const connectDB = require('./config/db');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// -----------------------------------------------
// CORS — only allow requests from your frontend
// -----------------------------------------------
const allowedOrigins = [
  "http://localhost:5173",          // Vite dev server
  "http://localhost:3000",
  "https://swift-express-frontend.vercel.app", // Replace with your actual Vercel URL
  process.env.FRONTEND_URL,         // Set in production environment
].filter(Boolean); // Remove undefined/null values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// -----------------------------------------------
// Health check
// -----------------------------------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -----------------------------------------------
// Routes
// -----------------------------------------------
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin',    adminRoutes);

// -----------------------------------------------
// 404 handler
// -----------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// -----------------------------------------------
// Global error handler
// -----------------------------------------------
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// -----------------------------------------------
// Connect DB then start server
// -----------------------------------------------
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
});