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
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    family_mode BOOLEAN NOT NULL DEFAULT FALSE
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
COMMENT ON COLUMN users.family_mode IS 'Режим «все траты в семью»: новые траты по умолчанию записываются в семью пользователя';

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
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','expired','cancelled','refunded')),
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
-- Один человек — одна семья
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_user_user_id_unique ON family_user(user_id);
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
