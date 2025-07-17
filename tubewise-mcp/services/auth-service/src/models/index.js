const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Sequelize with SQLite for simplicity
// In production, this would use a more robust database like PostgreSQL
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './database.sqlite',
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  languagePreference: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'en'
  },
  subscriptionStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'free'
  },
  subscriptionPlan: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'free'
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync();
    console.log('Database synced successfully');
    
    // Create test user if it doesn't exist
    const testUser = await User.findOne({ where: { email: 'test@example.com' } });
    if (!testUser) {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user',
        credits: 10,
        languagePreference: 'en',
        subscriptionStatus: 'free',
        subscriptionPlan: 'free'
      });
      console.log('Test user created');
    }
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
};

// Export models and database functions
module.exports = {
  sequelize,
  User,
  syncDatabase
};
