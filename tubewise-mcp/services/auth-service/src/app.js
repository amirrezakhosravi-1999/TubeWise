const express = require('express');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { authRoutes } = require('./routes/authRoutes');
const { syncDatabase } = require('./models');
const { configurePassport } = require('./config/passport');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());
configurePassport(passport);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Routes
app.use('/api/auth', authRoutes);

// Start server
const startServer = async () => {
  try {
    // Sync database models
    await syncDatabase();
    
    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
      console.log(`Authentication Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
