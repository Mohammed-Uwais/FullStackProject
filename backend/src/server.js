const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const problemRoutes = require('./routes/problem.routes');
const submissionRoutes = require('./routes/submission.routes');

const app = express();
const PORT = process.env.PORT || 5000;


// Global Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoose = require('mongoose');

// Health Check API
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'online',
    service: 'College DailyCoding Core API',
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: dbState === 1,
      host: mongoose.connection.host || 'MongoDB Atlas'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);

// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Exception Handler]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server after database connection
const startServer = async () => {
  try {
    console.log('[Server] Connecting to MongoDB Atlas before binding port...');
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[Server] College DailyCoding API running on port ${PORT}`);
      console.log(`[Server] Database is ready for Staff Problem Bank & Student submissions.`);
    });
  } catch (err) {
    console.error('[Server Fatal] Could not start server because database connection failed:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
