const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with PostgreSQL
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'tubewise',
  password: process.env.DB_PASSWORD || 'tubewise123',
  database: process.env.DB_NAME || 'tubewise',
  logging: false
});

// Define Comparison model
const Comparison = sequelize.define('Comparison', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  videoIds: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },
  commonTopics: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  differences: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  recommendation: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// Sync models with database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Failed to sync database:', error);
  }
};

module.exports = {
  sequelize,
  Comparison,
  syncDatabase
};
