-- Add has_trial flag to users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'has_trial'
  ) THEN
    ALTER TABLE users ADD COLUMN has_trial BOOLEAN NOT NULL DEFAULT TRUE;
    COMMENT ON COLUMN users.has_trial IS 'Флаг доступности триального премиума (TRUE = можно выдать, после выдачи ставим FALSE)';
    -- Для существующих пользователей запрещаем триал по умолчанию
    UPDATE users SET has_trial = FALSE;
  END IF;
END $$;

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
        ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'en';
        UPDATE users SET language = 'en' WHERE language IS NULL;
        COMMENT ON COLUMN users.language IS 'User language preference (ru, en, etc.)';
    END IF;
END $$;

-- Ensure default language is EN for new users
ALTER TABLE users ALTER COLUMN language SET DEFAULT 'en';

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

-- Create index for active premium users (without NOW() function)
CREATE INDEX IF NOT EXISTS idx_users_premium_active 
ON users(id) 
WHERE premium = true AND premium_expires_at IS NOT NULL;

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
               transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial', 'reward')),
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
    CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial', 'reward'));
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

-- ========================================
-- PERIOD START DAY PER-USER SETTING
-- ========================================

-- Add period_start_day to users (1..31), default 1
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'period_start_day'
    ) THEN
        ALTER TABLE users ADD COLUMN period_start_day INTEGER NOT NULL DEFAULT 1;
        COMMENT ON COLUMN users.period_start_day IS 'Число начала пользовательского периода (1-31), в месяцах короче используется последний день';
    END IF;
END $$;

-- ========================================
-- DONATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 2500),
    message TEXT,
    telegram_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- Update donations status constraint to include new statuses ('refunded' — возврат пожертвования)
-- Блок выполняется при каждой миграции: список статусов должен включать все, что пишет код
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'cancelled', 'refunded'));

-- Ensure constraint 1..31 exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_type = 'CHECK' AND constraint_name = 'users_period_start_day_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_period_start_day_check CHECK (period_start_day >= 1 AND period_start_day <= 31);
    END IF;
END $$;

-- Add reminder fields to users if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='reminder_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='last_reminder_local_date'
    ) THEN
        ALTER TABLE users ADD COLUMN last_reminder_local_date DATE NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='reminder_hours'
    ) THEN
        ALTER TABLE users ADD COLUMN reminder_hours INTEGER[] NULL;
        COMMENT ON COLUMN users.reminder_hours IS 'Часы отправки напоминалок в локальном времени пользователя (0-23), максимум 3';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='reminder_sent_today_hours'
    ) THEN
        ALTER TABLE users ADD COLUMN reminder_sent_today_hours INTEGER[] NULL;
        COMMENT ON COLUMN users.reminder_sent_today_hours IS 'Часы, по которым напоминалки уже отправлены в текущий локальный день пользователя';
    END IF;
END $$;

-- Create bug reports table if not exists
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

-- Добавляем поле is_admin в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Добавляем индекс для администраторов
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(id) WHERE is_admin = true;
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

-- ========================================
-- FAMILY: один человек — одна семья
-- ========================================

-- Гонка «создать семью / принять приглашение» не должна оставлять человека в двух семьях
-- (getUserFamily вернул бы случайную). Дубликатов в данных нет (проверено).
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_user_user_id_unique ON family_user(user_id);

-- ========================================
-- FAMILY MODE: все новые траты в семью
-- ========================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS family_mode BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN users.family_mode IS 'Режим «все траты в семью»: новые траты по умолчанию записываются в семью пользователя';

-- ========================================
-- SAVINGS: накопления, цели, прогноз
-- ========================================

-- Копилки: общая (одна на пользователя) и цели. Цель 'own' — своя копилка,
-- 'total' — без своих денег, прогресс считается от всех накоплений.
CREATE TABLE IF NOT EXISTS savings_pots (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('general', 'goal')),
    name VARCHAR(60) NULL,
    balance DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL,
    target_amount DECIMAL(14,2) NULL CHECK (target_amount IS NULL OR target_amount > 0),
    target_date DATE NULL,
    goal_mode VARCHAR(10) NOT NULL DEFAULT 'own' CHECK (goal_mode IN ('own', 'total')),
    achieved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (kind = 'general' OR (name IS NOT NULL AND target_amount IS NOT NULL))
);
COMMENT ON COLUMN savings_pots.goal_mode IS 'own — своя копилка цели; total — прогресс от всех накоплений, balance не используется';
COMMENT ON COLUMN savings_pots.achieved_at IS 'Когда цель достигнута (для поздравления один раз); сбрасывается, если сумма снова ниже цели';
CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_pots_general ON savings_pots(user_id) WHERE kind = 'general';
CREATE INDEX IF NOT EXISTS idx_savings_pots_user ON savings_pots(user_id);

