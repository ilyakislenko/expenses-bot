-- Remove local_date field from expenses table
-- This field is no longer needed since we filter by created_at_utc with timezone

ALTER TABLE expenses DROP COLUMN IF EXISTS local_date;

-- Remove index that was using local_date
DROP INDEX IF EXISTS idx_expenses_user_local_date;

-- Add language field to users table if it doesn't exist
-- This migration adds language support to existing databases

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'language') THEN
        ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'ru';
        UPDATE users SET language = 'ru' WHERE language IS NULL;
        COMMENT ON COLUMN users.language IS 'User language preference (ru, en, etc.)';
    END IF;
END $$;

-- Add premium field to users table if it doesn't exist
-- This migration adds premium support to existing databases

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'premium') THEN
        ALTER TABLE users ADD COLUMN premium BOOLEAN DEFAULT FALSE;
        UPDATE users SET premium = FALSE WHERE premium IS NULL;
        COMMENT ON COLUMN users.premium IS 'User premium status';
    END IF;
END $$;

-- Add timezone field to users table if it doesn't exist
-- This migration adds timezone support to existing databases

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'timezone') THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
        UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;
        COMMENT ON COLUMN users.timezone IS 'User timezone preference';
    END IF;
END $$;

-- Add currency field to users table if it doesn't exist
-- This migration adds currency support to existing databases

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'currency') THEN
        ALTER TABLE users ADD COLUMN currency VARCHAR(3) DEFAULT 'RUB';
        UPDATE users SET currency = 'RUB' WHERE currency IS NULL;
        COMMENT ON COLUMN users.currency IS 'User preferred currency';
    END IF;
END $$;

-- Add currency field to expenses table if it doesn't exist
-- This migration adds currency support to expenses table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'currency') THEN
        ALTER TABLE expenses ADD COLUMN currency VARCHAR(3) DEFAULT 'RUB';
        UPDATE expenses SET currency = 'RUB' WHERE currency IS NULL;
        COMMENT ON COLUMN expenses.currency IS 'Expense currency';
    END IF;
END $$;

-- Create missing tables if they don't exist
-- This ensures all required tables are present

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '💰',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS currency_rates (
    currency TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'RUB',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_utc ON expenses(created_at_utc);

-- Insert default user for system categories if not exists
INSERT INTO users (id, username, first_name) VALUES 
(0, 'system', 'System Default')
ON CONFLICT (id) DO NOTHING;

-- Insert default categories if not exist
INSERT INTO categories (user_id, name, icon) VALUES 
(0, 'Еда', '🍕'),
(0, 'Транспорт', '🚗'),
(0, 'Развлечения', '🎬'),
(0, 'Покупки', '🛒'),
(0, 'Здоровье', '💊'),
(0, 'Другое', '📦')
ON CONFLICT DO NOTHING;

-- ========================================
-- FAMILY SYSTEM MIGRATION
-- ========================================

-- Create families table
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_user junction table
CREATE TABLE IF NOT EXISTS family_user (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Drop existing family_invitations table if it exists (to recreate with correct structure)
DROP TABLE IF EXISTS family_invitations CASCADE;

-- Create family_invitations table
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

-- Add family_id column to expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'family_id') THEN
        ALTER TABLE expenses ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_user_user_id ON family_user(user_id);
CREATE INDEX IF NOT EXISTS idx_family_user_family_id ON family_user(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_invitee_id ON family_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family_id ON family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_invite_code ON family_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_expenses_family_id ON expenses(family_id);

-- Unique index to prevent duplicate pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_invitations_pending_unique ON family_invitations(invitee_id) WHERE status = 'pending';

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_family_user_family_id') THEN
        ALTER TABLE family_user ADD CONSTRAINT fk_family_user_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_family_user_user_id') THEN
        ALTER TABLE family_user ADD CONSTRAINT fk_family_user_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_family_invitations_family_id') THEN
        ALTER TABLE family_invitations ADD CONSTRAINT fk_family_invitations_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_family_invitations_inviter_id') THEN
        ALTER TABLE family_invitations ADD CONSTRAINT fk_family_invitations_inviter_id FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_family_invitations_invitee_id') THEN
        ALTER TABLE family_invitations ADD CONSTRAINT fk_family_invitations_invitee_id FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_expenses_family_id') THEN
        ALTER TABLE expenses ADD CONSTRAINT fk_expenses_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
    END IF;
END $$; 

-- Add premium subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS premium_activated_at TIMESTAMP NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at 
ON users(premium_expires_at) 
WHERE premium_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_premium_active 
ON users(id) 
WHERE premium = true AND premium_expires_at > NOW();

-- Add comments for documentation
COMMENT ON COLUMN users.premium_expires_at IS 'Дата истечения премиум подписки';
COMMENT ON COLUMN users.premium_activated_at IS 'Дата первой активации премиум подписки';

-- ========================================
-- PREMIUM TRANSACTIONS MIGRATION
-- ========================================

-- Create premium transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS premium_transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
               transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial')),
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

-- Create indexes for premium transactions if they don't exist
CREATE INDEX IF NOT EXISTS idx_premium_transactions_user_id ON premium_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_type ON premium_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_status ON premium_transactions(status);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_created_at ON premium_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_premium_transactions_telegram_payment_id ON premium_transactions(telegram_payment_id);

-- Update transaction_type constraint to include 'trial' if table exists
DO $$
BEGIN
    -- Удаляем старый constraint если он существует
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'premium_transactions_transaction_type_check'
    ) THEN
        ALTER TABLE premium_transactions DROP CONSTRAINT premium_transactions_transaction_type_check;
    END IF;
    
    -- Добавляем новый constraint с поддержкой 'trial'
    ALTER TABLE premium_transactions 
    ADD CONSTRAINT premium_transactions_transaction_type_check 
    CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial'));
END $$;

-- Add comments for premium transactions table
COMMENT ON TABLE premium_transactions IS 'Таблица для хранения всех транзакций премиум подписок';
COMMENT ON COLUMN premium_transactions.transaction_type IS 'Тип транзакции: purchase (покупка), refund (возврат), extension (продление), activation (активация), trial (пробный период)';
COMMENT ON COLUMN premium_transactions.tariff_duration IS 'Продолжительность тарифа в днях';
COMMENT ON COLUMN premium_transactions.stars_amount IS 'Количество Telegram Stars';
COMMENT ON COLUMN premium_transactions.telegram_payment_id IS 'Уникальный ID платежа в Telegram';
COMMENT ON COLUMN premium_transactions.invoice_payload IS 'Payload инвойса для отладки';
COMMENT ON COLUMN premium_transactions.previous_expiry_date IS 'Дата истечения подписки до транзакции';
COMMENT ON COLUMN premium_transactions.new_expiry_date IS 'Дата истечения подписки после транзакции';
COMMENT ON COLUMN premium_transactions.status IS 'Статус транзакции: pending, completed, failed, refunded'; 