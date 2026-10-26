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

-- ========================================
-- INCOMES & RECURRING EXPENSES
-- ========================================

-- Валюта дохода по умолчанию (NULL = основная валюта пользователя)
ALTER TABLE users ADD COLUMN IF NOT EXISTS income_currency VARCHAR(3) NULL;
COMMENT ON COLUMN users.income_currency IS 'Валюта дохода по умолчанию (NULL = основная валюта пользователя)';

CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_created ON incomes(user_id, created_at_utc);

-- Ежемесячные регулярные траты (аренда, подписки и т.п.)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    last_charged_month DATE NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN recurring_expenses.day_of_month IS 'Число месяца списания (1-31), в месяцах короче используется последний день';
COMMENT ON COLUMN recurring_expenses.last_charged_month IS 'Первый день локального месяца, за который трата уже записана';

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);

-- Связь автоматически созданной траты с регулярной
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_expense_id INTEGER REFERENCES recurring_expenses(id) ON DELETE SET NULL;

-- ========================================
-- ATTRIBUTION, FUNNEL, PREMIUM LIFECYCLE
-- ========================================

-- Источник пользователя: код из ссылки t.me/<bot>?start=<код>
ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(64) NULL;
COMMENT ON COLUMN users.source IS 'Код источника из deep link /start <код> (реклама, канал, реферал)';

-- Новым пользователям напоминания включены по умолчанию (отключаются в настройках)
ALTER TABLE users ALTER COLUMN reminder_enabled SET DEFAULT TRUE;

-- Шаги воронки: первое наступление события для пользователя
CREATE TABLE IF NOT EXISTS user_funnel_events (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, event)
);
CREATE INDEX IF NOT EXISTS idx_user_funnel_events_event_created ON user_funnel_events(event, created_at);

-- Отправленные служебные уведомления (идемпотентность: одно уведомление на пользователя/вид/ключ)
CREATE TABLE IF NOT EXISTS user_notifications (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(40) NOT NULL,
    ref_key VARCHAR(64) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, kind, ref_key)
);

-- Подписка Telegram Stars с автопродлением
ALTER TABLE premium_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE premium_transactions ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NULL;

-- Восстанавливаем воронку для уже существующих пользователей
INSERT INTO user_funnel_events (user_id, event, created_at)
SELECT id, 'registered', COALESCE(created_at::timestamptz, NOW()) FROM users WHERE id > 0
ON CONFLICT DO NOTHING;

INSERT INTO user_funnel_events (user_id, event, created_at)
SELECT user_id, 'first_expense', MIN(created_at_utc) FROM expenses WHERE recurring_expense_id IS NULL GROUP BY user_id
ON CONFLICT DO NOTHING;

INSERT INTO user_funnel_events (user_id, event, created_at)
SELECT user_id, 'paid', MIN(created_at) FROM premium_transactions
WHERE status = 'completed' AND stars_amount > 0 AND transaction_type IN ('purchase', 'activation', 'extension')
GROUP BY user_id
ON CONFLICT DO NOTHING;

-- ========================================
-- BUDGETS
-- ========================================

-- Бюджет на пользовательский период (period_start_day): на категорию (по имени, как в обзоре) или общий (category_name IS NULL)
CREATE TABLE IF NOT EXISTS category_budgets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN category_budgets.category_name IS 'Имя категории; NULL — общий бюджет на период';
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_budgets_user_category ON category_budgets(user_id, (COALESCE(category_name, '')));

-- ========================================
-- DAILY SUMMARY
-- ========================================

-- Ежедневная сводка: итоги дня в выбранный локальный час (по разу за день — user_notifications 'daily_summary')
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_summary_hour INTEGER NULL;
COMMENT ON COLUMN users.daily_summary_enabled IS 'Флаг ежедневной сводки за день';
COMMENT ON COLUMN users.daily_summary_hour IS 'Локальный час ежедневной сводки (0-23); NULL — 21:00';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_daily_summary_hour_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_daily_summary_hour_check CHECK (daily_summary_hour BETWEEN 0 AND 23);
  END IF;
END $$;
