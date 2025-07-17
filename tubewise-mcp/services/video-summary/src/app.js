const express = require('express');
const { summaryController } = require('./controllers/summaryController');
const { syncDatabase } = require('./models');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'video-summary' });
});

// Routes
app.post('/api/summarize', summaryController);

// Start server
const startServer = async () => {
  try {
    // Sync database models
    await syncDatabase();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Video Summary Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
