-- Create database if not exists
CREATE DATABASE tubewise;

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
