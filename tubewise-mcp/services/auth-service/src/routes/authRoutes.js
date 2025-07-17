const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = await User.create({
      email,
      password, // In a real app, this would be hashed
      name,
      role: 'user',
      credits: 5, // Default credits for free tier
      languagePreference: 'en',
      subscriptionStatus: 'free',
      subscriptionPlan: 'free'
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );
    
    // Return user data and token
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
      credits: user.credits,
      languagePreference: user.languagePreference,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password (in a real app, this would compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );
    
    // Return user data and token
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
      credits: user.credits,
      languagePreference: user.languagePreference,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    credits: req.user.credits,
    languagePreference: req.user.languagePreference,
    subscriptionStatus: req.user.subscriptionStatus,
    subscriptionPlan: req.user.subscriptionPlan
  });
});

// OAuth login/register
router.post('/oauth', async (req, res) => {
  try {
    const { email, name, provider, providerId } = req.body;
    
    // Find or create user
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name,
        role: 'user',
        password: 'oauth-user', // Placeholder password for OAuth users
        credits: 5, // Default credits for free tier
        languagePreference: 'en',
        subscriptionStatus: 'free',
        subscriptionPlan: 'free',
        provider,
        providerId
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );
    
    // Return user data and token
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
      credits: user.credits,
      languagePreference: user.languagePreference,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { languagePreference } = req.body;
    
    // Update user
    await User.update(
      { languagePreference },
      { where: { id: req.user.id } }
    );
    
    // Return updated user
    const updatedUser = await User.findByPk(req.user.id);
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      credits: updatedUser.credits,
      languagePreference: updatedUser.languagePreference,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionPlan: updatedUser.subscriptionPlan
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export router
exports.authRoutes = router;
