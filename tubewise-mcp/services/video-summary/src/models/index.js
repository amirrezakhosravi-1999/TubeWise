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

// Define Video model
const Video = sequelize.define('Video', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  videoId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

// Define Summary model
const Summary = sequelize.define('Summary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  keyPoints: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  }
});

// Define relationships
Video.hasMany(Summary);
Summary.belongsTo(Video);

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
  Video,
  Summary,
  syncDatabase
};
