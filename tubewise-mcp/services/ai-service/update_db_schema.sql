-- Update users table to add stripe_customer_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR UNIQUE;

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    stripe_subscription_id VARCHAR UNIQUE,
    status VARCHAR,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing tables if needed
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS videos_compared INTEGER DEFAULT 0;
ALTER TABLE usage_stats ADD COLUMN IF NOT EXISTS content_generated INTEGER DEFAULT 0;
