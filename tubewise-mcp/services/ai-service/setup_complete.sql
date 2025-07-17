-- Complete setup script for TubeWise PostgreSQL database

-- Create database if not exists
CREATE DATABASE tubewise;

-- Connect to the tubewise database
\c tubewise;

-- Create user if not exists
DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tubewise') THEN
    CREATE USER tubewise WITH PASSWORD 'tubewise123';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE tubewise TO tubewise;
GRANT ALL PRIVILEGES ON SCHEMA public TO tubewise;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    credits INTEGER DEFAULT 5,
    is_pro BOOLEAN DEFAULT FALSE,
    language_preference VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255),
    url VARCHAR(255),
    duration INTEGER,
    channel_name VARCHAR(255),
    thumbnail_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_videos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    video_id INTEGER REFERENCES videos(id),
    category VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_summaries (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id),
    summary_text TEXT,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS key_points (
    id SERIAL PRIMARY KEY,
    summary_id INTEGER REFERENCES video_summaries(id),
    text TEXT,
    timestamp INTEGER,
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    videos_analyzed INTEGER DEFAULT 0,
    summaries_generated INTEGER DEFAULT 0,
    comparisons_made INTEGER DEFAULT 0,
    chat_messages_sent INTEGER DEFAULT 0,
    content_generated INTEGER DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    video_id INTEGER REFERENCES videos(id),
    message TEXT,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeline_suggestions (
    id SERIAL PRIMARY KEY,
    chat_message_id INTEGER REFERENCES chat_messages(id),
    text TEXT,
    timestamp INTEGER,
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_content (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content_type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    source_video_ids VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (email, name, password_hash, role, credits, is_pro, language_preference)
VALUES ('test@example.com', 'Test User', 'hashed_password', 'user', 10, FALSE, 'en');

INSERT INTO videos (youtube_id, title, url, duration, channel_name, thumbnail_url)
VALUES ('dQw4w9WgXcQ', 'Test Video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 212, 'Test Channel', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

-- Grant permissions on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tubewise;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tubewise;
