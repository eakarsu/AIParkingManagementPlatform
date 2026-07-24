BEGIN;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  endpoint VARCHAR(100),
  entity_table VARCHAR(100),
  entity_id INTEGER,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
COMMIT;
