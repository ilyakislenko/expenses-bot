-- Create database tables
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'RUB',
    premium BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '💰',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    category_id INTEGER REFERENCES categories(id),
    description TEXT,
    created_at_utc TIMESTAMPTZ DEFAULT NOW(),
    local_date DATE
);

CREATE TABLE IF NOT EXISTS currency_rates (
    currency TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'RUB',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_local_date ON expenses(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_utc ON expenses(created_at_utc);

-- Insert default user for system categories
INSERT INTO users (id, username, first_name) VALUES 
(0, 'system', 'System Default')
ON CONFLICT (id) DO NOTHING;

-- Insert default categories
INSERT INTO categories (user_id, name, icon) VALUES 
(0, 'Еда', '🍕'),
(0, 'Транспорт', '🚗'),
(0, 'Развлечения', '🎬'),
(0, 'Покупки', '🛒'),
(0, 'Здоровье', '💊'),
(0, 'Другое', '📦')
ON CONFLICT DO NOTHING;
