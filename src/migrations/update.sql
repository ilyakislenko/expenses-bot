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