const mongoose = require('mongoose');

// Connection event handlers for continuous monitoring
mongoose.connection.on('connected', () => {
  console.log('[Database] MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database Error] MongoDB connection issue: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database Warning] MongoDB disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected successfully.');
});


const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/FSWADProject';

    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
    });

    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
