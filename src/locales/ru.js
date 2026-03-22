module.exports = {
  button_reminders: '🔔 Напоминать о себе',
  reminders_enabled: 'Напоминалки включены. Если до 18:00 ничего не записал — напомню с юморком 😉',
  reminders_disabled: 'Напоминалки выключены. Молчу как рыбка 🤐',
  button_configure_reminder_hours: '⏰ Настроить часы напоминаний',
  reminder_hours_info: 'Выберите до 3 часов для напоминаний (локальное время вашего часового пояса). Текущие:',
  reminder_hours_limit: 'Можно выбрать не более 3 часов',
  reminder_hours_saved: '✅ Часы напоминаний сохранены',
  button_save: 'Сохранить',
  button_clear: 'Сбросить',
  
  // Поддержка платежей и политики
  paysupport_message: 'Поддержка платежей\n\nБизнес: {businessName}\nПоддержка: @{supportUsername} / {supportEmail}\n\nУсловия: {termsUrl}\nПолитика конфиденциальности: {privacyUrl}\nВозвраты: {refundPolicyUrl}\n\nПо вопросам платежей Stars и возвратов сначала свяжитесь с поддержкой. Мы соблюдаем правила Telegram Stars.',
  terms_message: '📄 Условия использования: {termsUrl}',
  privacy_message: '🔐 Политика конфиденциальности: {privacyUrl}',
  refund_message: '↩️ Политика возвратов: {refundPolicyUrl}\n\nВопросы: @{supportUsername} / {supportEmail}',
  reminder_sample_variants: [
    '👋 Эй! Если твой кошелёк молчит, это ещё не значит, что он счастлив. Запиши траты 😉',
    '🤔 Сегодня уже что-то потратил? Запиши, пока память не ушла за хлебом 🧠🥖',
    '💭 Если не записал — считай потратил в пустоту. Давай фиксировать 💸',
    '🌊 Капля по капле — и бюджет убежит незамеченным. Лучше запиши сегодняшние траты 🌊',
    '🤖 Бот не ворчит, бот напоминает: пора записать расходы 😌',
    '💡 Береги копейку — рубль сбережёт. Время сделать заметку!',

'💰 Деньги любят счёт и тишину. Запиши траты.',

'💡 Не трать понапрасну — копи на важное. Время сделать запись.',

'🏗️ Малые сбережения — большие дела. Добавь покупку сейчас.',

'🌱 Сегодня сэкономил — завтра легче. Запиши траты.',

'🔄 Бережёный рубль два приносит. Внеси расход за минуту.',

'⏰ Сначала отложи — потом потрать. Время сделать заметку!',

'🧱 Каждая копейка — кирпичик свободы. Запиши расход.',

'🛡️ На чёрный день копи заранее. Добавь запись сейчас.',

'📈 Разумный расход — лучшая инвестиция. Зафиксируй покупку.',

'🎯 Контроль расходов = меньше забот. Запиши траты.',

'🚀 Меньше импульсов — больше возможностей. Время сделать запись.',

'💎 Плати себе сначала. Добавь расход в бот.',

'✂️ Отсечённый лишний расход — найденный доход. Внеси покупку.',

'🎪 Бюджет — свобода выбора. Запиши траты за сегодня.',

'🌟 Сбережения — «да» будущему. Время сделать заметку!',

'⚡ Дисциплина сильнее хаоса. Зафиксируй расход.',

'⏳ Деньги уходят тихо — записывай вовремя. Добавь трату сейчас.',

'🧘 Бережливость — путь к спокойствию. Запиши покупку.',

'📋 Деньги любят порядок. Время сделать запись.'
  ],
  reminder_message_title: 'Напоминалка',
  reminder_turn_on_off: (enabled) => enabled ? 'Выключить напоминалки' : 'Включить напоминалки',
  
  // Bug reports
  button_bug_report: '🐛 Сообщить о баге / Предложить улучшение',
  bug_report_prompt: '🐛 *Сообщить о баге или предложить улучшение*\n\nОпишите проблему или предложите улучшение (до 1000 символов):',
  bug_report_success: '✅ Спасибо! Ваше сообщение отправлено разработчикам.',
  bug_report_too_long: '❌ Слишком длинное сообщение! Сократите на {excess} символов (максимум 1000).',
  bug_report_empty: '❌ Пустое сообщение. Опишите проблему или предложение.',
  bug_report_rate_limit: '⚠️ Слишком много баг-репортов!\n\nМожно отправлять только 3 репорта за 10 минут',
  bug_report_suspicious: '⚠️ Сообщение содержит недопустимые символы или подозрительный контент',
  
  // Security messages
  security_rate_limit: '⚠️ *Слишком много запросов*\n\nПопробуйте через {resetTime} секунд\nЛимит: {limit} запросов в минуту',
  security_validation_error: '⚠️ *Ошибка валидации*\n\n{message}',
  security_error: '❌ *Ошибка безопасности*\n\nПопробуйте позже или обратитесь к администратору.',
  
  // Admin panel
  button_admin: '👑 Админка',
  admin_access_denied: '❌ У вас нет прав администратора.',
  admin_panel_title: '👑 *Панель администратора*\n\nВыберите действие:',
  admin_error: '❌ Произошла ошибка при выполнении администраторского действия.',
  
  // Admin stats
  admin_stats_text: `📊 *Статистика бота*

👥 **Пользователи:**
• Всего: {totalUsers}
• Премиум: {activePremium}
• Новых за неделю: {newUsersWeek}
• Новых за месяц: {newUsersMonth}

💰 **Расходы:**
• Всего записей: {totalExpenses}
• За неделю: {expensesWeek}
• Активных пользователей: {activeUsers}

🐛 **Баг-репорты:** {totalBugReports}

💎 **Донаты:**
• Всего: {totalDonations}
• Звезд собрано: {totalStars}

⭐ **Премиум транзакции:** {premiumTransactions}`,

  // Admin users
  admin_users_title: '👥 *Пользователи* (стр. {page}/{totalPages})\n\nВсего: {totalUsers}\n',
  
  // Admin bug reports
  admin_bug_reports_title: '🐛 *Баг-репорты*',
  bug_report_status_new: '🆕 Новые',
  bug_report_status_in_progress: '🔄 В работе',
  bug_report_status_resolved: '✅ Решены',
  bug_report_status_closed: '🔒 Закрыты',
  
  // Admin donations
  admin_donations_text: `💰 *Статистика донатов*

📊 **Общая статистика:**
• Всего донатов: {totalDonations}
• Завершенных: {completedDonations}
• В ожидании: {pendingDonations}

⭐ **Звезды:**
• Всего собрано: {totalStars}
• Средний донат: {avgStars} звезд`,

  // Admin premium 
  admin_premium_stats: `⭐ *Статистика премиума*

📊 **Пользователи:**
• Всего премиум: {totalPremiumUsers}
• Активных сейчас: {activePremiumUsers}

💳 **Транзакции:**
• Всего операций: {totalTransactions}
• Общий доход: {totalRevenue} звезд`,

  // Admin admins
  admin_admins_title: '👑 *Администраторы* ({count})\n',
  
  // Admin search
  admin_search_prompt: '🔍 *Поиск пользователя*\n\nВведите ID пользователя или username:',
  admin_search_not_found: '❌ Пользователь не найден.',
  admin_search_results: '🔍 *Результаты поиска* "{query}"\n\nНайдено: {count}\n',
  
  // Admin user details
  admin_user_not_found: '❌ Пользователь не найден.',
  admin_user_details: `👤 *Информация о пользователе*

{adminFlag}{premiumFlag} **{firstName}** (@{username})
🆔 ID: {userId}
🌐 Язык: {language}
💱 Валюта: {currency}
🕐 Часовой пояс: {timezone}
📅 Регистрация: {createdAt}

📊 **Статистика:**
• Записей расходов: {totalExpenses}
• Общая сумма: {totalAmount}
• Баг-репортов: {bugReportsCount}
• Транзакций: {transactionsCount}`,

  // Admin actions
  admin_promote_success: '✅ Пользователь {userId} назначен администратором.',
  admin_demote_success: '✅ У пользователя {userId} удалены права администратора.',
  admin_cannot_demote_self: '❌ Нельзя удалить права администратора у самого себя.',
  admin_grant_premium_options: '⭐ *Выдать премиум пользователю {userId}*\n\nВыберите период:',
  admin_grant_premium_success: '✅ Пользователю {userId} выдан премиум на {days} дней.',
  admin_revoke_premium_success: '✅ У пользователя {userId} отозван премиум.',

  // Admin broadcast
  admin_broadcast_prompt: '📢 *Массовое уведомление*\n\nВведите текст уведомления для всех пользователей (до 3600 символов):',
  admin_broadcast_too_long: '❌ Сообщение слишком длинное!\n\n📏 Текущая длина: {current} символов\n📏 Максимум: {max} символов\n📏 Нужно убрать: {excess} символов',
  admin_broadcast_confirm: '📢 *Подтвердите отправку массового уведомления*\n\n📝 **Текст сообщения:**\n{message}\n\n📏 **Длина:** {length} символов\n\n⚠️ Это сообщение будет отправлено **ВСЕМ** пользователям бота!',
  admin_broadcast_started: '📢 Рассылка начата...',
  admin_broadcast_result: '📢 *Рассылка завершена!*\n\n📊 **Статистика:**\n• Всего пользователей: {total}\n• Успешно отправлено: {sent}\n• Ошибок: {failed}',
  admin_broadcast_header: '🔴🔴🔴 *Уведомление!* 🔴🔴🔴',
  
  // Общие сообщения
  welcome: 'Привет, {name}! 👋',
  main_menu_title: '🏠 *Главное меню*\n\nВыберите действие:',
  error: 'Произошла ошибка 😞',
  unknown_error: 'Произошла неожиданная ошибка. Попробуйте позже.',
  not_found: 'Не найдено',
  error_invalid_description_format: '❌ Неверный формат расхода. Используйте: сумма описание или сумма категория описание',
  expense_save_error: '❌ Ошибка при сохранении расхода. Попробуйте ещё раз.',
  cancel: 'Отмена',
  back: 'Назад',
  confirm: 'Подтвердить',
  save: 'Сохранить',
  
  // Команды
  start_message: `Привет! 👋 Я помогу тебе вести учёт расходов и контролировать бюджет.

*Как добавить расход:*
Просто напиши сумму и описание через пробел:
-  \`200 продукты в магазине\`
-  \`1500 обед в ресторане\`
-  \`50 проезд\`
-  \`150,50 кофе\`

После ввода появится меню с кнопками категорий - выбери подходящую! 🏷️

*Основные команды:*
/start - перезапустить бота
/menu - открыть интерактивное меню (Рекомендуется)
/history - последние записи за день
/stats - подробная статистика по категориям

/export - скачать данные в CSV
/undo - отменить последнюю запись

*Настройки:*
/settings - открыть настройки
/currency - установить базовую валюту
/timezone - настроить часовой пояс
/categories - управление категориями

*Дополнительные функции:*
/family - управление семейным бюджетом
/limits - лимиты и премиум функции
/help - показать подробную справку

Начни вводить свои расходы! 💰`,

  help_message: `📋 *Подробная справка по командам*

*Добавление расходов:*
Напиши сумму и описание через пробел:
\`200 продукты\` - появится меню с кнопками категорий
\`150,50 кофе\` - поддерживаются десятичные числа

*Основные команды:*
/start - перезапустить бота и показать приветствие
/menu - открыть интерактивное меню со всеми функциями
/history - показать последние записи за сегодня
/stats - подробная статистика по категориям за месяц

/export - скачать все данные в формате CSV
/undo - отменить последнюю добавленную запись

*Настройки и управление:*
/settings - открыть главное меню настроек
/currency - изменить базовую валюту (RUB, USD, EUR, KZT, CNY, THB)
/timezone - настроить часовой пояс для корректного учёта
/categories - управление пользовательскими категориями (премиум)

*Семейный бюджет:*
/family - управление семейными группами и общими расходами
- Создание семьи, приглашение участников
- Общие траты и статистика
- Экспорт семейных данных

*Премиум функции:*
/limits - информация о лимитах и премиум возможностях
- Пользовательские категории
- Расширенная статистика
- Семейный бюджет
- Приоритетная поддержка

*Советы по использованию:*
• Используй описания для лучшего понимания трат
• Регулярно проверяй статистику через /stats
• Настрой часовой пояс для точного учёта
• Используй /menu для быстрого доступа к функциям
• Экспортируй данные через /export для анализа

*Редактирование трат:*
• В режиме редактирования истории (/history) можно удалять и редактировать записи
• Кнопка "👨‍👩‍👧‍👦 В семью" позволяет переносить личные траты в семейный бюджет
• Кнопка "🚫 Из семейного бюджета" возвращает семейные траты в личные
• Редактировать и удалять можно только свои траты

*Напоминания:*
• Бот автоматически напоминает о записи трат в 18:00 по вашему времени
• Напоминания отправляются только если вы не записали траты за день
• Напоминания можно включить/выключить в настройках
• Каждый день отправляется максимум одно напоминание

*Поддержка:*
Если возникли вопросы или проблемы, используй команду /start для возврата в главное меню.

Удачного учёта расходов! 💰📊`,

  // Расходы
  expense_added: '✅ Записал: {amount} - {description}',
  expense_updated: '✅ Запись обновлена: {amount} - {description}',
  expense_deleted: '✅ Удалена запись: {amount} - {description}',
  no_expenses: 'Нет записей для удаления 🤷‍♂️',
  expense_not_found: 'Ошибка: запись не найдена.',
  expense_update_error: 'Ошибка: запись не найдена или не обновлена.',
  
  // Статистика
  monthly_stats: '💰 *Расходы за текущий месяц*',
  daily_stats: '💰 *Расходы за сегодня*',
  total_spent: 'Потрачено: *{amount}*',
  records_count: 'Записей: {count}',
  no_expenses_period: 'Нет трат за этот период.',
  
  // Категории
  select_category: 'Выберите категорию:',
  amount_label: 'Сумма',
  description_label: 'Описание',
  category_label: 'Категория',
  expense_added_title: 'Расход добавлен!',
  no_categories: 'Категории не найдены.',
  category_expenses: 'Траты по категории "{category}"',
  no_category_expenses: 'Нет трат по этой категории за последний месяц.',
  
  // Настройки
  settings_title: 'Настройки:',
  currency_select: 'Выберите валюту, которая будет использоваться по умолчанию:',
  currency_set: 'Валюта установлена: {currency}',
  currency_updated: 'Валюта успешно изменена на {currency}',
  button_change_period_start: '📅 Число начала периода',
  period_start_prompt: 'Введи число с которого каждый месяц будет начинаться новый период 👇🏼\n\nЭто число от 1 до 31. В месяцах короче берём последний день.',
  period_start_invalid: '❌ Некорректное число. Введите целое число от 1 до 31.',
  period_start_set: '✅ Число начала периода установлено: {day}',
  timezone_setup: `🕐 *Настройка часового пояса*

Сколько у вас сейчас времени?

*Текущее время по UTC:* {utcTime}

Выберите ваше текущее время:`,
  timezone_set: '✅ Часовой пояс установлен: {timezone}',
  
  // Семейный бюджет
  button_family: '👨‍👩‍👧‍👦 Семья',
  family_label: '🏠 *Семья:*',
  family_owner_label: '👑 *Владелец:*',
  family_info: '👨‍👩‍👧‍👦 *Семейный бюджет*\n\nЗдесь вы можете управлять расходами вместе с близкими, коллегами, друзьями и т.д.\n\n- \uD83D\uDC6A Создаётся общая группа для учёта совместных трат.\n- \u2795 Каждый участник может добавлять расходы.\n- \uD83D\uDDD1\uFE0F Можно удалять свои расходы при необходимости.\n- \uD83D\uDCCA Доступна общая статистика по всем участникам.\n- \uD83D\uDCE4 Экспорт данных всей группы в один файл.\n\nСовместный контроль — меньше хаоса и больше прозрачности.',
  family_created: '✅ Семья "{name}" создана! Теперь вы можете приглашать участников.',
  family_joined: '✅ Вы присоединились к семье "{name}"!',
  family_left: '✅ Вы покинули семью "{name}".',
  family_deleted: '✅ Семья "{name}" удалена. Все семейные траты стали личными.',
  family_member_removed: '✅ Участник удален из семьи.',
  family_member_removed_notification: '❌ Вас удалили из семьи *{familyName}*.',
  family_cannot_leave_owner: '❌ Владелец семьи не может покинуть семью. Используйте "Удалить семью".',
  
  // Кнопки семейного меню
  create_family: '🏠 Создать семью',
  join_family: '🔗 Присоединиться к семье',
  invite_member: '➕ Пригласить участника',
  leave_family: '🚪 Покинуть семью',
  delete_family: '🗑️ Удалить семью',
  family_members: '👥 Участники семьи',
  family_stats: '💰 Расходы за месяц',
  family_daily_stats: '💰 Расходы за день',
  family_add_expense: '💰 Добавить семейную трату',
  family_menu: '👨‍👩‍👧‍👦 Меню семьи',
  family_cancel: '❌ Отмена',
  
  // Приглашения
  invitation_sent: '✅ Приглашение отправлено пользователю @{username}',
  invitation_accepted: '✅ Вы приняли приглашение в семью "{name}"!',
  invitation_rejected: '❌ Вы отклонили приглашение в семью "{name}".',
  invitation_not_found: '❌ Приглашение не найдено или истекло.',
  invitation_expired: '❌ Приглашение истекло.',
  invitation_already_processed: '❌ Приглашение уже обработано.',
  
  // Сообщения для ввода
  enter_family_name: 'Введите название семьи (3-50 символов):',
  enter_invite_username: 'Введите username пользователя (без @):',
  enter_expense_amount: 'Введите сумму и описание семейной траты:',
  
  // Ошибки
  family_name_too_short: '❌ Название семьи должно содержать минимум 3 символа.',
  family_name_too_long: '❌ Название семьи не должно превышать 50 символов.',
  user_not_found: '❌ Пользователь не найден.',
  user_already_in_family: '❌ Пользователь уже состоит в семье.',
  user_already_has_invitation: '❌ У пользователя уже есть активное приглашение.',
  user_already_in_other_family: '❌ Пользователь уже состоит в другой семье.',
  user_already_in_your_family: '❌ Пользователь уже является членом вашей семьи.',
  user_not_premium: '❌ Пользователь не имеет премиум-статуса.',
  only_owner_can_invite: '❌ Только владелец семьи может приглашать участников.',
  active_invitations: '📋 Активные приглашения',
  no_active_invitations: '📋 У вас нет активных приглашений.',
  active_invitations_list: '📋 Активные приглашения:',
  cancel_invitation: '❌ Отменить приглашение',
  invitation_cancelled: '✅ Приглашение отменено.',
  invitation_not_found: '❌ Приглашение не найдено.',
  not_authorized: '❌ У вас нет прав для выполнения этого действия.',
  invitation_code: '🔑 Код приглашения: `{code}`',
  family_invitation_received: '🎉 Вас приглашают в семью *{familyName}*\n\n👤 Пригласил: {inviterName}\n🔑 Код: `{inviteCode}`\n\nВыберите действие:',
  accept_invitation: '✅ Принять',
  reject_invitation: '❌ Отклонить',
  invitation_accepted: '🎉 Поздравляем! Вы присоединились к семье *{familyName}*',
  invitation_rejected: '❌ Вы отклонили приглашение в семью',
  invitation_not_pending: '❌ Приглашение не в ожидании',
  invitation_expired: '❌ Приглашение истекло',
  invitation_cancelled_notification: '❌ Приглашение в семью *{familyName}* было отменено пользователем {cancelledBy}',
  enter_invite_code: '🔑 Введите код приглашения:',
  only_owner_can_remove: '❌ Только владелец семьи может удалять участников.',
  only_owner_can_delete: '❌ Только владелец семьи может удалить семью.',
  cannot_remove_owner: '❌ Нельзя удалить владельца семьи.',
  cannot_remove_yourself: '❌ Нельзя удалить самого себя.',
  family_not_found: '❌ Семья не найдена.',
  not_family_member: '❌ Вы не являетесь участником семьи.',
  not_family_owner: '❌ Вы не являетесь владельцем семьи.',
  
  // Подтверждения
  confirm_delete_family: '⚠️ *Удаление семьи*\n\nВсе участники будут удалены, а семейные траты станут личными.\n\nВы уверены?',
  confirm_remove_member: '⚠️ *Удаление участника*\n\nУчастник будет удален из семьи.\n\nВы уверены?',
  
  // Статистика семьи
  family_monthly_stats: '👨‍👩‍👧‍👦 *Расходы семьи за месяц*',
  family_daily_stats: '💰 Расходы за день',
  family_daily_stats_title: '👨‍👩‍👧‍👦 *Расходы семьи за день*',
  family_export: '📊 Экспорт семьи',
  family_total_spent: 'Потрачено: *{amount}*',
  family_members_count: 'Участников: {count}',
  family_no_expenses: 'Нет семейных трат за этот период.',
  
  // Список участников
  family_members_title: '👥 *Участники семьи*',
  family_member_info: '• {name} ({role}) - присоединился {date}',
  family_owner_role: 'владелец',
  family_member_role: 'участник',
  remove_member: '❌ Исключить',
  confirm_remove_member: '⚠️ *Исключение участника*\n\nВы уверены, что хотите исключить {name} из семьи?',
  member_removed: '✅ Участник {name} исключен из семьи.',
  member_removed_notification: '❌ Вы были исключены из семьи *{familyName}* владельцем {ownerName}.',
  
  // Премиум функции
  premium_required: '❌ Эта функция доступна только для премиум пользователей.',
  upgrade_to_premium: '💎 Обновитесь до премиум для доступа к семейному бюджету!',
  
  timezone_updated: `✅ *Часовой пояс обновлен!*

🕐 Выбранное время: *{time}*
🌍 Рассчитанный часовой пояс: *{timezone}*

Теперь все ваши расходы будут корректно отображаться в вашем местном времени.`,
  timezone_updated_simple: `✅ *Часовой пояс обновлен!*

🌍 Новый часовой пояс: *{timezone}*

Теперь все ваши расходы будут корректно отображаться в вашем местном времени.`,
  
  // Лимиты
  limits_overview_title: '📊 Обзор лимитов',
  limits_title: '📊 *Информация о лимитах*',
  status_regular: '👤 Стандарт',
  status_premium: '💎 Премиум',
  status_label: '*Статус:* {status}',
  records_usage: '<b>Записей:</b> {current}/{max} ({percentage}%)',
  records_remaining: '<b>Осталось:</b> {remaining} записей',
  max_description_length: '<b>Макс. длина описания:</b> {length} символов',
  near_limit_warning: '⚠️ *Внимание:* Вы близки к лимиту записей!',
  limit_reached: '❌ *Достигнут лимит записей!*',
  premium_benefits: `💎 <b>Преимущества премиума:</b>
• 160 символов в описании (вместо 80)
• 300 записей (вместо 100)
• До 5 собственных категорий
• Расширенная статистика
• Семейный бюджет
• Возможность редактирования и удаления трат(не только последней)`,
  
  // Премиум подписка
  premium_subscription_title: '⭐️ Подписка',
  premium_status_header: '<b>Ваш статус:</b>',
  premium_privileges: 'Привилегии: {status}',
  premium_limits_info: 'Здесь отображаются ваши лимиты, например: количество категорий, трат, доступ к семейным возможностям, текущий период премиума или его отсутствие.',
  premium_menu_title: '<b>Меню:</b>',
  premium_tariff_button: '⭐️ Тариф',
  premium_why_paid_button: '👀 Почему сервис платный?',
  premium_donate_button: '🤝 Пожертвовать',
  premium_back_button: '⬅️ Назад',
  premium_tariffs_title: '⭐️ Тарифы (Telegram Stars)',
  per_month: 'в месяц',
  premium_payment_info: '💳 Оплата происходит с помощью Telegram Stars — внутренней валюты Telegram для удобной и безопасной оплаты внутри мессенджера. <b>Автоматического продления нет.</b>',
  premium_renewal_info: '📅 Продлить подписку можно в любой момент. К оставшемуся сроку прибавится соответствующее количество дней.',
  premium_stars_info: '💡 Приобрести звёзды без комиссии Apple / Google можно в официальном боте [@PremiumBot].',
  premium_why_paid_title: '👀 Почему сервис платный?',
  premium_purchases_button: '🧾 История покупок',
  purchases_header: '🧾 История покупок',
  purchases_premium_title: 'Покупки премиума',
  purchases_donations_title: 'Донаты',
  no_purchases: 'Покупок пока нет',
  purchases_prev_button: '◀ Назад',
  purchases_next_button: 'Вперёд ▶',
  purchases_page_indicator: 'Стр. {page}/{total}',
  premium_why_paid_text: 'Содержание сервера для этого бота обходится примерно в $200 в месяц — и это даже без учёта стремительно растущего числа пользователей. А я, как разработчик, ещё и кушать хочу чтобы были силы пилить вам сервис :)',
  premium_payment_title: '💳 *Оплата премиум подписки*',
  premium_payment_description: 'Вы выбрали тариф: <b>{duration}</b>\nСтоимость: <b>{stars} ⭐️</b>\n\nНажмите кнопку ниже для перехода к оплате через Telegram Stars.',
  // Лейблы тарифов и продукта
  tariff_button_30: '1 Месяц',
  tariff_button_90: '3 Месяца',
  tariff_button_180: '6 Месяцев',
  tariff_button_365: '1 Год',
  tariff_item_30: '1 месяц (30 дней)',
  tariff_item_90: '3 месяца (90 дней)',
  tariff_item_180: '6 месяцев (180 дней)',
  tariff_item_365: '12 месяцев (365 дней)',
  premium_product: 'Премиум подписка',
  discount_save: 'экономия {percent}%',

  payment_success: '🎉 *Оплата прошла успешно!*\n\nВаша премиум подписка активирована. Теперь вам доступны все расширенные возможности бота!',
  donation_success: '🙏 *Спасибо за поддержку проекта!*\n\nВаше пожертвование поможет развивать бота и добавлять новые функции.',
  general_payment_success: '✅ *Платеж прошел успешно!*\n\nСпасибо за использование нашего бота.',
  premium_expires: '📅 Премиум подписка действительна до: <b>{date}</b>\n⏰ Осталось дней: <b>{days}</b>',

  // Donations
  donate_prompt_title: '🤝 Поддержать проект',
  donate_prompt_text: 'Введи число звезд (Telegram Stars), которое ты хочешь задонатить.\n\n(За раз можно отправить от 1 до 2500 звезд)\n\nМожешь добавить письмо до 500 символов — просто напиши его после числа на новой строке.',
  donate_invalid: '❌ Введите целое число от 1 до 2500. Письмо — до 500 символов.',
  donate_created: '✅ Заявка на донат создана: {stars} ⭐️. Сейчас пришлю ссылку на оплату.',
  donate_paid: '🙏 Спасибо за поддержку! Донат получен: {stars} ⭐️',
  
  // Ошибки валидации
  error_too_long_regular: '❌ Описание слишком длинное!\nМаксимум 80 символов для обычных пользователей.',
  error_too_long_premium: '❌ Описание слишком длинное!\nМаксимум 160 символов для премиум пользователей.',
  error_no_description: '❌ Нужно указать описание после суммы.',
  error_amount: '❌ Некорректная сумма. Введите число от 0.01 до 999999.',
  error_format: '❌ Не понял формат. Напиши сумму и описание через пробел.\nНапример: `200 продукты` или `1500 обед в кафе`',
  error_forbidden_content: '❌ Недопустимое содержимое.',
  error_limit_reached: '❌ Достигнут лимит записей!\nОбычные пользователи: 100 записей\nПремиум пользователи: 300 записей\n\n💎 Перейдите на премиум для увеличения лимитов!',
  error_premium_required: '💎 Эта функция доступна только премиум пользователям!\n\nПреимущества премиума:\n• 160 символов в описании (вместо 80)\n• 300 записей (вместо 100)\n• Кастомные категории\n• Расширенная статистика',
  error_generic: '❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.',
  
  // Кнопки
  button_menu: '📋 Меню',
  button_expenses_month: '💰 Траты за месяц',
  button_expenses_day: '💰 Траты за день',
  button_expenses_categories: '💰 Траты по категориям',
  button_export: '📊 Экспорт',
  button_family: '👨‍👩‍👧‍👦 Семья',
  button_settings: '⚙️ Настройки',
  button_delete_last: '🗑️ Удалить последнюю запись',
  button_limits: '📊 Лимиты',
  button_help: '❓ Справка',
  button_edit: 'Редактировать',
  button_delete: 'Удалить',
  button_mark_as_family: '👨‍👩‍👧‍👦 В семью',
  button_remove_from_family: '🚫 Из семейного бюджета',
  expense_already_family: '❌ Эта трата уже семейная',
  expense_converted_to_family: '✅ Трата перенесена в семейный бюджет',
  expense_removed_from_family: '✅ Трата убрана из семейного бюджета',
  not_owner: '❌ Вы не являетесь автором этой траты',
  button_cancel: '❌ Отмена',
  button_back: '⬅️ Назад',
  button_change_currency: '💱 Сменить валюту',
  button_change_timezone: '🌍 Часовой пояс',
  button_change_language: '🌐 Язык',
  button_custom_categories: '🏷️ Кастомные категории',
  
  // Главное меню
  main_menu_title: '🏠 *Главное меню*\n\nВыберите действие:',
  
  // Языки
  language_select: '🌍 Выберите язык:',
  language_set: '✅ Язык изменен на русский',
  language_not_supported: '❌ Язык не поддерживается',
  language_change_error: '❌ Произошла ошибка при смене языка',
  timezone_error: '❌ Произошла ошибка при установке часового пояса',
  
  // Экспорт
  export_success: '📊 Данные экспортированы успешно!',
  export_error: 'Произошла ошибка при экспорте данных 😞',
  export_title: '📊 Экспорт расходов',
  export_period_day: '📅 За сегодня',
  export_period_week: '📅 За неделю',
  export_period_month: '📅 За месяц',
  export_period_all: '📅 За всё время',
  export_period_range: '📅 Выбрать даты...',
  export_filter_categories: '🔽 Фильтр по категориям',
  export_select_categories: 'Выберите категории для экспорта:',
  export_select_all: '✅ Выбрать все',
  export_deselect_all: '❌ Снять все',
  export_done: '✅ Готово',
  export_no_categories: 'Выберите хотя бы одну категорию',
  export_enter_dates: '📅 Введите диапазон дат в формате:\n\n`01.03-15.03` или `01.03.2025-15.03.2025`',
  export_invalid_date_format: '❌ Неверный формат дат. Используйте: `01.03-15.03` или `01.03.2025-15.03.2025`',
  expense_save_error: 'Произошла ошибка при сохранении расхода 😞',
  keyboard_updated: '✅ Клавиатура обновлена на ваш язык!',
  
  // Редактирование
  edit_canceled: 'Редактирование отменено.',
  edit_no_active: 'Нет активного редактирования.',
  edit_instructions: 'Введите новую сумму и/или описание для этой траты (например: 500 кофе).\n\nИли нажмите кнопку ниже для отмены.',
  edit_empty: 'Введите новую сумму, описание или оба значения.',
  edit_amount_error: 'Некорректная сумма.',
  edit_too_long: 'Описание слишком длинное (максимум {max} символов).',
  edit_format_error: 'Ошибка формата.',
  
  // Callback ответы
  callback_limit_reached: '❌ Достигнут лимит записей',
  callback_button_not_found: '❌ Ошибка: кнопка не найдена',
  callback_data_not_found: '❌ Ошибка: данные не найдены',
  callback_expense_added: '✅ Добавлено в категорию "{category}"',
  callback_expense_saved: '❌ Произошла ошибка при сохранении',
  callback_canceled: '❌ Отменено',
  callback_expense_canceled: '❌ Добавление расхода отменено',
  callback_deleted: 'Запись удалена!',
  callback_delete_error: 'Ошибка удаления или запись не найдена',
  callback_edit_mode: 'Выход из режима редактирования:',
  callback_no_cards: 'почему-то карточек нет...произошла ошибка',
  
  // Статистика
  by_categories: 'По категориям:',
  no_expenses_category: 'Нет трат по этой категории за последний месяц.',
  select_category: 'Выберите категорию:',
  
  // Форматирование
  amount_format: '{amount} {currency}',
  date_format: '{day}.{month}.{year}',
  time_format: '{hour}:{minute}',
  
  // Экспорт CSV
  date_label: 'Дата',
  currency_label: 'Валюта',
  total_by_currencies: 'Итого по валютам:',
  total_in_currency: 'Итого в {currency}',
  
  // Категории по умолчанию
  category_food: 'Еда',
  category_transport: 'Транспорт',
  category_entertainment: 'Развлечения',
  category_shopping: 'Покупки',
  category_health: 'Здоровье',
  category_other: 'Другое'
  ,
  // Кастомные категории (премиум)
  custom_categories_title: '🏷️ Кастомные категории',
  custom_categories_info: 'Здесь вы можете создать собственные категории расходов (только для премиум).',
  custom_categories_example: '💡 Пример: "🌍 Путешествия" или "🎮 Игры"',
  custom_categories_add: '➕ Добавить категорию',
  custom_categories_manage: '🗂️ Управление категориями',
  custom_categories_enter_name: 'Введите название новой категории (1-30 символов):',
  custom_categories_created: '✅ Категория создана: {name}',
  custom_categories_exists: '❌ Такая категория уже существует.',
  custom_categories_limit_reached: '❌ Достигнут лимит кастомных категорий: {max}',
  custom_categories_list_empty: 'У вас нет кастомных категорий.',
  custom_categories_list_title: 'Ваши кастомные категории:',
  custom_categories_delete: '🗑️ Удалить',
  custom_categories_deleted: '✅ Категория удалена.',
  custom_categories_premium_required: '💎 Эта функция доступна только премиум пользователям.'
  ,
  // Новые ключи для суточной сводки и лимитов
  button_daily_summary: '🗓️ Ежедневная сводка',
  button_notifications_management: '🔔 Управление оповещениями',
  notifications_management_title: '🔔 Управление оповещениями',
  button_configure_daily_summary: '🕒 Настроить час сводки',
  daily_summary_title: 'Сводка за день',
  daily_summary_enabled: '✅ Ежедневная сводка включена',
  daily_summary_disabled: '✅ Ежедневная сводка выключена',
  daily_total_spent: 'Потрачено за день',

  // Лимиты по категориям
  button_toggle_category_limits: '📦 Лимиты по категориям',
  button_category_limits: '🏷️ Лимиты на категории',
  category_limits_title: '🏷️ Лимиты на категории',
  category_limits_enabled: '✅ Лимиты по категориям включены',
  category_limits_disabled: '✅ Лимиты по категориям выключены',
  category_limit_enter_amount: 'Введите сумму лимита для выбранной категории (в вашей валюте):',
  category_limit_saved: '✅ Лимит по категории сохранён',
  category_limit_exceeded: '⚠️ Превышен лимит по категории',
  category_limits_exceeded_info: 'Превышены лимиты по категориям',
  invalid_limit_amount: '❌ Некорректная сумма. Введите положительное число.',

  // Глобальные лимиты
  button_toggle_global_limits: '🧩 Глобальные лимиты (день/месяц)',
  button_limits_management: '⚙️ Управление лимитами',
  limits_management_title: '⚙️ Управление лимитами',
  global_limits_enabled: '✅ Глобальные лимиты включены',
  global_limits_disabled: '✅ Глобальные лимиты выключены',
  button_set_daily_limit: '📅 Дневной лимит',
  button_set_monthly_limit: '📆 Месячный лимит',
  enter_daily_limit: 'Введите сумму дневного лимита (пусто или 0 — снять лимит):',
  enter_monthly_limit: 'Введите сумму месячного лимита (пусто или 0 — снять лимит):',
  daily_limit_saved: '✅ Дневной лимит сохранён',
  monthly_limit_saved: '✅ Месячный лимит сохранён',
  limit_cleared: 'Снят',
  daily_limit: 'Дневной лимит',
  monthly_limit: 'Месячный лимит',
  daily_limit_exceeded: 'Превышен дневной лимит',
  monthly_limit_exceeded: 'Превышен месячный лимит',
  daily_summary_hour_info: 'Выберите час локального времени для ежедневной сводки:',
  daily_summary_hour_set: 'Час сводки сохранён',
  no_limits_set: 'Лимиты не заданы'
}; 