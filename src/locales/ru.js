module.exports = {
  button_reminders: '🔔 Напоминать о себе',
  reminders_enabled: '🔔 Напоминания включены',
  reminders_disabled: 'Напоминалки выключены. Молчу как рыбка 🤐',
  button_configure_reminder_hours: '⏰ Настроить часы напоминаний',
  reminder_hours_info: 'Выбери до 3 часов для напоминаний (локальное время твоего часового пояса). Текущие:',
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
  bug_report_prompt: '🐛 *Сообщить о баге или предложить улучшение*\n\nОпиши проблему или предложи улучшение (до 1000 символов):',
  bug_report_success: '✅ Спасибо! Твоё сообщение отправлено разработчикам.',
  bug_report_too_long: '❌ Слишком длинное сообщение! Сократи на {excess} символов (максимум 1000).',
  bug_report_empty: '❌ Пустое сообщение. Опиши проблему или предложение.',
  bug_report_rate_limit: '⚠️ Слишком много баг-репортов!\n\nМожно отправлять только 3 репорта за 10 минут',
  bug_report_suspicious: '⚠️ Сообщение содержит недопустимые символы или подозрительный контент',
  
  // Security messages
  security_rate_limit: '⚠️ *Слишком много запросов*\n\nПопробуй через {resetTime} секунд\nЛимит: {limit} запросов в минуту',
  security_validation_error: '⚠️ *Ошибка валидации*\n\n{message}',
  security_error: '❌ *Ошибка безопасности*\n\nПопробуй позже или напиши администратору.',
  
  // Admin panel
  button_admin: '👑 Админка',
  admin_access_denied: '❌ У тебя нет прав администратора.',
  admin_panel_title: '👑 *Панель администратора*\n\nВыбери действие:',
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
  admin_search_prompt: '🔍 *Поиск пользователя*\n\nВведи ID пользователя или username:',
  admin_search_not_found: '❌ Пользователь не найден.',
  admin_search_results: '🔍 *Результаты поиска* "{query}"\n\nНайдено: {count}\n',
  
  // Admin user details
  admin_user_not_found: '❌ Пользователь не найден.',
  admin_user_details: `👤 *Информация о пользователе*

{adminFlag}{premiumFlag} {firstName} (@{username})
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
  admin_grant_premium_options: '⭐ *Выдать премиум пользователю {userId}*\n\nВыбери период:',
  admin_grant_premium_success: '✅ Пользователю {userId} выдан премиум на {days} дней.',
  admin_revoke_premium_success: '✅ У пользователя {userId} отозван премиум.',

  // Admin broadcast
  admin_broadcast_prompt: '📢 *Массовое уведомление*\n\nВведи текст уведомления для всех пользователей (до 3600 символов):',
  admin_broadcast_too_long: '❌ Сообщение слишком длинное!\n\n📏 Текущая длина: {current} символов\n📏 Максимум: {max} символов\n📏 Нужно убрать: {excess} символов',
  admin_broadcast_confirm: '📢 *Подтверди отправку массового уведомления*\n\n📝 **Текст сообщения:**\n{message}\n\n📏 **Длина:** {length} символов\n\n⚠️ Это сообщение будет отправлено **ВСЕМ** пользователям бота!',
  admin_broadcast_started: '📢 Рассылка начата...',
  admin_broadcast_result: '📢 *Рассылка завершена!*\n\n📊 **Статистика:**\n• Всего пользователей: {total}\n• Успешно отправлено: {sent}\n• Ошибок: {failed}',
  admin_broadcast_header: '🔴🔴🔴 *Уведомление!* 🔴🔴🔴',
  
  // Общие сообщения
  welcome: 'Привет, {name}! 👋',
  error: 'Произошла ошибка 😞',
  unknown_error: 'Произошла неожиданная ошибка. Попробуй позже.',
  not_found: 'Не найдено',
  error_invalid_description_format: '❌ Неверный формат расхода. Используй: сумма описание или сумма категория описание',
  cancel: 'Отмена',
  back: 'Назад',
  confirm: 'Подтвердить',
  save: 'Сохранить',
  
  // Команды
  start_message: `Привет! 👋 Я помогу вести учёт расходов и доходов.

*Трата* — просто напиши сумму и описание: \`250 кофе\`, \`1500 обед\`.
Можно в другой валюте: \`20 USD такси\`, или одной суммой: \`300\`.
*Доход* — с плюсом: \`+50000 зарплата\`.

Категорию выберешь один раз — дальше я её запомню.
Внизу меню: обзор месяца, записи за сегодня, доходы, регулярные траты (аренда, подписки) и «☰ Ещё».`,

  start_returning: '👋 С возвращением! Пиши трату сообщением — `250 кофе`. Меню — на клавиатуре внизу.',

  help_message: `❓ *Как пользоваться*

• \`250 кофе\` — трата. Категорию выберешь один раз, дальше запомню
• \`20 USD такси\` — трата в другой валюте, \`300\` — без описания
• \`+50000 зарплата\` — доход (\`+1000 USD\` — в другой валюте)
• Под новой записью: ↩️ отменить, 🏷 сменить категорию
• 📊 *Обзор месяца* — расходы, доход, остаток, категории; ◀️ — прошлые периоды
• 📅 *Сегодня* — записи за день; нажми номер, чтобы изменить или удалить запись
• 🔁 *Регулярные траты* — аренда и подписки записываются сами каждый месяц
• 🎯 *Бюджеты* и 📄 *Итоги* периода — кнопки под обзором месяца (премиум)
• Валюты, напоминания (до 3 раз в день) и начало периода — в ☰ Ещё → ⚙️ Настройки

Команды: /stats /history /income /recurring /export /settings /menu`,

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
  amount_label: 'Сумма',
  description_label: 'Описание',
  category_label: 'Категория',
  expense_added_title: 'Расход добавлен!',
  no_categories: 'Категории не найдены.',
  category_expenses: 'Траты по категории "{category}"',
  no_category_expenses: 'Нет трат по этой категории за последний месяц.',
  
  // Настройки
  settings_title: 'Настройки:',
  currency_select: 'Выбери валюту, которая будет использоваться по умолчанию:',
  currency_set: 'Валюта установлена: {currency}',
  currency_updated: 'Валюта успешно изменена на {currency}',
  button_change_period_start: '📅 Число начала периода',
  period_start_prompt: 'Введи число с которого каждый месяц будет начинаться новый период 👇🏼\n\nЭто число от 1 до 31. В месяцах короче берём последний день.',
  period_start_invalid: '❌ Некорректное число. Введи целое число от 1 до 31.',
  period_start_set: '✅ Число начала периода установлено: {day}',
  timezone_setup: `🕐 *Настройка часового пояса*

Сколько у тебя сейчас времени?

*Текущее время по UTC:* {utcTime}

Выбери своё текущее время:`,
  timezone_set: '✅ Часовой пояс установлен: {timezone}',
  
  // Семейный бюджет
  family_label: '🏠 *Семья:*',
  family_owner_label: '👑 *Владелец:*',
  family_info: '👨‍👩‍👧‍👦 *Семейный бюджет*\n\nЗдесь ты можешь управлять расходами вместе с близкими, коллегами, друзьями и т.д.\n\n- \uD83D\uDC6A Создаётся общая группа для учёта совместных трат.\n- \u2795 Каждый участник может добавлять расходы.\n- \uD83D\uDDD1\uFE0F Можно удалять свои расходы при необходимости.\n- \uD83D\uDCCA Доступна общая статистика по всем участникам.\n- \uD83D\uDCE4 Экспорт данных всей группы в один файл.\n\nСовместный контроль — меньше хаоса и больше прозрачности.',
  family_created: '✅ Семья "{name}" создана! Теперь ты можешь приглашать участников.',
  family_joined: '✅ Ты присоединился к семье "{name}"!',
  family_left: '✅ Ты покинул семью "{name}".',
  family_deleted: '✅ Семья "{name}" удалена. Все семейные траты стали личными.',
  family_member_removed: '✅ Участник удален из семьи.',
  family_member_removed_notification: '❌ Тебя удалили из семьи «{familyName}».',
  family_cannot_leave_owner: '❌ Владелец семьи не может покинуть семью. Используй "Удалить семью".',
  
  // Кнопки семейного меню
  create_family: '🏠 Создать семью',
  join_family: '🔗 Присоединиться к семье',
  invite_member: '➕ Пригласить участника',
  leave_family: '🚪 Покинуть семью',
  delete_family: '🗑️ Удалить семью',
  family_members: '👥 Участники семьи',
  family_stats: '💰 Расходы за месяц',
  family_add_expense: '💰 Добавить семейную трату',
  family_menu: '👨‍👩‍👧‍👦 Меню семьи',
  family_cancel: '❌ Отмена',
  
  // Приглашения
  invitation_sent: '✅ Приглашение отправлено пользователю @{username}',
  invitation_already_processed: '❌ Приглашение уже обработано.',
  
  // Сообщения для ввода
  enter_family_name: 'Введи название семьи (3-50 символов):',
  enter_invite_username: 'Введи username пользователя (без @):',
  enter_expense_amount: 'Введи сумму и описание семейной траты:',
  
  // Ошибки
  family_name_too_short: '❌ Название семьи должно содержать минимум 3 символа.',
  family_name_too_long: '❌ Название семьи не должно превышать 50 символов.',
  user_not_found: '❌ Пользователь не найден.',
  user_already_in_family: '❌ Пользователь уже состоит в семье.',
  user_already_has_invitation: '❌ У пользователя уже есть активное приглашение.',
  user_already_in_other_family: '❌ Пользователь уже состоит в другой семье.',
  user_already_in_your_family: '❌ Пользователь уже является членом твоей семьи.',
  user_not_premium: '❌ Пользователь не имеет премиум-статуса.',
  only_owner_can_invite: '❌ Только владелец семьи может приглашать участников.',
  active_invitations: '📋 Активные приглашения',
  no_active_invitations: '📋 У тебя нет активных приглашений.',
  active_invitations_list: '📋 Активные приглашения:',
  cancel_invitation: '❌ Отменить приглашение',
  invitation_cancelled: '✅ Приглашение отменено.',
  invitation_not_found: '❌ Приглашение не найдено.',
  not_authorized: '❌ У тебя нет прав для выполнения этого действия.',
  invitation_code: '🔑 Код приглашения: `{code}`',
  family_invitation_received: '🎉 Тебя приглашают в семью «{familyName}»\n\n👤 Пригласил: {inviterName}\n🔑 Код: `{inviteCode}`\n\nВыбери действие:',
  accept_invitation: '✅ Принять',
  reject_invitation: '❌ Отклонить',
  invitation_accepted: '🎉 Поздравляем! Ты присоединился к семье «{familyName}»',
  invitation_rejected: '❌ Ты отклонил приглашение в семью',
  invitation_not_pending: '❌ Приглашение не в ожидании',
  invitation_expired: '❌ Приглашение истекло',
  invitation_cancelled_notification: '❌ Приглашение в семью «{familyName}» было отменено пользователем {cancelledBy}',
  enter_invite_code: '🔑 Введи код приглашения:',
  only_owner_can_remove: '❌ Только владелец семьи может удалять участников.',
  only_owner_can_delete: '❌ Только владелец семьи может удалить семью.',
  cannot_remove_owner: '❌ Нельзя удалить владельца семьи.',
  cannot_remove_yourself: '❌ Нельзя удалить самого себя.',
  family_not_found: '❌ Семья не найдена.',
  not_family_member: '❌ Ты не являешься участником семьи.',
  not_family_owner: '❌ Ты не являешься владельцем семьи.',
  
  // Подтверждения
  confirm_delete_family: '⚠️ *Удаление семьи*\n\nВсе участники будут удалены, а семейные траты станут личными.\n\nТы уверен?',
  
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
  confirm_remove_member: '⚠️ *Исключение участника*\n\nТы уверен, что хочешь исключить {name} из семьи?',
  member_removed: '✅ Участник {name} исключен из семьи.',
  member_removed_notification: '❌ Тебя исключил из семьи «{familyName}» владелец {ownerName}.',
  
  // Премиум функции
  premium_required: '❌ Эта функция доступна только для премиум пользователей.',
  upgrade_to_premium: '💎 Обновись до премиум для доступа к семейному бюджету!',
  
  timezone_updated: `✅ *Часовой пояс обновлен!*

🕐 Выбранное время: *{time}*
🌍 Рассчитанный часовой пояс: *{timezone}*

Теперь все твои расходы будут корректно отображаться в твоём местном времени.`,
  
  // Лимиты
  limits_title: '📊 *Информация о лимитах*',
  status_regular: '👤 Стандарт',
  status_premium: '💎 Премиум',
  status_label: '*Статус:* {status}',
  max_description_length: '<b>Макс. длина описания:</b> {length} символов',
  premium_benefits: `💎 <b>Преимущества премиума:</b>
• 🎯 Бюджеты на месяц и на категории с предупреждениями на 80% и при превышении
• 📄 Полные итоги периода: каждая категория к прошлому месяцу, бюджеты, средняя трата в день
• До 5 собственных категорий
• Семейный бюджет
• Изменение суммы и описания любой записи
• 160 символов в описании (вместо 80)

Записывать траты и доходы можно без ограничений и бесплатно.`,
  
  // Премиум подписка
  premium_subscription_title: '⭐️ Подписка',
  premium_status_header: '<b>Твой статус:</b>',
  premium_privileges: 'Привилегии: {status}',
  premium_limits_info: 'Здесь отображаются твои лимиты, например: количество категорий, трат, доступ к семейным возможностям, текущий период премиума или его отсутствие.',
  premium_menu_title: '<b>Меню:</b>',
  premium_tariff_button: '⭐️ Тариф',
  premium_why_paid_button: '👀 Почему сервис платный?',
  premium_donate_button: '🤝 Пожертвовать',
  premium_back_button: '⬅️ Назад',
  premium_tariffs_title: '⭐️ Тарифы (Telegram Stars)',
  per_month: 'в месяц',
  premium_payment_info: '💳 Оплата — через Telegram Stars, внутреннюю валюту Telegram. 🔁 Месячный тариф продлевается автоматически, отменить можно в Telegram: Настройки → Мои звёзды → Мои подписки. Тарифы на 3, 6 и 12 месяцев оплачиваются один раз.',
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
  premium_why_paid_text: 'Содержание сервера для этого бота обходится примерно в $200 в месяц — и это даже без учёта стремительно растущего числа пользователей. А я, как разработчик, ещё и кушать хочу чтобы были силы пилить тебе сервис :)',
  premium_payment_title: '💳 *Оплата премиум подписки*',
  premium_payment_description: 'Ты выбрал тариф: <b>{duration}</b>\nСтоимость: <b>{stars} ⭐️</b>\n\nНажми кнопку ниже для перехода к оплате через Telegram Stars.',
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

  payment_success: '🎉 *Оплата прошла успешно!*\n\nТвоя премиум подписка активирована. Теперь тебе доступны все расширенные возможности бота!',
  donation_success: '🙏 *Спасибо за поддержку проекта!*\n\nТвоё пожертвование поможет развивать бота и добавлять новые функции.',
  general_payment_success: '✅ *Платеж прошел успешно!*\n\nСпасибо за использование нашего бота.',
  premium_expires: '📅 Премиум подписка действительна до: <b>{date}</b>\n⏰ Осталось дней: <b>{days}</b>',

  // Donations
  donate_prompt_title: '🤝 Поддержать проект',
  donate_prompt_text: 'Введи число звезд (Telegram Stars), которое ты хочешь задонатить.\n\n(За раз можно отправить от 1 до 2500 звезд)\n\nМожешь добавить письмо до 500 символов — просто напиши его после числа на новой строке.',
  donate_invalid: '❌ Введи целое число от 1 до 2500. Письмо — до 500 символов.',
  donate_created: '✅ Заявка на донат создана: {stars} ⭐️. Сейчас пришлю ссылку на оплату.',
  donate_paid: '🙏 Спасибо за поддержку! Донат получен: {stars} ⭐️',
  
  // Ошибки валидации
  error_too_long_regular: '❌ Описание слишком длинное!\nМаксимум 80 символов для обычных пользователей.',
  error_too_long_premium: '❌ Описание слишком длинное!\nМаксимум 160 символов для премиум пользователей.',
  error_no_description: '❌ Нужно указать описание после суммы.',
  error_amount: '❌ Некорректная сумма. Введи число от 0.01 до 999999.',
  error_format: '❌ Не понял. Начни с суммы: `250 кофе`, `20 USD такси` или просто `300`.',
  error_forbidden_content: '❌ Недопустимое содержимое.',
  error_premium_required: '💎 Эта функция доступна только с премиумом.\n\nПремиум даёт:\n• Бюджеты с предупреждениями\n• Полные итоги периода\n• Собственные категории\n• Семейный бюджет\n• Изменение записей',
  error_generic: '❌ Произошла ошибка. Попробуй позже или напиши администратору.',
  
  // Кнопки
  button_menu: '📋 Меню',
  button_expenses_month: '💰 Траты за месяц',
  button_expenses_day: '💰 Траты за день',
  button_expenses_categories: '💰 Траты по категориям',
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
  not_owner: '❌ Ты не являешься автором этой траты',
  button_cancel: '❌ Отмена',
  button_back: '⬅️ Назад',
  button_change_currency: '💱 Сменить валюту',
  button_change_timezone: '🌍 Часовой пояс',
  button_change_language: '🌐 Язык',
  button_custom_categories: '🏷️ Кастомные категории',
  
  // Главное меню
  main_menu_title: '🏠 *Главное меню*\n\nВыбери действие:',
  
  // Языки
  language_select: '🌍 Выбери язык:',
  language_set: '✅ Язык изменен на русский',
  language_not_supported: '❌ Язык не поддерживается',
  language_change_error: '❌ Произошла ошибка при смене языка',
  timezone_error: '❌ Произошла ошибка при установке часового пояса',
  
  // Экспорт
  export_success: '📊 Данные экспортированы успешно!',
  export_error: 'Произошла ошибка при экспорте данных 😞',
  expense_save_error: 'Произошла ошибка при сохранении расхода 😞',
  keyboard_updated: '✅ Клавиатура обновлена на твой язык!',
  
  // Редактирование
  edit_canceled: 'Редактирование отменено.',
  edit_no_active: 'Нет активного редактирования.',
  edit_instructions: 'Введи новую сумму и/или описание для этой траты (например: 500 кофе).\n\nИли нажми кнопку ниже для отмены.',
  edit_empty: 'Введи новую сумму, описание или оба значения.',
  edit_amount_error: 'Некорректная сумма.',
  edit_too_long: 'Описание слишком длинное (максимум {max} символов).',
  edit_format_error: 'Ошибка формата.',
  
  // Callback ответы
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
  select_category: 'Выбери категорию:',
  
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
  custom_categories_info: 'Здесь ты можешь создать собственные категории расходов (только для премиум).',
  custom_categories_example: '💡 Пример: "🌍 Путешествия" или "🎮 Игры"',
  custom_categories_add: '➕ Добавить категорию',
  custom_categories_manage: '🗂️ Управление категориями',
  custom_categories_enter_name: 'Введи название новой категории (1-30 символов):',
  custom_categories_created: '✅ Категория создана: {name}',
  custom_categories_exists: '❌ Такая категория уже существует.',
  custom_categories_limit_reached: '❌ Достигнут лимит кастомных категорий: {max}',
  custom_categories_list_empty: 'У тебя нет кастомных категорий.',
  custom_categories_list_title: 'Твои кастомные категории:',
  custom_categories_delete: '🗑️ Удалить',
  custom_categories_deleted: '✅ Категория удалена.',
  custom_categories_premium_required: '💎 Эта функция доступна только премиум пользователям.',

  // Доходы
  button_income: '💵 Доходы',
  button_add_income: '➕ Добавить доход',
  button_income_currency: '💱 Валюта дохода',
  income_menu_title: '💵 *Доходы за текущий период*',
  income_menu_empty: 'Пока нет доходов за этот период.',
  income_currency_label: 'Валюта дохода по умолчанию: *{currency}*',
  income_hint: '💡 Быстрый способ: отправь сообщение с плюсом — `+50000 зарплата` или `+1000 USD фриланс`',
  income_enter_prompt: 'Введи сумму и описание дохода 👇\n\nНапример: `50000 зарплата`\nВалюта по умолчанию — *{currency}*. Другую можно указать кодом после суммы: `1000 USD фриланс`',
  income_added: '✅ Доход записан: *{amount}* — {description}',
  income_default_description: 'Доход',
  income_deleted: '✅ Доход удалён',
  income_not_found: '❌ Доход не найден',
  income_currency_select: 'Выбери валюту, в которой обычно получаешь доход. Траты при этом остаются в основной валюте:',
  income_currency_set: '✅ Валюта дохода: {currency}',
  income_total: '💵 Доход: *{amount}*',
  balance_label: '⚖️ Остаток (доход − расходы): *{amount}*',
  income_error_format: '❌ Не понял. Напиши сумму и (необязательно) описание: `50000 зарплата` или `1000 USD фриланс`',
  income_error_amount: '❌ Некорректная сумма. Введи число от 0.01 до {max}.',

  // Регулярные траты
  button_recurring: '🔁 Регулярные траты',
  button_add_recurring: '➕ Добавить регулярную трату',
  recurring_menu_title: '🔁 *Регулярные траты*',
  recurring_menu_info: 'Ежемесячные платежи (аренда, подписки, кредит) автоматически записываются в расходы в выбранное число месяца.',
  recurring_menu_empty: 'Пока нет регулярных трат.',
  recurring_item: '{icon} {description} — *{amount}*, каждое {day}-е число\n    Следующая запись: {next}',
  recurring_monthly_total: 'Итого в месяц: *{amount}*',
  recurring_enter_prompt: 'Введи сумму и описание регулярной траты 👇\n\nНапример: `50000 аренда`\nМожно указать валюту после суммы: `500 USD аренда`',
  recurring_day_prompt: 'Какого числа каждого месяца записывать эту трату? Введи число от 1 до 31.\n\nЕсли в месяце меньше дней — запишу в последний день месяца.',
  recurring_day_invalid: '❌ Введи целое число от 1 до 31.',
  recurring_select_category: 'Выбери категорию для регулярной траты:',
  recurring_added: '✅ Регулярная трата добавлена\n\n{description} — *{amount}*, каждое {day}-е число\nПервая запись: {next}',
  recurring_added_charged_now: '✅ Регулярная трата добавлена и уже записана за этот месяц\n\n{description} — *{amount}*, каждое {day}-е число\nСледующая запись: {next}',
  recurring_deleted: '✅ Регулярная трата удалена. Уже записанные траты остались в истории.',
  recurring_not_found: '❌ Регулярная трата не найдена',
  recurring_limit: '❌ Можно завести не более {max} регулярных трат',
  recurring_charged_notification: '🔁 Записал регулярную трату: {icon} {description} — *{amount}*',
  recurring_error_format: '❌ Не понял формат. Напиши сумму и описание: `50000 аренда` или `500 USD аренда`',
  recurring_error_amount: '❌ Некорректная сумма. Введи число от 0.01 до {max}.',

  // Главное меню и «Ещё»
  button_overview: '📊 Обзор месяца',
  button_today: '📅 Сегодня',
  button_more: '☰ Ещё',
  more_menu_title: '☰ *Ещё*',
  button_export: '📤 Экспорт CSV',
  keyboard_refreshed: '✅ Меню обновлено — теперь оно компактнее 👇',
  button_outdated: 'Эта кнопка устарела. Открой раздел заново через меню внизу.',

  // Обзор периода и списки записей
  overview_title: 'Обзор: {range}',
  overview_spent: '💸 Расходы: *{amount}* · записей: {count}',
  overview_upcoming: 'Впереди регулярные:',
  overview_income_hint: '💡 Доход записывай с плюсом: `+50000 зарплата`',
  button_prev_period: '◀️ Раньше',
  button_next_period: 'Позже ▶️',
  button_back_to_overview: '⬅️ К обзору',
  day_title_today: 'Сегодня, {date}',
  day_title_yesterday: 'Вчера, {date}',
  day_title: '{date}',
  day_entry_hint: 'Напиши трату сообщением: `250 кофе`',
  button_prev_day: '◀️ Предыдущий день',
  button_next_day: 'Следующий день ▶️',
  list_tap_number: 'Нажми номер, чтобы открыть запись.',
  family_today_title: 'Семья: записи за сегодня',

  // Карточка записи
  button_undo: '↩️ Отменить',
  button_delete_record: '🗑 Удалить',
  button_change_category: '🏷 Категория',
  button_edit_record: '✏️ Изменить',
  expense_family_label: 'в семейном бюджете',
  expense_recurring_label: 'записано автоматически (регулярная трата)',
  expense_category_remembered: '🏷 Категория выбрана по прошлой такой же записи — сменить можно кнопкой ниже.',
  category_will_be_remembered: '💡 Запомню выбор: в следующий раз такая запись сразу попадёт в эту категорию.',
  expense_category_changed: 'Категория: {category}',

  // Настройки
  settings_header: 'Настройки',
  settings_currency_line: '💱 Валюта: *{currency}* · доход: *{incomeCurrency}*',
  settings_timezone_line: '🌍 Часовой пояс: {timezone}',
  settings_language_line: '🌐 Язык: {language}',
  settings_period_line: '📅 Период начинается {day}-го числа',
  settings_reminders_on_line: '🔔 Напоминания: вкл ({hours})',
  settings_reminders_off_line: '🔔 Напоминания: выкл',
  button_currencies: '💱 Валюты',
  settings_currencies_text: '💱 *Валюты*\n\nОсновная — в ней считаются траты и все итоги: *{currency}*\nВалюта дохода по умолчанию: *{incomeCurrency}*\n\nЛюбую запись можно сделать в другой валюте, указав код после суммы: `20 USD такси`.',
  reminders_title: 'Напоминания',
  reminders_info: 'Если к выбранному часу ты ничего не записал — напомню. Не больше 3 раз в день.',
  button_reminders_on: '🟢 Включены — нажми, чтобы выключить',
  button_reminders_off: '⚫ Выключены — нажми, чтобы включить',

  // Семья без премиума
  family_teaser: '👨‍👩‍👧‍👦 *Семейный бюджет*\n\nОбщие траты с близкими в одном месте: каждый записывает сам, статистика и экспорт — общие.\n\nДоступно с премиумом.',
  button_premium: '⭐️ Премиум',

  // Подписка и окончание премиума
  subscription_active_info: '🔁 Месячная подписка оплачена до {date} и продлится автоматически. Отменить: Telegram → Настройки → Мои звёзды → Мои подписки.',
  subscription_renewed: '🔁 Подписка продлена. Премиум действует до {date}.',
  button_view_tariffs: '⭐️ Тарифы',
  premium_expiring_trial: '⏳ Пробный премиум закончится {date}.\n\nПосле этого перестанут работать бюджеты, полные итоги периода, свои категории, семейный бюджет и изменение записей. Всё записанное останется, учёт трат — бесплатный.',
  premium_expiring_paid: '⏳ Премиум закончится {date}. Продлить можно заранее — оставшиеся дни сохранятся.',
  premium_expired_trial: '🌙 Пробный премиум закончился. Учёт трат и доходов остаётся бесплатным, а бюджеты, полные итоги, свои категории, семья и изменение записей — с премиумом.',
  premium_expired_paid: '🌙 Премиум закончился. Спасибо, что поддерживаешь проект! Продлить можно в любой момент.',
  premium_winback: '👋 Неделю назад закончился премиум. Захочешь вернуть бюджеты, полные итоги, свои категории, семейный бюджет и изменение записей — тарифы по кнопке ниже.',
  start_reminders_note: '🔔 Если за день ничего не запишешь — напомню (до 3 раз в день). Часы или выключить: ☰ Ещё → ⚙️ Настройки → 🔔.',

  // Бюджеты
  button_budgets: '🎯 Бюджеты',
  budgets_title: 'Бюджеты',
  budgets_empty: 'Поставь лимит на весь месяц или на отдельную категорию — предупрежу, когда потрачено 80%, и если лимит превышен.',
  budgets_teaser: '🎯 *Бюджеты*\n\nЛимит на месяц или на категорию: прогресс виден в обзоре, а когда потрачено 80% или лимит превышен — придёт предупреждение.\n\nДоступно с премиумом.',
  button_budget_total: '➕ На весь месяц',
  button_budget_category: '➕ На категорию',
  button_budget_change: '✏️ Изменить сумму',
  budget_total_name: '🎯 Весь месяц',
  budget_left: 'осталось {amount}',
  budget_over: 'перерасход {amount}',
  budget_enter_prompt: 'Введи лимит на период для «{name}» 👇\n\nНапример: `10000` (в *{currency}*) или `150 USD`',
  budget_amount_invalid: '❌ Нужна только сумма: `10000` или `150 USD`.',
  budget_saved: '✅ Бюджет сохранён',
  budget_deleted: '✅ Бюджет удалён',
  budget_not_found: '❌ Бюджет не найден',
  budget_warning_80: '⚠️ {name}: потрачено {spent} из {limit} ({percent}%)',
  budget_warning_100: '🚨 {name}: бюджет превышен — {spent} из {limit} ({percent}%)',
  overview_budget_of: 'из бюджета {amount}',

  // Итоги периода
  button_report: '📄 Итоги',
  report_title: 'Итоги: {range}',
  report_vs_previous: 'К прошлому периоду: {change} (было {amount})',
  report_change_new: 'новое',
  report_change_same: 'без изменений',
  report_top_categories: 'Больше всего потрачено:',
  report_locked: '🔒 Полный разбор — каждая категория в сравнении с прошлым периодом, бюджеты, средняя трата в день и самая крупная трата — с премиумом.',
  report_categories_vs_previous: 'Категории (к прошлому периоду):',
  report_categories_gone: 'Без трат в этот раз: {list}',
  report_more_numbers: 'Ещё цифры:',
  report_per_day: '📅 В среднем в день: {amount}',
  report_largest: '🔝 Самая крупная трата: {amount} — {description} ({date})',
  overview_budget_limit: 'лимит {amount}',
  report_title_current: 'Итоги на сегодня: {range}',
  input_canceled: '✅ Отменил. Можно записывать траты как обычно.',
  no_active_state: 'Сейчас нечего отменять.',
  daily_summary_title: 'Сводка за день',
  daily_summary_info: 'Ежедневная сводка: вечером пришлю, сколько ты потратил за день и на что. Только в дни с тратами.',
  daily_summary_enabled: '✅ Ежедневная сводка включена',
  daily_summary_disabled: '⚫ Ежедневная сводка выключена',
  daily_summary_hour_info: 'Выбери час (по твоему времени) для ежедневной сводки:',
  daily_summary_hour_set: 'Час сводки сохранён',
  button_daily_summary_on: '🗓 Сводка: вкл',
  button_daily_summary_off: '🗓 Сводка: выкл',
  settings_daily_summary_on_line: '🗓 Сводка за день: в {time}',
  settings_daily_summary_off_line: '🗓 Сводка за день: выкл',
  export_title: '📤 Экспорт в CSV\n\nВыбери период для файла.',
  export_categories_all: '🗂 Категории: все',
  export_categories_selected: '🗂 Категории: {categories}',
  export_period_day: '📅 Сегодня',
  export_period_week: '📅 Последние 7 дней',
  export_period_current: '📅 Текущий период',
  export_period_previous: '📅 Прошлый период',
  export_period_all: '♾ За всё время',
  export_period_range: '🗓 Выбрать даты…',
  export_filter_categories: '🔽 Фильтр по категориям',
  export_select_categories: 'Выбери категории для экспорта:',
  export_select_all: '✅ Выбрать все',
  export_deselect_all: '❌ Снять все',
  export_done: '✅ Готово',
  export_no_categories: 'Выбери хотя бы одну категорию',
  export_enter_dates: '🗓 Введи диапазон дат:\n`01.03.2026 - 15.03.2026`\n\nили одну дату: `01.03.2026`',
  export_dates_invalid: '❌ Не получилось разобрать даты. Введи их так: `01.03.2026 - 15.03.2026` или одну дату `01.03.2026`.',
  export_dates_order: '❌ Дата начала позже даты окончания. Пример: `01.03.2026 - 15.03.2026`.',
  total_by_categories: 'Итого по категориям:'
}; 