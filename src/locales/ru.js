module.exports = {
  button_reminders: '🔔 Напоминать о себе',
  reminders_enabled: '🔔 Напоминания включены',
  reminders_disabled: 'Напоминалки выключены. Молчу как рыбка 🤐',
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
  security_error: '❌ *Ошибка безопасности*\n\nПопробуй позже или напиши администратору.',
  
  // Admin panel
  button_admin: '👑 Админка',
  admin_access_denied: '❌ У тебя нет прав администратора.',
  admin_panel_title: '👑 *Панель администратора*\n\nВыбери действие:',
  admin_error: '❌ Произошла ошибка при выполнении администраторского действия.',
  
  // Admin stats
  admin_stats_text: `📊 *Статистика бота*

👥 *Пользователи:*
• Всего: {totalUsers}
• Премиум: {activePremium}
• Новых за неделю: {newUsersWeek}
• Новых за месяц: {newUsersMonth}

💰 *Расходы:*
• Всего записей: {totalExpenses}
• За неделю: {expensesWeek}
• Активных пользователей: {activeUsers}

🐛 *Баг-репорты:* {totalBugReports}

💎 *Донаты:*
• Всего: {totalDonations}
• Звезд собрано: {totalStars}

⭐ *Премиум транзакции:* {premiumTransactions}`,

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

📊 *Общая статистика:*
• Всего донатов: {totalDonations}
• Завершенных: {completedDonations}
• В ожидании: {pendingDonations}

⭐ *Звезды:*
• Всего собрано: {totalStars}
• Средний донат: {avgStars} звезд`,

  // Admin premium 
  admin_premium_stats: `⭐ *Статистика премиума*

📊 *Пользователи:*
• Всего премиум: {totalPremiumUsers}
• Активных сейчас: {activePremiumUsers}

💳 *Транзакции:*
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

📊 *Статистика:*
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
  admin_broadcast_confirm: '📢 Подтверди отправку массового уведомления\n\n📝 Текст сообщения:\n{message}\n\n📏 Длина: {length} символов\n\n⚠️ Это сообщение будет отправлено ВСЕМ пользователям бота!',
  admin_broadcast_started: '📢 Рассылка начата...',
  admin_broadcast_result: '📢 *Рассылка завершена!*\n\n📊 *Статистика:*\n• Всего пользователей: {total}\n• Успешно отправлено: {sent}\n• Ошибок: {failed}',
  admin_broadcast_header: '🔴🔴🔴 Уведомление! 🔴🔴🔴',
  
  // Общие сообщения
  error: 'Произошла ошибка 😞',
  not_found: 'Не найдено',
  cancel: 'Отмена',
  back: 'Назад',
  confirm: 'Подтвердить',
  
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
  
  // Настройки
  currency_select: 'Выбери валюту, которая будет использоваться по умолчанию:',
  currency_set: 'Валюта установлена: {currency}',
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
  family_left: '✅ Ты покинул семью "{name}". Твои траты в этой семье стали личными.',
  family_deleted: '✅ Семья "{name}" удалена. Все семейные траты стали личными.',
  family_member_removed_notification: '❌ Тебя удалили из семьи «{familyName}». Твои траты в этой семье стали личными.',
  
  // Кнопки семейного меню
  create_family: '🏠 Создать семью',
  join_family: '🔗 Присоединиться к семье',
  invite_member: '➕ Пригласить участника',
  leave_family: '🚪 Покинуть семью',
  delete_family: '🗑️ Удалить семью',
  family_members: '👥 Участники семьи',
  family_stats: '💰 Расходы за месяц',
  family_add_expense: '💰 Добавить семейную трату',
  button_personal_expense: '👤 Личная трата',
  enter_personal_expense: 'Введи сумму и описание личной траты:',
  family_mode_button_on: '🟢 Все траты в семью — нажми, чтобы выключить',
  family_mode_button_off: '⚪ Все траты в семью — нажми, чтобы включить',
  family_mode_line_on: '🟢 Новые траты записываются в семью',
  family_mode_line_off: '⚪ Новые траты — личные',
  family_mode_enabled: '✅ Теперь все новые траты записываются в семью.\n\nЛичную — кнопкой «{personalButton}» внизу или «{removeButton}» в карточке записи.',
  family_mode_disabled: '✅ Новые траты снова личные.\n\nСемейную — кнопкой «{familyButton}» внизу или «{addButton}» в карточке записи.',
  family_menu: '👨‍👩‍👧‍👦 Меню семьи',
  family_cancel: '❌ Отмена',
  
  // Приглашения
  invitation_sent: '✅ Приглашение отправлено пользователю @{username}',
  
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
  not_family_member: '❌ Ты не являешься участником семьи.',
  not_family_owner: '❌ Ты не являешься владельцем семьи.',
  
  // Подтверждения
  confirm_delete_family: '⚠️ *Удаление семьи*\n\nВсе участники будут удалены, а семейные траты станут личными.\n\nТы уверен?',
  
  // Статистика семьи
  family_daily_stats: '💰 Расходы за день',
  family_export: '📊 Экспорт семьи',
  
  // Список участников
  family_members_title: '👥 *Участники семьи*',
  family_owner_role: 'владелец',
  family_member_role: 'участник',
  remove_member: '❌ Исключить',
  confirm_remove_member: '⚠️ *Исключение участника*\n\nТы уверен, что хочешь исключить {name} из семьи? Его траты в семье станут его личными, и семья их больше не увидит.',
  member_removed: '✅ Участник {name} исключен из семьи.',
  
  // Премиум функции
  premium_required: '❌ Эта функция доступна только для премиум пользователей.',
  
  timezone_updated: `✅ *Часовой пояс обновлен!*

🕐 Выбранное время: *{time}*
🌍 Рассчитанный часовой пояс: *{timezone}*

Теперь все твои расходы будут корректно отображаться в твоём местном времени.`,
  
  // Лимиты
  status_regular: '👤 Стандарт',
  status_premium: '💎 Премиум',
  max_description_length: '<b>Макс. длина описания:</b> {length} символов',
  premium_benefits: '💎 <b>Преимущества премиума:</b>\n• 🎯 Бюджеты на месяц и на категории с предупреждениями на 80% и при превышении\n• 📄 Полные итоги периода: каждая категория к прошлому месяцу, бюджеты, средняя трата в день\n• До 5 собственных категорий\n• Семейный бюджет\n• До 10 целей накоплений (без премиума — 1)\n• 160 символов в описании (вместо 80)\n\nЗаписывать траты и доходы можно без ограничений и бесплатно.',
  
  // Премиум подписка
  premium_subscription_title: '⭐️ Подписка',
  premium_status_header: '<b>Твой статус:</b>',
  premium_privileges: 'Привилегии: {status}',
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
  premium_why_paid_text: 'Содержание сервера для этого бота обходится примерно в $200 в месяц — и это даже без учёта стремительно растущего числа пользователей. А я, как разработчик, ещё и кушать хочу чтобы были силы пилить тебе сервис :)',
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
  
  // Ошибки валидации
  error_too_long_regular: '❌ Описание слишком длинное!\nМаксимум 80 символов для обычных пользователей.',
  error_too_long_premium: '❌ Описание слишком длинное!\nМаксимум 160 символов для премиум пользователей.',
  error_amount: '❌ Некорректная сумма. Введи число от 0.01 до {max}.',
  error_format: '❌ Не понял. Начни с суммы: `250 кофе`, `20 USD такси` или просто `300`.',
  error_generic: '❌ Произошла ошибка. Попробуй позже или напиши администратору.',
  
  // Кнопки
  button_menu: '📋 Меню',
  button_expenses_month: '💰 Траты за месяц',
  button_expenses_day: '💰 Траты за день',
  button_expenses_categories: '💰 Траты по категориям',
  button_family: '👨‍👩‍👧‍👦 Семья',
  button_settings: '⚙️ Настройки',
  button_delete_last: '🗑️ Удалить последнюю запись',
  button_help: '❓ Справка',
  button_edit: 'Редактировать',
  button_mark_as_family: '👨‍👩‍👧‍👦 В семью',
  button_remove_from_family: '🚫 Из семейного бюджета',
  expense_already_family: '❌ Эта трата уже семейная',
  expense_converted_to_family: '✅ Трата перенесена в семейный бюджет',
  expense_removed_from_family: '✅ Трата убрана из семейного бюджета',
  button_cancel: '❌ Отмена',
  button_back: '⬅️ Назад',
  button_change_currency: '💱 Сменить валюту',
  button_change_timezone: '🌍 Часовой пояс',
  button_change_language: '🌐 Язык',
  button_custom_categories: '🏷️ Кастомные категории',
  
  // Главное меню
  
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
  callback_data_not_found: '❌ Ошибка: данные не найдены',
  callback_expense_added: '✅ Добавлено в категорию "{category}"',
  callback_canceled: '❌ Отменено',
  callback_expense_canceled: '❌ Добавление расхода отменено',
  callback_deleted: 'Запись удалена!',
  callback_delete_error: 'Ошибка удаления или запись не найдена',
  
  // Статистика
  by_categories: 'По категориям:',
  select_category: 'Выбери категорию:',
  
  // Форматирование
  
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
  income_edit_prompt: '✏️ Сейчас: {current}\n\nПришли новую сумму и/или описание 👇\nНапример: `60000 зарплата`, только сумму `60000` или только описание `аванс`.\nВалюту можно сменить кодом после суммы: `1000 USD`',
  income_updated: '✅ Доход обновлён',
  button_savings: '🏦 Накопления',
  command_savings: 'Накопления и цели',
  savings_title: '🏦 *Накопления*',
  savings_intro: 'Веди накопления, цели и долги — посчитаю, сколько будет через год и когда достигнешь цели.\n\nНачни с общей суммы или заведи счёт: наличные, вклад, крипта 👇',
  savings_general: 'Общие накопления',
  savings_general_short: 'Общие',
  savings_monthly_manual: '📥 Откладываешь {amount}/мес (вручную)',
  savings_monthly_unknown: '📥 Сколько откладываешь в месяц — пока не знаю',
  savings_monthly_negative: '📉 Траты больше доходов на ~{amount}/мес — накопления не растут',
  savings_monthly_auto: '📥 Откладываешь ~{amount}/мес — доходы минус траты за {n} мес.',
  savings_button_set_current: '✏️ Указать сумму накоплений',
  savings_button_forecast: '📈 Прогноз',
  savings_button_settings: '⚙️ Настройки',
  savings_button_back: '⬅️ Накопления',
  savings_not_found: '❌ Не нашёл эту копилку — возможно, её уже удалили.',
  savings_recent_operations: 'Последние изменения:',
  savings_button_deposit: '➕ Пополнить',
  savings_button_withdraw: '➖ Снять',
  savings_button_transfer: '🔄 Перевести',
  savings_button_goal_target: '🎯 Сумма цели',
  savings_button_goal_date: '📅 Срок',
  savings_button_mode_own: '🔀 Режим: своя копилка',
  savings_button_mode_total: '🔀 Режим: от всех накоплений',
  savings_button_goal_delete: '🗑 Удалить цель',
  savings_mode_own_line: '🐷 Своя копилка',
  savings_mode_total_line: '🏦 Считается от всех накоплений',
  savings_goal_progress: 'Накоплено: *{current}* из {target}',
  savings_goal_left: 'осталось {amount}',
  savings_goal_deadline: '📅 Срок: {date} · {left}',
  savings_deadline_left: 'осталось {duration}',
  savings_deadline_soon: 'меньше месяца',
  savings_deadline_passed: 'срок прошёл',
  savings_goal_achieved: '🎉 Цель достигнута!',
  savings_goal_unreachable: '📥 При {amount}/мес цель не достигается',
  savings_goal_eta: '📥 При {amount}/мес — через ≈ {duration} ({date})',
  savings_goal_eta_real: '🔥 С инфляцией — через ≈ {duration}',
  savings_goal_eta_real_never: '🔥 С инфляцией не успеть: цены растут быстрее взноса',
  savings_goal_own_assumption: '_Считаю, будто весь взнос идёт сюда._',
  savings_goal_required: '🎯 К сроку нужно {amount}/мес',
  savings_goal_required_real: '(с инфляцией {amount})',
  savings_prompt_deposit: 'Сколько добавить в «{name}»? Сейчас там {amount}.\n\nНапример: `10000` или `100 USD` — пересчитаю в валюту копилки.',
  savings_prompt_withdraw: 'Сколько снять из «{name}»? Сейчас там {amount}.',
  savings_prompt_set: 'Сколько сейчас в «{name}»? Например `350000`.\n\nСейчас записано: {amount}.',
  savings_transfer_choose: 'Куда перевести из «{name}»? Доступно {amount}.',
  savings_prompt_transfer: 'Сколько перевести из «{from}» в «{to}»? Доступно {amount}.',
  savings_prompt_goal: '🎯 Сколько и на что копишь? Например: `1 500 000 машина` или `3000 USD отпуск`. Валюта по умолчанию — *{currency}*.',
  savings_goal_limit_regular: '🎯 В бесплатной версии можно вести {limit} цель. С премиумом — до 10 целей одновременно.',
  savings_goal_limit_premium: '🎯 Уже {limit} целей — это максимум. Удали одну из целей, чтобы добавить новую.',
  savings_prompt_goal_target: 'Новая сумма для «{name}» (сейчас {amount}). Можно сразу с новым названием: `2 000 000 новая машина`.',
  savings_prompt_goal_date: 'К какому сроку накопить на «{name}»? Напиши месяц и год `12.2027` или дату `31.12.2027`.',
  savings_button_no_deadline: '♾ Без срока',
  savings_deadline_removed: '✅ Срок убран',
  savings_mode_set_own: '✅ Теперь у цели своя копилка — пополняй её отдельно.',
  savings_mode_set_total: '✅ Теперь цель считается от всех накоплений.',
  savings_moved_to_general: '💰 {amount} перешли в общие накопления.',
  savings_button_account_name: '✏️ Название',
  savings_button_account_yield_default: '↩️ Как в настройках',
  savings_prompt_account: '💼 Как назвать счёт? Например: `Наличные`, `Вклад`, `Крипта`.\n\nМожно сразу с валютой и ставкой: `Вклад USD 4%`.',
  savings_prompt_account_yield: 'Ставка «{name}», % годовых: например `16` для вклада или `0` для наличных (до {max}).',
  savings_prompt_account_name: 'Новое название для «{name}»:',
  savings_account_delete_confirm: 'Удалить счёт «{name}»?',
  savings_account_deleted: '✅ Счёт «{name}» удалён.',
  savings_account_created: '✅ Счёт «{name}» создан.',
  savings_account_limit: '💼 Уже {limit} счетов — это максимум. Удали ненужный, чтобы добавить новый.',
  savings_error_account: '❌ Напиши название счёта, например `Наличные`.',
  savings_error_name: '❌ Название — от 1 до {max} символов.',
  savings_goal_delete_confirm: 'Удалить цель «{name}»?',
  savings_goal_delete_moves: 'Накопленные {amount} перейдут в общие накопления — деньги не пропадут.',
  savings_button_goal_delete_yes: '🗑 Да, удалить',
  savings_goal_deleted: '✅ Цель «{name}» удалена.',
  savings_forecast_title: '📈 *Прогноз накоплений*',
  savings_now: 'Сейчас: *{amount}*',
  savings_rates_not_set: '⚙️ Ставки не заданы — прогноз без процентов и инфляции',
  savings_rate_yield_short: 'ставка {value}%',
  savings_rate_inflation_short: 'инфляция {value}%',
  savings_rate_growth_short: 'рост взноса {value}% в год',
  savings_horizon_6: 'Через полгода',
  savings_horizon_12: 'Через год',
  savings_horizon_36: 'Через 3 года',
  savings_horizon_60: 'Через 5 лет',
  savings_horizon_120: 'Через 10 лет',
  savings_forecast_depleted: '⚠️ При таком темпе накопления закончатся через {duration}.',
  savings_forecast_legend: '💡 С процентами и ростом взноса из настроек; «сегодня» — в нынешних ценах.',
  savings_settings_title: '⚙️ *Настройки прогноза*',
  savings_settings_hint: '💡 Взнос — сколько откладываешь в месяц (авто: доходы − траты). Ставки — % годовых; своя ставка счёта — в его настройках.',
  savings_button_monthly_auto: '🔄 Считать автоматически',
  savings_monthly_auto_set: '✅ Взнос считается автоматически: доходы минус траты.',
  savings_prompt_monthly: 'Сколько откладываешь в месяц? Например: `30000` ({currency}).',
  savings_prompt_inflation: 'Инфляция в процентах в год, например `8` или `7,5` (до {max}). `0` — не учитывать.',
  savings_prompt_yield: 'Ставка по умолчанию — для счетов без своей ставки и новых взносов, % годовых, например `16` (до {max}). `0` — не учитывать.',
  savings_prompt_growth: 'На сколько процентов в год растёт твой взнос, например `5` (до {max}). `0` — не учитывать.',
  savings_monthly_set: '✅ Взнос: {amount}/мес',
  savings_setting_saved: '✅ Сохранено',
  savings_error_amount: '❌ Не понял сумму. Напиши число, например `15000`.',
  savings_error_insufficient: '❌ Столько нет: в копилке {amount}.',
  savings_error_rate: '❌ Нужно число от 0 до {max}, например `8` или `7,5`.',
  savings_error_date: '❌ Не понял срок. Напиши месяц и год `12.2027` или дату `31.12.2027` — в будущем.',
  savings_error_goal: '❌ Напиши сумму и название цели, например `1 500 000 машина`.',
  savings_deposited: '✅ Пополнено на {amount}',
  savings_withdrawn: '✅ Снято {amount}',
  savings_balance_set: '✅ Сумма обновлена: {amount}',
  savings_transferred: '✅ Переведено {amount} в «{name}»',
  savings_goal_created: '✅ Цель создана — прогресс считается от всех накоплений. Добавь срок кнопкой «📅 Срок».',
  savings_goal_updated: '✅ Цель обновлена',
  savings_deadline_set: '✅ Срок: {date}',
  savings_goal_achieved_notice: '🎉 Цель «{name}» достигнута!',
  savings_months: '{n} мес.',
  savings_years: '{y} г.',
  savings_years_months: '{y} г. {m} мес.',
  savings_compact_thousand: '{n} тыс',
  savings_compact_million: '{n} млн',
  savings_button_add_account: '➕ Добавить счёт',
  savings_header: '🏦 *Накопления — {amount}*',
  savings_header_debts: '💳 Долги — {debts} · капитал {net}',
  savings_section_accounts: 'Счета',
  savings_section_goals: 'Цели',
  savings_section_debts: 'Долги',
  savings_debt_until: 'до {date}',
  savings_main_year: '📈 Через год ≈ {amount} (откладываешь ~{monthly}/мес)',
  savings_main_year_negative: '📉 Через год ≈ {amount} (траты больше доходов на ~{monthly}/мес)',
  savings_button_set_monthly: '📥 Указать, сколько откладываю',
  savings_button_update: '🔄 Обновить остатки',
  savings_button_add: '➕ Добавить',
  savings_add_title: '➕ *Что добавить?*\n\n💼 *Счёт* — где лежат деньги: наличные, вклад, крипта\n🎯 *Цель* — на что копишь\n💳 *Долг* — кредит, ипотека, рассрочка, долг другу',
  savings_button_add_kind_account: '💼 Счёт',
  savings_button_add_kind_goal: '🎯 Цель',
  savings_button_add_kind_debt: '💳 Долг',
  savings_rate_default: 'Ставка как в настройках ({value}%)',
  savings_rate_none: 'Без процентов',
  savings_rate_own: '{value}% годовых',
  savings_updated: 'обновлено {date}',
  savings_button_new_amount: '✏️ Новая сумма',
  savings_button_configure: '⚙️ Настроить',
  savings_button_rate: '📈 Ставка',
  savings_button_delete: '🗑 Удалить',
  savings_button_back_to_account: '⬅️ К счёту',
  savings_button_back_to_goal: '⬅️ К цели',
  savings_button_back_to_debt: '⬅️ К долгу',
  savings_mode_hint: '«От всех накоплений» — прогресс по всем счетам сразу. «Своя копилка» — отдельная сумма, которую пополняешь сам.',
  savings_update_step: '{icon} {name} ({i}/{n}) — сейчас {amount}. Сколько теперь?',
  savings_update_step_debt: '{icon} {name} ({i}/{n}) — осталось вернуть {amount}. Сколько теперь?',
  savings_button_no_change: '✅ Без изменений',
  savings_button_stop: '⏹ Хватит',
  savings_update_stale: '⏳ Это уже неактуально',
  savings_update_done: 'Готово: накопления {before} → {after} ({delta})',
  savings_update_done_capital: 'Капитал: {before} → {after}',
  savings_prompt_account_currency: 'В какой валюте этот счёт?',
  savings_button_other_currency: '🌐 Другая',
  savings_error_currency: '❌ Выбери валюту кнопкой или напиши код, например `USD`.',
  savings_prompt_debt_name: '💳 Как назвать долг? Например: `Ипотека`, `Кредитка`, `Долг Пете`.\n\nМожно сразу одной строкой: `Ипотека 3 500 000 12%`.',
  savings_prompt_debt_amount: 'Сколько осталось вернуть по «{name}»? Например `300000` ({currency}) или `1200 USD`. Если есть проценты — добавь ставку: `300000 18%`.',
  savings_error_debt_amount: '❌ Не понял сумму. Например `300000` или `300000 18%`.',
  savings_debts_capital: 'долги {debts} · капитал {net}',
  savings_forecast_debts_only: 'долги {debts}',
  savings_forecast_today: 'сегодня ≈ {amount}',
  savings_button_monthly_value: '📥 Взнос: {amount}',
  savings_button_monthly_auto_value: '📥 Взнос: ~{amount} · авто',
  savings_button_monthly_unknown: '📥 Взнос: не знаю',
  savings_button_yield_value: '📈 Ставка по умолчанию: {value}',
  savings_button_inflation_value: '🔥 Инфляция: {value}',
  savings_button_growth_value: '⬆️ Рост взноса: {value}',
  savings_debt_rate: '📈 {value}% годовых',
  savings_debt_no_rate: '📈 Без процентов',
  savings_debt_payment: '💵 Платёж {amount}/мес',
  savings_debt_payment_not_set: '💵 Платёж не задан',
  savings_debt_payoff: '📅 Погасишь через {duration} ({date})',
  savings_debt_total_interest: '💸 Переплата по процентам: ~{amount}',
  savings_debt_too_long: '⚠️ С таким платежом долг гасится дольше 50 лет — попробуй платить больше.',
  savings_debt_below_interest: '⚠️ Платёж не покрывает проценты — долг не уменьшается. Чтобы его гасить, плати больше {amount} в месяц.',
  savings_debt_no_payment: '💡 Укажи платёж в месяц — посчитаю, когда закроешь долг.',
  savings_debt_no_payment_interest: '💡 Укажи платёж в месяц — посчитаю, когда закроешь долг и сколько уйдёт на проценты. Сейчас набегает ~{amount} процентов в месяц.',
  savings_debt_paid_off: '🎉 Долг погашен!',
  savings_button_debt_pay: '➖ Погасить',
  savings_button_debt_increase: '➕ Увеличить долг',
  savings_button_debt_payment: '💵 Платёж в месяц',
  savings_button_debt_delete: '🗑 Удалить долг',
  savings_button_debt_no_payment: '🚫 Без платежа',
  savings_button_skip: '⏭ Пропустить',
  savings_prompt_debt_payment: 'Сколько платишь по «{name}» в месяц? Например `25000` ({currency}). По платежу посчитаю, когда закроешь долг. `0` — без платежа.',
  savings_prompt_debt_pay: 'Сколько погасить по «{name}»? Осталось {amount}.\n\n_Трата при этом не записывается — платежи по долгам обычно уже есть в расходах._',
  savings_prompt_debt_increase: 'На сколько увеличить долг «{name}»? Сейчас {amount}.',
  savings_prompt_debt_set: 'Сколько осталось вернуть по «{name}»? Напиши точную сумму, `0` — долг погашен.\n\nСейчас записано: {amount}.',
  savings_prompt_debt_rate: 'Ставка по «{name}» в процентах годовых, например `12` или `29,9` (до {max}). `0` — без процентов.',
  savings_debt_created: '✅ Долг «{name}» добавлен.',
  savings_debt_limit: '💳 Уже {limit} долгов — это максимум. Удали погашенный, чтобы добавить новый.',
  savings_debt_error_overpay: '❌ Долг всего {amount} — больше погасить нельзя.',
  savings_debt_paid: '✅ Погашено {amount}',
  savings_debt_increased: '✅ Долг увеличен на {amount}',
  savings_debt_set: '✅ Сумма долга обновлена: {amount}',
  savings_debt_delete_confirm: 'Удалить долг «{name}»? Деньги никуда не переводятся — долг просто исчезнет из списка.',
  savings_debt_deleted: '✅ Долг «{name}» удалён.',
  savings_forecast_debts_note: '💳 Долги — по плановым платежам; сами платежи уже в тратах, поэтому взнос не уменьшают.',
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
  premium_expiring_trial: '⏳ Пробный премиум закончится {date}.\n\nПосле этого перестанут работать бюджеты, полные итоги периода, свои категории и семейный бюджет. Всё записанное останется, учёт трат — бесплатный.',
  premium_expiring_paid: '⏳ Премиум закончится {date}. Продлить можно заранее — оставшиеся дни сохранятся.',
  premium_expired_trial: '🌙 Пробный премиум закончился. Учёт трат и доходов остаётся бесплатным, а бюджеты, полные итоги, свои категории и семья — с премиумом.',
  premium_expired_paid: '🌙 Премиум закончился. Спасибо, что поддерживаешь проект! Продлить можно в любой момент.',
  premium_winback: '👋 Неделю назад закончился премиум. Захочешь вернуть бюджеты, полные итоги, свои категории и семейный бюджет — тарифы по кнопке ниже.',
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
  weekly_insight_info: 'Сводка недели: по понедельникам в 10:00 — сколько ты потратил за неделю по сравнению с обычным, какие категории выросли и какой темп в текущем периоде.',
  settings_weekly_insight_on_line: '📈 Сводка недели: по понедельникам в 10:00',
  settings_weekly_insight_off_line: '📈 Сводка недели: выкл',
  button_weekly_insight_on: '📈 Неделя: вкл',
  button_weekly_insight_off: '📈 Неделя: выкл',
  button_weekly_insight_now: '👀 Показать сейчас',
  button_weekly_insight_overview: '📊 Обзор',
  button_weekly_insight_disable: '🔕 Выключить сводку недели',
  weekly_insight_enabled: '✅ Сводка недели включена',
  weekly_insight_disabled: '⚫ Сводка недели выключена',
  weekly_insight_turned_off: '🔕 Сводка недели выключена. Включить снова: Настройки → Напоминания.',
  weekly_insight_no_data: 'За последние 5 недель трат нет — сводке пока не из чего считать.',
  weekly_insight_title: 'Неделя {range}',
  weekly_insight_spent: 'Потрачено за неделю: *{amount}*',
  weekly_insight_no_history: 'Истории пока мало — сравнение с обычными неделями появится через пару недель.',
  weekly_insight_same: '≈ Как обычно (в среднем {amount} в неделю за последние {weeks} недели)',
  weekly_insight_more: '↑ На {percent}% больше обычного: +{amount} к среднему за {weeks} недели',
  weekly_insight_less: '↓ На {percent}% меньше обычного: −{amount} к среднему за {weeks} недели',
  weekly_insight_overspend: '📈 Выросло сильнее всего: {category} (+{amount})',
  weekly_insight_improvement: '👍 Меньше обычного: {category} (−{amount})',
  weekly_insight_period: 'Период {range}',
  weekly_insight_period_spent: 'Потрачено: {amount} за {days} из {total} дн.',
  weekly_insight_projection: 'В таком темпе к концу периода: *≈{amount}*',
  weekly_insight_projection_vs: 'В таком темпе к концу периода: *≈{amount}* (прошлый — {previous}, {change})',
  weekly_insight_budget_ok: '🎯 Бюджет {limit}: укладываешься, запас ≈{amount}',
  weekly_insight_budget_over: '🚨 Бюджет {limit}: в таком темпе превысишь на ≈{amount}',
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
  total_by_categories: 'Итого по категориям:',

  // Профиль бота в Telegram (scripts/set-bot-profile.js): описание до /start, короткое описание, меню команд
  bot_short_description: 'Учёт трат в пару касаний: напиши «250 кофе». Доходы, бюджеты, итоги месяца, семейный бюджет.',
  bot_description: 'Учёт трат и доходов прямо в Telegram.\n\nНапиши «250 кофе» — трата записана, категория запомнится.\n\n• Обзор месяца по категориям и итоги периода\n• Доходы и остаток: «+50000 зарплата»\n• Регулярные траты: аренда и подписки записываются сами\n• Импорт выписок: Т-Банк, Сбер, Kaspi, CSV\n• Накопления, цели, долги и прогноз с инфляцией\n• Бюджеты с предупреждениями, сводки за день и неделю, напоминания\n• Семейный бюджет, разные валюты, экспорт в CSV\n\nОсновное — бесплатно. Новым пользователям — 14 дней премиума.',
  command_start: 'Главное меню',
  command_stats: 'Обзор месяца',
  command_history: 'Записи за сегодня',
  command_income: 'Доходы и остаток',
  command_recurring: 'Регулярные траты',
  command_export: 'Экспорт в CSV',
  button_import: '📥 Импорт выписки',
  command_import: 'Импорт банковской выписки',
  import_intro: '📥 *Импорт банковской выписки*\n\nПришли файл выписки в этот чат — я покажу, что нашёл, и ничего не запишу без твоего подтверждения.\n\n*Что подходит:*\n• *Т-Банк* — CSV. В веб-версии: «Операции» → выбери период → «Выгрузить» → CSV.\n• *Сбер* — PDF «Выписка по счёту карты»: СберБанк Онлайн → карта → «Выписки и справки».\n• *Kaspi Gold* — PDF-выписка: Kaspi.kz → Kaspi Gold → «Выписка».\n• *Любой CSV* со строкой заголовков: дата, сумма (или приход и расход), описание; валюта и категория — если есть.\n\nФайл до 20 МБ, до 5000 операций. Повторный импорт той же выписки ничего не задвоит, а операции, которые ты уже записал вручную, будут пропущены. Сам файл не сохраняется — только операции.',
  import_unsupported_file: '📎 Я умею импортировать банковские выписки в CSV и PDF (Т-Банк, Сбер, Kaspi Gold или любой CSV). Подробнее — /import',
  import_file_too_big: '❌ Файл больше 20 МБ. Выгрузи выписку за период покороче.',
  import_download_error: '❌ Не получилось скачать файл. Отправь его ещё раз.',
  import_pdf_error: '❌ Не получилось прочитать PDF. Если он защищён паролем или это скан — выгрузи выписку в CSV.',
  import_unknown_format: '❌ Не узнал формат выписки. Подходят CSV (Т-Банк или любой со строкой заголовков) и PDF-выписки Сбера и Kaspi Gold. Подробнее — /import',
  import_csv_columns: '❌ Не нашёл в CSV столбцы с датой и суммой. Нужна строка заголовков, например: `Дата;Сумма;Описание`.',
  import_empty: '🤷 В файле нет операций для импорта.',
  import_too_many: '❌ В файле больше {max} операций. Выгрузи выписку за период покороче.',
  import_source_tbank: 'Т-Банк',
  import_source_sber: 'Сбер',
  import_source_kaspi: 'Kaspi Gold',
  import_source_csv: 'CSV',
  import_preview_title: '📥 *Выписка: {source}*',
  import_preview_expenses: '💸 Траты: {count} · {total}',
  import_preview_incomes: '💰 Доходы: {count} · {total}',
  import_preview_top: '*Топ категорий:*',
  import_preview_transfers: '🔁 Переводы, пополнения и снятия: {count} (списания {out}, поступления {in})',
  import_preview_transfers_ask: 'Учесть их как траты и доходы? Переводы между своими счетами лучше пропустить.',
  import_preview_transfers_on: '✅ Переводы будут учтены.',
  import_preview_transfers_off: '🚫 Переводы будут пропущены.',
  import_preview_skipped: '*Пропущу:*',
  import_skip_duplicates: '• уже импортированы: {count}',
  import_skip_manual: '• уже записаны вручную: {count}',
  import_skip_transfers: '• переводы: {count}',
  import_skip_failed: '• неуспешные операции: {count}',
  import_skip_currency: '• в неподдерживаемой валюте: {count}',
  import_skip_invalid: '• нераспознанные строки: {count}',
  import_preview_footer: 'Пока ничего не записано.',
  import_nothing_new: '✅ Новых операций нет — всё из этой выписки уже записано.',
  button_import_transfers_on: '✅ Учесть переводы ({count})',
  button_import_transfers_off: '🚫 Пропустить переводы',
  button_import_confirm: '✅ Импортировать',
  import_canceled: 'Импорт отменён, ничего не записано.',
  import_outdated: '⌛ Эта выписка устарела. Пришли файл снова.',
  import_done_title: '✅ *Импорт завершён*',
  import_done_expenses: '💸 Добавлено трат: {count}',
  import_done_incomes: '💰 Добавлено доходов: {count}',
  import_done_skipped: '*Пропущено:*',
  button_import_undo: '↩️ Отменить импорт',
  import_undone: '↩️ Импорт отменён: удалено трат — {expenses}, доходов — {incomes}.',
  import_undo_missing: 'Этот импорт уже отменён.',
  import_error: '❌ Не получилось записать операции — ничего не сохранено. Попробуй ещё раз.',
  receipt_recognizing: '🔍 Распознаю чек…',
  receipt_not_configured: '🧾 Распознавание чеков пока не настроено. Записывай траты сообщением: `250 кофе`.',
  receipt_limit_regular: '🧾 Лимит распознавания чеков на этот месяц исчерпан: {used} из {limit}. С премиумом — до {premium} чеков в месяц. Траты можно записывать сообщением: `250 кофе`.',
  receipt_limit_premium: '🧾 Лимит распознавания чеков на этот месяц исчерпан: {used} из {limit}. В следующем месяце лимит обновится, а пока траты можно записывать сообщением: `250 кофе`.',
  receipt_send_as_photo: '🖼 Этот файл не получится распознать. Пришли чек как фото, а не файлом — Telegram сам его сожмёт.',
  receipt_unreadable: '😕 Не получилось распознать чек. Сфотографируй его ровнее, целиком и при хорошем свете.',
  receipt_not_receipt: '🤔 Кажется, на фото не чек. Пришли фото кассового чека — я запишу каждую позицию.',
  receipt_currency_unsupported: '💱 Чек в валюте {currency} — её бот пока не поддерживает. Запиши трату сообщением.',
  receipt_error_quota: '⏳ Лимит распознаваний у сервиса на сегодня исчерпан, попробуй позже. Этот чек не засчитан в твой лимит.',
  receipt_error_unavailable: '⚠️ Сервис распознавания сейчас недоступен, попробуй позже. Этот чек не засчитан в твой лимит.',
  receipt_title_default: 'Чек',
  receipt_items_count: 'позиций: {count}',
  receipt_total_mismatch: '⚠️ Сверь суммы: в чеке {printed}, по позициям {items}.',
  receipt_family_note: '👨‍👩‍👧‍👦 Записано в семейный бюджет.',
  receipt_all_deleted: 'Все позиции этого чека удалены.',
  receipt_tap_number: '✅ Каждая позиция записана отдельной тратой. Нажми номер, чтобы изменить сумму, категорию или удалить.',
  button_receipt_ok: '✅ Всё верно',
  button_receipt_undo: '↩️ Отменить чек',
  receipt_confirmed: '✅ Чек записан.',
  receipt_undo_confirm: 'Отменить чек? Удалю траты: {count} на {total}.',
  button_receipt_undo_confirm: '🗑 Да, отменить',
  receipt_undone: '↩️ Чек отменён: удалено трат — {count}.',
  receipt_already_undone: 'Этот чек уже отменён.',
  receipt_not_found: 'Чек не найден.',
  help_receipt: '🧾 Пришли фото чека — запишу каждую позицию отдельной тратой с категорией.',
  import_receipt_hint: '🧾 Чек из магазина можно просто сфотографировать и прислать сюда — запишу каждую позицию.',
  receipt_busy: '⏳ Подожди, ещё распознаю прошлый чек.',
  receipt_queued: '🔍 Распознаю чек… Ты в очереди: {position}.',
  receipt_recognizing_slow: '🔍 Распознаю чек… Это может занять 1–2 минуты.',
  receipt_low_confidence: '⚠️ Не уверен в цифрах: позиции не сходятся с итогом ({total}) или с ценами. Проверь список и запиши как есть — или пришли более чёткое фото.',
  button_receipt_record_draft: '✅ Записать как есть',
  receipt_draft_canceled: 'Чек не записан.',
  receipt_draft_outdated: '⌛ Этот черновик устарел. Пришли фото чека снова.',
  receipt_retrying: '🔄 Поворачиваю и пробую ещё раз…',
  receipt_photo_tips: '📸 Положи чек ровно, сними ближе, чтобы он занял весь кадр. Мелкий или длинный чек лучше отправить файлом — так он придёт в полном качестве.',
  receipt_small_photo_tip: '🔎 Чек на фото мелкий, а Telegram сжимает фото. Пришли его файлом (📎 → Файл) — так он придёт в полном разрешении.',
  button_receipt_rotate: '🔄 Повернуть на 90° и попробовать',
  receipt_rotate_outdated: '⌛ Это фото уже недоступно. Пришли его ещё раз.',
  receipt_heic_unsupported: '🖼 Формат HEIC я не читаю. Пришли чек как фото или файлом JPEG.',
  receipt_file_too_big: '🖼 Файл больше 20 МБ. Пришли чек как фото или файл поменьше.',
  command_family: 'Семейный бюджет',
  command_settings: 'Настройки',
  command_limits: 'Подписка и премиум',
  command_help: 'Справка',
  command_cancel: 'Отменить ввод',
  command_paysupport: 'Поддержка по оплатам',
  command_terms: 'Условия использования',
  command_privacy: 'Политика конфиденциальности',
  payment_outdated: '⚠️ Этот счёт устарел: цена изменилась. Открой тарифы заново — /limits',
  security_validation_error: '⚠️ Не получилось обработать запрос. Попробуй ещё раз или открой меню командой /start.',
  expense_draft_outdated: '⌛ Этот черновик устарел. Отправь трату ещё раз.',
  family_invitation_hours_left: '⏰ Осталось: {hours} ч.',
  family_no_members: 'Нет участников',
  family_already_member: '❌ Ты уже состоишь в семье.',
  admin_bug_reports_all_title: '📝 Все баг-репорты (последние {count})',
  admin_bug_reports_new_title: '🆕 Новые баг-репорты (последние {count})',
  admin_bug_reports_empty: 'Репортов нет.',
  payment_subscription_already_active: '🔁 Месячная подписка у тебя уже действует — вторую оформлять не нужно. Продлить премиум заранее можно разовым тарифом: /limits',
  payment_foreign_payer: '⚠️ Эта ссылка на оплату создана для другого пользователя. Открой тарифы в боте сам — /limits',
  premium_expired_granted: '🌙 Премиум закончился. Учёт трат и доходов остаётся бесплатным, а бюджеты, полные итоги, свои категории и семья — с премиумом. Продлить можно в любой момент.',
}; 