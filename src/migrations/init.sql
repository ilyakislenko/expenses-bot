-- Create database tables
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'RUB',
    language VARCHAR(5) DEFAULT 'ru',
    premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP NULL,
    premium_activated_at TIMESTAMP NULL
);

-- Create indexes for premium subscription fields
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at 
ON users(premium_expires_at) 
WHERE premium_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_premium_active 
ON users(id) 
WHERE premium = true AND premium_expires_at > NOW();

-- Comments for premium subscription fields
COMMENT ON COLUMN users.premium_expires_at IS 'Дата истечения премиум подписки';
COMMENT ON COLUMN users.premium_activated_at IS 'Дата первой активации премиум подписки';

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
    created_at_utc TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currency_rates (
    currency TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'RUB',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create premium transactions table
CREATE TABLE IF NOT EXISTS premium_transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    tariff_duration INTEGER NOT NULL, -- количество дней
    stars_amount INTEGER NOT NULL, -- количество звезд
    usd_amount DECIMAL(10,2) NOT NULL, -- сумма в USD
    rub_amount DECIMAL(10,2) NOT NULL, -- сумма в RUB
    telegram_payment_id VARCHAR(255), -- ID платежа в Telegram
    invoice_payload TEXT, -- payload инвойса для отладки
    previous_expiry_date TIMESTAMP WITH TIME ZONE, -- дата истечения до транзакции
    new_expiry_date TIMESTAMP WITH TIME ZONE, -- дата истечения после транзакции
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    error_message TEXT, -- сообщение об ошибке, если есть
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы для быстрого поиска
    CONSTRAINT fk_premium_transactions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add constraint for transaction_type
ALTER TABLE premium_transactions 
ADD CONSTRAINT premium_transactions_transaction_type_check 
CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_utc ON expenses(created_at_utc);

-- Create indexes for premium transactions
CREATE INDEX IF NOT EXISTS idx_premium_transactions_user_id ON premium_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_type ON premium_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_status ON premium_transactions(status);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_created_at ON premium_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_telegram_payment_id ON premium_transactions(telegram_payment_id);

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