-- История изменений копилок: amount со знаком (+ пополнение, − снятие)
CREATE TABLE IF NOT EXISTS savings_operations (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pot_id INTEGER NOT NULL REFERENCES savings_pots(id) ON DELETE CASCADE,
    amount DECIMAL(14,2) NOT NULL,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('deposit', 'withdraw', 'set', 'transfer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_operations_pot ON savings_operations(pot_id, created_at);

-- Параметры прогноза (проценты годовых). monthly_contribution NULL — взнос считается автоматически
CREATE TABLE IF NOT EXISTS savings_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_contribution DECIMAL(14,2) NULL CHECK (monthly_contribution IS NULL OR monthly_contribution >= 0),
    inflation_rate DECIMAL(6,2) NULL CHECK (inflation_rate IS NULL OR inflation_rate BETWEEN 0 AND 300),
    yield_rate DECIMAL(6,2) NULL CHECK (yield_rate IS NULL OR yield_rate BETWEEN 0 AND 300),
    contribution_growth DECIMAL(6,2) NULL CHECK (contribution_growth IS NULL OR contribution_growth BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN savings_settings.monthly_contribution IS 'Сколько откладывается в месяц (основная валюта); NULL — среднее (доходы − траты) за 3 полных периода';
COMMENT ON COLUMN savings_settings.contribution_growth IS 'Рост ежемесячного взноса раз в год, %';

-- ========================================
-- SAVINGS ACCOUNTS: несколько счетов накоплений
-- ========================================

-- Счета (kind 'account'): наличные, вклад, крипта, скины… — своя валюта и своя доходность.
-- Общая копилка — счёт по умолчанию (одна на пользователя, не удаляется).
ALTER TABLE savings_pots ADD COLUMN IF NOT EXISTS yield_rate DECIMAL(6,2) NULL;
COMMENT ON COLUMN savings_pots.yield_rate IS 'Доходность счёта, % годовых; NULL — ставка из параметров прогноза. У целей не используется';
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_kind_check;
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_check;
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_fields_check;
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_yield_rate_check;
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_kind_check CHECK (kind IN ('general', 'account', 'goal'));
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_fields_check CHECK (
    kind = 'general'
    OR (kind = 'account' AND name IS NOT NULL)
    OR (kind = 'goal' AND name IS NOT NULL AND target_amount IS NOT NULL)
);
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_yield_rate_check CHECK (yield_rate IS NULL OR yield_rate BETWEEN 0 AND 300);

-- ========================================
-- WEEKLY INSIGHT: сводка недели по понедельникам
-- ========================================

-- Сводка недели: по понедельникам в 10:00 по местному времени (по разу за неделю — user_notifications 'weekly_insight')
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_insight_enabled BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN users.weekly_insight_enabled IS 'Флаг сводки недели (понедельник, 10:00 по местному времени)';
-- SAVINGS DEBTS: долги и чистая стоимость
-- ========================================

-- Долги (kind 'debt'): кредит, ипотека, рассрочка, долг другу. balance — сколько осталось вернуть,
-- yield_rate — ставка по долгу, % годовых (NULL — без процентов). В накопления не входят.
ALTER TABLE savings_pots ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(14,2) NULL;
COMMENT ON COLUMN savings_pots.monthly_payment IS 'Плановый платёж по долгу в месяц (валюта долга); NULL — не задан. Только для kind = debt';
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_kind_check;
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_fields_check;
ALTER TABLE savings_pots DROP CONSTRAINT IF EXISTS savings_pots_monthly_payment_check;
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_kind_check CHECK (kind IN ('general', 'account', 'goal', 'debt'));
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_fields_check CHECK (
    kind = 'general'
    OR (kind IN ('account', 'debt') AND name IS NOT NULL)
    OR (kind = 'goal' AND name IS NOT NULL AND target_amount IS NOT NULL)
);
ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_monthly_payment_check CHECK (
    monthly_payment IS NULL OR (kind = 'debt' AND monthly_payment > 0)
);
-- ==== BANK IMPORT ====
-- Импорт банковских выписок: партия импорта (для отмены) и отпечаток операции (дедупликация).
-- Сами файлы не хранятся — только записанные из них траты и доходы.
CREATE TABLE IF NOT EXISTS imports (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN imports.source IS 'Формат выписки: tbank, sber, kaspi, csv';
CREATE INDEX IF NOT EXISTS idx_imports_user ON imports(user_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_id INTEGER NULL REFERENCES imports(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_hash VARCHAR(64) NULL;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS import_id INTEGER NULL REFERENCES imports(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS import_hash VARCHAR(64) NULL;
COMMENT ON COLUMN expenses.import_hash IS 'sha256 операции выписки (дата, сумма, валюта, описание, вид); NULL — запись не из импорта';
COMMENT ON COLUMN incomes.import_hash IS 'sha256 операции выписки (дата, сумма, валюта, описание, вид); NULL — запись не из импорта';
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_user_import_hash ON expenses(user_id, import_hash) WHERE import_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_user_import_hash ON incomes(user_id, import_hash) WHERE import_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_import ON expenses(import_id) WHERE import_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incomes_import ON incomes(import_id) WHERE import_id IS NOT NULL;

-- ========================================
-- SAVINGS UX: новые цели — от всех накоплений
-- ========================================

-- Новая цель по умолчанию считается от всех накоплений (своя копилка — по выбору); старые цели не меняются
ALTER TABLE savings_pots ALTER COLUMN goal_mode SET DEFAULT 'total';

-- ==== RECEIPTS ====
-- Распознанные фото чеков: каждая позиция — отдельная трата (expenses.receipt_id) для списка, правки и отмены чека.
-- Сами фото не хранятся. Строка чека остаётся и после отмены (status 'undone') — по ней считается месячный лимит.
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant VARCHAR(60) NULL,
    purchased_date DATE NULL,
    purchased_time TIME NULL,
    currency VARCHAR(3) NOT NULL,
    printed_total DECIMAL(12,2) NULL,
    items_total DECIMAL(12,2) NOT NULL,
    item_count INTEGER NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check CHECK (status IN ('active', 'confirmed', 'undone'));
COMMENT ON COLUMN receipts.purchased_date IS 'Дата покупки, напечатанная в чеке (NULL — не распознана)';
COMMENT ON COLUMN receipts.printed_total IS 'Итог, напечатанный в чеке; items_total — сумма позиций после распределения скидок';
CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_id INTEGER NULL REFERENCES receipts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_receipt ON expenses(receipt_id) WHERE receipt_id IS NOT NULL;

-- ==== PLANNING ====
-- «🧭 Планирование»: число платежа по долгу (календарь платежей), количество и цена позиций чека (личная инфляция),
-- утренние напоминания о платежах и отметки найденных подписок («это подписка» / «не подписка»).
ALTER TABLE savings_pots ADD COLUMN IF NOT EXISTS due_day SMALLINT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_pots_due_day_check') THEN
    ALTER TABLE savings_pots ADD CONSTRAINT savings_pots_due_day_check CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31);
  END IF;
END $$;
COMMENT ON COLUMN savings_pots.due_day IS 'Долг: число месяца планового платежа (1-31, в коротких месяцах — последний день); NULL — не задано';

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,3) NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) NULL;
COMMENT ON COLUMN expenses.quantity IS 'Позиция чека: количество (шт/кг/л) как в чеке; NULL — не из чека или не распознано';
COMMENT ON COLUMN expenses.unit_price IS 'Позиция чека: цена за единицу как в чеке; NULL — не из чека или не распознана';

ALTER TABLE users ADD COLUMN IF NOT EXISTS bill_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN users.bill_reminders_enabled IS 'Утреннее напоминание о платежах сегодня и завтра (user_notifications bill_reminder)';

CREATE TABLE IF NOT EXISTS subscription_marks (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_key VARCHAR(60) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('confirmed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, merchant_key)
);
COMMENT ON TABLE subscription_marks IS 'Найденные подписки: merchant_key — нормализованное описание траты; confirmed — отмечена подпиской, dismissed — скрыта';

-- ==== ACHIEVEMENTS ====
-- Геймификация: серия дней с записями (заморозки), достижения, уровни, челленджи, «Итоги месяца».
-- Статистика для правил и XP считается по записям; здесь — только то, что из истории не восстановить.

-- Состояние: какой уровень уже показан (повышение празднуется один раз), когда сегодня сказали о серии,
-- присылать ли «Итоги месяца». Строки нет — пользователь ещё не знакомился с достижениями
CREATE TABLE IF NOT EXISTS user_gamification (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    level_seen INTEGER NOT NULL DEFAULT 1,
    streak_seen_date DATE NULL,
    wrapped_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN user_gamification.level_seen IS 'Уровень, о котором пользователь уже знает (повышение празднуется один раз)';
COMMENT ON COLUMN user_gamification.streak_seen_date IS 'Локальный день, когда строка «🔥 N дней подряд» уже показана';
COMMENT ON COLUMN user_gamification.wrapped_enabled IS 'Присылать «Итоги месяца» в первый день периода';

-- Открытые достижения; retroactive — открыты при первом знакомстве за прошлую историю (без поздравления)
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retroactive BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, code)
);

-- Использованные заморозки серии: локальный пропущенный день, закрытый заморозкой
CREATE TABLE IF NOT EXISTS user_streak_freezes (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);

-- Отметки «сегодня без трат» (локальный день): продолжают серию, засчитываются, если в этот день не было трат
CREATE TABLE IF NOT EXISTS user_no_spend_days (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);

-- Челленджи: неделя без трат (target — дней без трат), неделя без категории (по имени), месяц в бюджете.
-- Окно [start_date, end_date) в локальных датах пользователя
CREATE TABLE IF NOT EXISTS user_challenges (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,
    category_name VARCHAR(100) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target INTEGER NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL
);
ALTER TABLE user_challenges DROP CONSTRAINT IF EXISTS user_challenges_kind_check;
ALTER TABLE user_challenges ADD CONSTRAINT user_challenges_kind_check CHECK (kind IN ('no_spend', 'no_category', 'budget_month'));
ALTER TABLE user_challenges DROP CONSTRAINT IF EXISTS user_challenges_status_check;
ALTER TABLE user_challenges ADD CONSTRAINT user_challenges_status_check CHECK (status IN ('active', 'won', 'lost', 'canceled'));
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id, status);

-- ==== REFERRALS ====
-- Реферальная программа: личный код для ссылки t.me/<бот>?start=ref_<код> (создаётся при первом показе экрана
-- «Пригласить друга») и приглашённые. Награда (+N дней премиума обоим) — один раз, когда приглашённый запишет
-- 3 траты; rewarded_at ставится атомарно вместе с днями, выданными каждому.
CREATE TABLE IF NOT EXISTS referral_codes (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE referral_codes IS 'Личный реферальный код пользователя (ссылка t.me/<бот>?start=ref_<код>)';

CREATE TABLE IF NOT EXISTS referrals (
    invitee_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    inviter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rewarded_at TIMESTAMPTZ NULL,
    invitee_days INTEGER NOT NULL DEFAULT 0,
    inviter_days INTEGER NOT NULL DEFAULT 0,
    CHECK (invitee_id <> inviter_id)
);
COMMENT ON TABLE referrals IS 'Кто кого пригласил: только новые пользователи, пришедшие по ссылке ref_<код>';
COMMENT ON COLUMN referrals.rewarded_at IS 'Когда выдана награда (приглашённый записал 3 траты); NULL — ещё нет';
COMMENT ON COLUMN referrals.inviter_days IS 'Дней премиума пригласившему (0 — его лимит наград исчерпан)';
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);

-- ==== AI ASSISTANT ====
-- «🤖 Спроси бота»: вопросы о своих тратах обычными словами. Текст вопроса не хранится — только факт ответа
-- (дневной лимит по локальной дате пользователя), тип ответа, кто разобрал вопрос и время ответа.
CREATE TABLE IF NOT EXISTS assistant_questions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    intent_type VARCHAR(30) NOT NULL,
    source VARCHAR(10) NOT NULL,
    duration_ms INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE assistant_questions IS 'Отвеченные вопросы боту (без текста вопроса): дневной лимит и статистика';
COMMENT ON COLUMN assistant_questions.source IS 'Кто разобрал вопрос: example — кнопка-пример, fast — быстрый разбор, model — нейросеть, fallback — быстрый разбор, когда нейросеть не ответила';
CREATE INDEX IF NOT EXISTS idx_assistant_questions_user_date ON assistant_questions(user_id, local_date);

-- ==== VOICE INPUT & MULTI-ENTRY ====
-- Несколько записей одним сообщением или голосом: партия (expenses.batch_id / incomes.batch_id) для сводки,
-- карточек и «Отменить всё». Голос и расшифровка не хранятся; voice_usage — только счётчик голосовых за локальный день.
CREATE TABLE IF NOT EXISTS entry_batches (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(10) NOT NULL DEFAULT 'text',
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    item_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE entry_batches DROP CONSTRAINT IF EXISTS entry_batches_source_check;
ALTER TABLE entry_batches ADD CONSTRAINT entry_batches_source_check CHECK (source IN ('text', 'voice'));
ALTER TABLE entry_batches DROP CONSTRAINT IF EXISTS entry_batches_status_check;
ALTER TABLE entry_batches ADD CONSTRAINT entry_batches_status_check CHECK (status IN ('active', 'undone'));
CREATE INDEX IF NOT EXISTS idx_entry_batches_user ON entry_batches(user_id, created_at);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS batch_id INTEGER NULL REFERENCES entry_batches(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS batch_id INTEGER NULL REFERENCES entry_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_batch ON expenses(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incomes_batch ON incomes(batch_id) WHERE batch_id IS NOT NULL;
-- Категория по умолчанию, поставленная ботом (описание ещё не встречалось), — не «запоминается» для описания
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_guessed BOOLEAN NOT NULL DEFAULT FALSE;

-- Распознанные голосовые за локальный день пользователя (дневной лимит USER_LIMITS.*.MAX_VOICE_PER_DAY)
CREATE TABLE IF NOT EXISTS voice_usage (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

-- ==== ROAST MODE ====
-- «😈 Злой режим»: уровень (off — по умолчанию, spicy — ехидный без мата, savage — без цензуры, 18+), пол для
-- согласования фраз («купил/купила»; x — «не скажу», только фразы без рода) и подтверждение 18+ (один раз).
ALTER TABLE users ADD COLUMN IF NOT EXISTS roast_level VARCHAR(10) NOT NULL DEFAULT 'off';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roast_level_check;
ALTER TABLE users ADD CONSTRAINT users_roast_level_check CHECK (roast_level IN ('off', 'spicy', 'savage'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender CHAR(1) NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (gender IS NULL OR gender IN ('m', 'f', 'x'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS roast_adult_confirmed_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN users.roast_level IS 'Злой режим: off | spicy (ехидный) | savage (без цензуры, 18+)';
COMMENT ON COLUMN users.gender IS 'Как обращаться в злом режиме: m | f | x (не скажу); NULL — не спрашивали';
COMMENT ON COLUMN users.roast_adult_confirmed_at IS 'Когда пользователь подтвердил 18+ для уровня savage';

-- Счётчик подколок: сколько было за локальный день, когда последняя, последние варианты (чтобы не повторяться)
CREATE TABLE IF NOT EXISTS roast_state (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    day DATE NULL,
    day_count INTEGER NOT NULL DEFAULT 0,
    last_at TIMESTAMPTZ NULL,
    recent TEXT[] NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE roast_state IS 'Злой режим: подколок за локальный день (day, day_count), время последней и последние варианты шаблонов';

-- ==== ONBOARDING ====
-- Опрос «🧭 Настроим бота под тебя» (после выбора языка и по /setup): цели, способы записи, ответы и пропущенные
-- вопросы, статус (active | completed | skipped) и текущий шаг — опрос продолжается после рестарта и со старых кнопок.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_answers JSONB NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN users.onboarding_answers IS 'Опрос «Настроим бота под тебя»: черновик и ответы (goals, inputs, answers, skipped, status, step)';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Когда опрос последний раз закончен (пройден или «Пропустить всё»)';

-- ==== RECEIPT DRAFTS ====
-- Черновик неуверенно распознанного чека («Записать как есть» / «Отмена») и кадр для «повернуть на 90°» — по сообщению
-- с кнопками. Живут 7 дней и переживают перезапуск бота. Фото не хранится: frame — file_id в Telegram и поворот.
CREATE TABLE IF NOT EXISTS receipt_drafts (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id BIGINT NOT NULL,
    receipt JSONB NULL,
    timezone VARCHAR(64) NULL,
    frame JSONB NULL,
    taken_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, message_id)
);
COMMENT ON TABLE receipt_drafts IS 'Черновики чеков до подтверждения и кадры для «повернуть»: receipt NULL — только кадр, frame NULL — повернуть нельзя';
COMMENT ON COLUMN receipt_drafts.frame IS '{ fileId, mimeType, turn, small, lowResolution, lang, currency } — фото в Telegram и поворот относительно подготовленного';
COMMENT ON COLUMN receipt_drafts.taken_at IS 'Черновик сейчас записывается (повторное нажатие ждёт); старше 5 минут — считается сбоем и снова доступен';
CREATE INDEX IF NOT EXISTS idx_receipt_drafts_expires ON receipt_drafts(expires_at);

-- ==== FIX C ====
-- Ожидаемый ввод и черновики (StateService) переживают перезапуск бота: каждое изменение пишется сюда, при старте
-- загружается в память. kind: state (ожидаемый текст), edit («✏️ Изменить» запись), expense (черновик траты по
-- сообщению с выбором категории, slot — message_id), recurring (черновик регулярной), export (фильтр экспорта),
-- question (текст для кнопки «🤖 Спросить бота»). Истёкший ожидаемый ввод даёт ответ «ввод устарел».
CREATE TABLE IF NOT EXISTS user_input_states (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(16) NOT NULL,
    slot VARCHAR(32) NOT NULL DEFAULT '',
    value JSONB NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, kind, slot)
);
COMMENT ON TABLE user_input_states IS 'Ожидаемый ввод и черновики StateService: переживают перезапуск бота, живут до expires_at';
COMMENT ON COLUMN user_input_states.value IS 'Значение как в памяти (строка состояния, id записи, черновик; null — черновик уже записан)';
CREATE INDEX IF NOT EXISTS idx_user_input_states_expires ON user_input_states(expires_at);

-- /undo удаляет последнюю введённую запись: момент записи отдельно от даты траты/дохода («📅 Дата» меняет created_at_utc).
-- У старых записей NULL — для них берётся created_at_utc
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NULL;
ALTER TABLE expenses ALTER COLUMN recorded_at SET DEFAULT NOW();
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NULL;
ALTER TABLE incomes ALTER COLUMN recorded_at SET DEFAULT NOW();
COMMENT ON COLUMN expenses.recorded_at IS 'Когда запись внесена в бота (NULL — до 28.10.2026, тогда created_at_utc)';
COMMENT ON COLUMN incomes.recorded_at IS 'Когда запись внесена в бота (NULL — до 28.10.2026, тогда created_at_utc)';

-- ==== FIX D ====
-- «Спроси бота»: в лимиты идут попытки, а не только ответы. answered = FALSE — ответа не было (нейросеть не поняла,
-- не ответила, период неясен) или пользователь нажал «🙅 Не то»; model_calls — сколько раз для вопроса спросили нейросеть
-- (быстрый разбор — 0). Дневной лимит вопросов считает answered, потолок вызовов модели — SUM(model_calls).
ALTER TABLE assistant_questions ADD COLUMN IF NOT EXISTS answered BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE assistant_questions ADD COLUMN IF NOT EXISTS model_calls SMALLINT NOT NULL DEFAULT 0;
COMMENT ON TABLE assistant_questions IS 'Вопросы боту (без текста вопроса): отвеченные и попытки с нейросетью — дневные лимиты и статистика';
COMMENT ON COLUMN assistant_questions.answered IS 'Ответ засчитан в дневной лимит; FALSE — ответа не было или пользователь нажал «🙅 Не то»';
COMMENT ON COLUMN assistant_questions.model_calls IS 'Сколько раз для этого вопроса спросили нейросеть (дневной потолок вызовов модели)';
COMMENT ON COLUMN assistant_questions.intent_type IS 'Тип ответа или статус без ответа (not_understood, model_down, model_busy, period_unclear, future)';

-- ==== FIX B ====
-- Попытки распознавания чеков, которые не записали чек сами: показанный черновик и «не получилось распознать».
-- Месячный лимит чеков = записанные чеки (receipts) + такие попытки; при записи черновика его попытка удаляется
-- (её заменяет строка receipts), поэтому черновики и «🔄 Повернуть» лимит не обходят.
CREATE TABLE IF NOT EXISTS receipt_attempts (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outcome VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE receipt_attempts IS 'Распознавания чеков без записи (draft — черновик, unreadable — не разобрано); считаются в месячный лимит вместе с receipts';
CREATE INDEX IF NOT EXISTS idx_receipt_attempts_user_created ON receipt_attempts(user_id, created_at);

-- Фоновые задачи с сообщением-статусом («🔍 Распознаю чек…», «🎙 Распознаю голос…»): после перезапуска бота
-- оставшиеся строки прошлого запуска (instance другой) превращаются в «прервалось — пришли ещё раз» или в прежний черновик.
CREATE TABLE IF NOT EXISTS pending_jobs (
    chat_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(16) NOT NULL,
    instance VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chat_id, message_id)
);
COMMENT ON TABLE pending_jobs IS 'Незаконченные фоновые распознавания (kind: receipt | voice) с сообщением-статусом; instance — запуск бота';
COMMENT ON COLUMN receipt_drafts.taken_at IS 'Черновик сейчас записывается или поворачивается (кнопка «Повернуть»); старше 5 минут — считается сбоем и снова доступен';

-- ==== FIX2 B ====
-- Попытка распознавания — одна на фото: ключ — сообщение со статусом. Повороты того же фото обновляют строку,
-- запись чека из этого сообщения её удаляет (чек считается сам). Старые строки без message_id считаются как раньше.
ALTER TABLE receipt_attempts ADD COLUMN IF NOT EXISTS message_id BIGINT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_attempts_user_message ON receipt_attempts(user_id, message_id) WHERE message_id IS NOT NULL;
COMMENT ON COLUMN receipt_attempts.message_id IS 'Сообщение фото («Распознаю чек…»): одна попытка на фото, повороты её обновляют';

-- ==== SUBSCRIPTION WARNINGS ====
-- Предупреждение о списании подписки за N дней (днём по местному времени, по разу на списание — user_notifications
-- 'sub_warn'), пробные периоды с напоминанием за день и в день окончания, отметки «🔕 не напоминать» / «🚫 отменяю».
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_warn_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_warn_days SMALLINT NOT NULL DEFAULT 2;
COMMENT ON COLUMN users.sub_warn_enabled IS '«🔔 Предупреждать о списании» подписок (пробные периоды напоминают всегда)';
COMMENT ON COLUMN users.sub_warn_days IS 'За сколько дней до списания подписки предупреждать: 1, 2, 3 или 7';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_sub_warn_days_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_sub_warn_days_check CHECK (sub_warn_days IN (1, 2, 3, 7));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscription_alerts (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_key VARCHAR(60) NOT NULL,
    state VARCHAR(12) NOT NULL CHECK (state IN ('muted', 'cancelling')),
    since DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, merchant_key)
);
COMMENT ON TABLE subscription_alerts IS 'Предупреждения о списании по подписке (merchant_key — как в subscription_marks): muted — «🔕 не напоминать», cancelling — «🚫 отменю» с локальной даты since';

CREATE TABLE IF NOT EXISTS subscription_trials (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    end_date DATE NULL,
    amount DECIMAL(12,2) NULL,
    currency VARCHAR(3) NULL,
    state VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'kept', 'cancelling', 'muted')),
    created_on DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE subscription_trials IS 'Пробные периоды: напоминание за день и в день окончания; end_date NULL — черновик (ждём дату), state — ответ на напоминание';
COMMENT ON COLUMN subscription_trials.created_on IS 'Локальная дата добавления: в этот день не напоминаем';
CREATE INDEX IF NOT EXISTS idx_subscription_trials_user ON subscription_trials(user_id, end_date);

-- ==== DAILY PLAN ====
-- «☀️ План на день» утром (users.daily_plan_*; daily_plans — какой план отправлен на локальный день: отметка «уже
-- отправлено» и сравнение вечером / на следующее утро) и «🪙 Монеты» (coin_ledger — каждое начисление и списание с
-- ключом идемпотентности, user_coins — баланс). Дни премиума в награду — premium_transactions.transaction_type 'reward'.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'daily_plan_enabled') THEN
    ALTER TABLE users ADD COLUMN daily_plan_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    -- Один раз: тем, кто уже получает сводку дня, план тоже включён (потом пользователь решает сам)
    UPDATE users SET daily_plan_enabled = TRUE WHERE daily_summary_enabled = TRUE;
  END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_plan_hour SMALLINT NULL;
COMMENT ON COLUMN users.daily_plan_enabled IS '«☀️ План на день» по утрам';
COMMENT ON COLUMN users.daily_plan_hour IS 'Локальный час плана на день (6–11), NULL — 8:00';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_daily_plan_hour_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_daily_plan_hour_check CHECK (daily_plan_hour IS NULL OR daily_plan_hour BETWEEN 5 AND 11);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS daily_plans (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    daily DECIMAL(14,2) NOT NULL,
    deficit DECIMAL(14,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);
COMMENT ON TABLE daily_plans IS 'Утренний план на локальный день: сколько можно потратить (daily) в основной валюте; строка ставится до отправки — второй раз за день план не уходит';

CREATE TABLE IF NOT EXISTS user_coins (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    earned_total INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE user_coins IS '🪙 Баланс монет (сумма coin_ledger); строка блокируется при обмене — параллельные обмены не уводят в минус';

CREATE TABLE IF NOT EXISTS coin_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(20) NOT NULL,
    ref_key VARCHAR(100) NOT NULL,
    days SMALLINT NULL,
    month CHAR(7) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ref_key)
);
COMMENT ON TABLE coin_ledger IS '🪙 Начисления (amount > 0) и обмены на дни премиума (reason redeem, amount < 0, days, month — локальный месяц для лимита); ref_key — ключ идемпотентности';
CREATE INDEX IF NOT EXISTS idx_coin_ledger_user_created ON coin_ledger(user_id, created_at DESC);

ALTER TABLE premium_transactions DROP CONSTRAINT IF EXISTS premium_transactions_transaction_type_check;
ALTER TABLE premium_transactions ADD CONSTRAINT premium_transactions_transaction_type_check
  CHECK (transaction_type IN ('purchase', 'refund', 'extension', 'activation', 'trial', 'reward'));
COMMENT ON COLUMN premium_transactions.transaction_type IS 'Тип транзакции: purchase (покупка), refund (возврат), extension (продление), activation (активация), trial (пробный период), reward (дни в награду: монеты, квиз — без оплаты)';


-- ==== QUIZ ====
-- «🎲 Угадай свои траты» — квиз недели: 5 вопросов-викторин Telegram о своих тратах (с четверга 19:00 до конца воскресенья
-- по местному времени), очки — билеты в розыгрыш дней премиума (понедельник 12:00 UTC). Приглашение — по четвергам
-- вечером, отключается (users.quiz_invites_enabled). Вопросы хранятся в сессии; poll_id → вопрос — в quiz_polls
-- (ответы poll_answer и закрытие опроса находят вопрос после перезапуска).
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiz_invites_enabled BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN users.quiz_invites_enabled IS 'Приглашение в квиз недели по четвергам вечером (user_notifications quiz_invite); /quiz работает всегда';

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_key DATE NOT NULL,
    lang VARCHAR(5) NOT NULL,
    questions JSONB NOT NULL,
    total SMALLINT NOT NULL,
    current_index SMALLINT NOT NULL DEFAULT 0,
    asked_index SMALLINT NOT NULL DEFAULT -1,
    asked_at TIMESTAMPTZ NULL,
    correct_count SMALLINT NOT NULL DEFAULT 0,
    missed_count SMALLINT NOT NULL DEFAULT 0,
    missed_streak SMALLINT NOT NULL DEFAULT 0,
    answers VARCHAR(20) NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL,
    UNIQUE (user_id, week_key)
);
COMMENT ON TABLE quiz_sessions IS 'Квиз недели пользователя: вопросы (JSON: kind, text, options, correct, explanation, triviaId), прогресс и очки';
COMMENT ON COLUMN quiz_sessions.week_key IS 'Понедельник локальной недели, в которую начат квиз';
COMMENT ON COLUMN quiz_sessions.asked_index IS 'Последний вопрос, отправка которого занята (один отправитель на вопрос)';
COMMENT ON COLUMN quiz_sessions.answers IS 'По символу на вопрос: c — верно, w — неверно, m — не успел (рисуется на карточке)';
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_week ON quiz_sessions(week_key, status);

CREATE TABLE IF NOT EXISTS quiz_polls (
    poll_id VARCHAR(64) PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    question_index SMALLINT NOT NULL,
    message_id BIGINT NULL,
    correct_option SMALLINT NOT NULL,
    kind VARCHAR(8) NOT NULL DEFAULT 'poll' CHECK (kind IN ('poll', 'buttons')),
    deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'missed')),
    chosen_option SMALLINT NULL,
    answered_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, question_index)
);
COMMENT ON TABLE quiz_polls IS 'Отправленные вопросы квиза: poll_id опроса Telegram (или b<сессия>_<вопрос> для кнопок) → сессия, вопрос, срок';
CREATE INDEX IF NOT EXISTS idx_quiz_polls_open ON quiz_polls(deadline) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS quiz_draws (
    week_key DATE PRIMARY KEY,
    seed VARCHAR(64) NOT NULL,
    participants INTEGER NOT NULL,
    total_weight INTEGER NOT NULL,
    digest VARCHAR(64) NOT NULL,
    winners JSONB NOT NULL,
    drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE quiz_draws IS 'Журнал розыгрыша недели: зерно, число участников, сумма очков, отпечаток списка (sha256 «id:очки»), победители — по ним розыгрыш можно повторить';

CREATE TABLE IF NOT EXISTS quiz_prizes (
    id SERIAL PRIMARY KEY,
    week_key DATE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(8) NOT NULL CHECK (kind IN ('grand', 'runner', 'perfect')),
    days SMALLINT NOT NULL,
    grant_started_at TIMESTAMPTZ NULL,
    granted_at TIMESTAMPTZ NULL,
    notified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (week_key, user_id, kind)
);
COMMENT ON TABLE quiz_prizes IS 'Призы квиза (дни премиума, транзакция reward с prize_id в invoice_payload — выдача ровно один раз)';
CREATE INDEX IF NOT EXISTS idx_quiz_prizes_pending ON quiz_prizes(week_key) WHERE granted_at IS NULL OR notified_at IS NULL;
