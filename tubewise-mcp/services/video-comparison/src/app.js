const express = require('express');
const { compareController } = require('./controllers/compareController');
const { syncDatabase } = require('./models');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'video-comparison' });
});

// Routes
app.post('/api/compare', compareController);

// Start server
const startServer = async () => {
  try {
    // Sync database models
    await syncDatabase();
    
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
      console.log(`Video Comparison Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
