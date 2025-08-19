SET client_encoding = 'UTF8';

-- Create database tables
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'RUB',
    language VARCHAR(5) DEFAULT 'en',
    premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP NULL,
    premium_activated_at TIMESTAMP NULL,
    has_trial BOOLEAN NOT NULL DEFAULT TRUE,
    period_start_day INTEGER NOT NULL DEFAULT 1,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_reminder_local_date DATE NULL,
    reminder_hours INTEGER[] DEFAULT NULL,
    reminder_sent_today_hours INTEGER[] DEFAULT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes for premium subscription fields
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at 
ON users(premium_expires_at) 
WHERE premium_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_premium_active 
ON users(id) 
WHERE premium = true AND premium_expires_at IS NOT NULL;

-- Comments for premium subscription fields
COMMENT ON COLUMN users.premium_expires_at IS 'Дата истечения премиум подписки';
COMMENT ON COLUMN users.premium_activated_at IS 'Дата первой активации премиум подписки';
COMMENT ON COLUMN users.has_trial IS 'Флаг доступности триального премиума (TRUE = можно выдать, после выдачи ставим FALSE)';
COMMENT ON COLUMN users.period_start_day IS 'Число начала пользовательского периода (1-31), в месяцах короче используется последний день';
COMMENT ON COLUMN users.reminder_enabled IS 'Флаг включения ежедневных напоминаний';
COMMENT ON COLUMN users.last_reminder_local_date IS 'Дата последней отправленной напоминалки в локальном дне пользователя';
COMMENT ON COLUMN users.reminder_hours IS 'Часы отправки напоминалок в локальном времени пользователя (0-23), максимум 3';
COMMENT ON COLUMN users.reminder_sent_today_hours IS 'Часы, по которым напоминалки уже отправлены в текущий локальный день пользователя';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'users_period_start_day_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_period_start_day_check CHECK (period_start_day >= 1 AND period_start_day <= 31);
  END IF;
END $$;

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

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 2500),
    message TEXT,
    telegram_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','expired','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_text TEXT NOT NULL CHECK (LENGTH(report_text) <= 1000),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);

-- ========================================
-- FAMILY SYSTEM (base schema on fresh init)
-- ========================================

-- Families
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family members
CREATE TABLE IF NOT EXISTS family_user (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Family invitations
CREATE TABLE IF NOT EXISTS family_invitations (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    inviter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(10) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at_utc TIMESTAMP WITH TIME ZONE,
    rejected_at_utc TIMESTAMP WITH TIME ZONE
);

-- expenses.family_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'family_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for family system
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_user_user_id ON family_user(user_id);
CREATE INDEX IF NOT EXISTS idx_family_user_family_id ON family_user(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_invitee_id ON family_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family_id ON family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_invite_code ON family_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_expenses_family_id ON expenses(family_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_invitations_pending_unique ON family_invitations(invitee_id) WHERE status = 'pending';

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
