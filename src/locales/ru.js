module.exports = {
  // Общие сообщения
  welcome: 'Привет, {name}! 👋',
  error: 'Произошла ошибка 😞',
  unknown_error: 'Произошла неожиданная ошибка. Попробуйте позже.',
  not_found: 'Не найдено',
  cancel: 'Отмена',
  back: 'Назад',
  confirm: 'Подтвердить',
  save: 'Сохранить',
  
  // Команды
  start_message: `Я помогу тебе вести учёт расходов.

*Как добавить расход:*
Просто напиши сумму и описание через пробел:
-  \`200 продукты в магазине\`
-  \`1500 обед в ресторане\`
-  \`50 проезд\`

После ввода появится меню с кнопками категорий - выбери подходящую! 🏷️

*Команды:*
/start - перезапустить бота
/menu - открыть интерактивное меню(Рекомендуется)
/history - последние записи за день
/stats - подробная статистика
/export - скачать данные (CSV)
/undo - отменить последнюю запись
/categories - список категорий
/currency - установить базовую валюту
/settings - открыть настройки
/help - показать справку

Начни вводить свои расходы! 💰`,

  help_message: `📋 *Справка по командам*

*Добавление расходов:*
Напиши сумму и описание:
\`200 продукты\` - появится меню с кнопками категорий

*Команды:*
/start - перезапустить бота
/menu - открыть интерактивное меню(Рекомендуется)
/history - последние записи за день
/stats - подробная статистика
/export - скачать данные (CSV)
/undo - отменить последнюю запись
/categories - список категорий
/currency - установить базовую валюту
/settings - открыть настройки
/help - эта справка

*Советы:*
-  Можно использовать запятую: \`150,50 кофе\`
-  После ввода выбери категорию из кнопок
-  Описание помогает помнить на что тратил
-  Используй /stats чтобы анализировать траты

Удачного учёта! 💰`,

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
  timezone_setup: `🕐 *Настройка часового пояса*

Сколько у вас сейчас времени?

*Текущее время по UTC:* {utcTime}

Выберите ваше текущее время:`,
  timezone_set: '✅ Часовой пояс установлен: {timezone}',
  
  // Семейный бюджет
  button_family: '👨‍👩‍👧‍👦 Семья',
  family_info: '👨‍👩‍👧‍👦 *Семейный бюджет*\n\nЗдесь вы можете управлять семейными расходами вместе с близкими.',
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
  limits_title: '📊 *Информация о лимитах*',
  status_regular: '👤 Стандарт',
  status_premium: '💎 Премиум',
  status_label: '*Статус:* {status}',
  records_usage: '*Записей:* {current}/{max} ({percentage}%)',
  records_remaining: '*Осталось:* {remaining} записей',
  max_description_length: '*Макс. длина описания:* {length} символов',
  near_limit_warning: '⚠️ *Внимание:* Вы близки к лимиту записей!',
  limit_reached: '❌ *Достигнут лимит записей!*',
  premium_benefits: `💎 *Преимущества премиума:*
• 160 символов в описании (вместо 80)
• 300 записей (вместо 100)
• Кастомные категории
• Расширенная статистика`,
  
  // Премиум подписка
  premium_subscription_title: '⭐️ Подписка',
  premium_status_header: '**Ваш статус:**',
  premium_privileges: 'Привилегии: {status}',
  premium_limits_info: 'Здесь отображаются ваши лимиты, например: количество категорий, трат, доступ к семейным возможностям, текущий период премиума или его отсутствие.',
  premium_menu_title: '**Меню:**',
  premium_tariff_button: '⭐️ Тариф',
  premium_why_paid_button: '👀 Почему сервис платный?',
  premium_back_button: '⬅️ Назад',
  premium_tariffs_title: '⭐️ Тарифы (Telegram Stars)',
  premium_payment_info: '💳 Оплата происходит с помощью Telegram Stars — внутренней валюты Telegram для удобной и безопасной оплаты внутри мессенджера. *Автоматического продления нет.*',
  premium_renewal_info: '📅 Продлить подписку можно в любой момент. К оставшемуся сроку прибавится соответствующее количество дней.',
  premium_stars_info: '💡 Приобрести звёзды без комиссии Apple / Google можно в официальном боте [@PremiumBot].',
  premium_explanation_title: '_Пояснение:_',
  premium_why_paid_title: '👀 Почему сервис платный?',
  premium_why_paid_text: 'Содержание сервера для этого бота обходится примерно в 10 000₽ в месяц — и это даже без учёта стремительно растущего числа пользователей. А я, как разработчик, ещё и кушать хочу чтобы были силы пилить вам сервис :)',
  
  // Ошибки валидации
  error_too_long_regular: '❌ Описание слишком длинное!\nМаксимум 80 символов для обычных пользователей.',
  error_too_long_premium: '❌ Описание слишком длинное!\nМаксимум 160 символов для премиум пользователей.',
  error_no_description: '❌ Нужно указать описание после суммы.',
  error_amount: '❌ Некорректная сумма. Введите число от 0.01 до 999999.',
  error_format: '❌ Не понял формат. Напиши сумму и описание через пробел.\nНапример: `200 продукты` или `1500 обед в кафе`',
  error_limit_reached: '❌ Достигнут лимит записей!\nОбычные пользователи: 100 записей\nПремиум пользователи: 300 записей\n\n💎 Перейдите на премиум для увеличения лимитов!',
  error_premium_required: '💎 Эта функция доступна только премиум пользователям!\n\nПреимущества премиума:\n• 160 символов в описании (вместо 80)\n• 300 записей (вместо 100)\n• Кастомные категории\n• Расширенная статистика',
  error_generic: '❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.',
  
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
  button_cancel: '❌ Отмена',
  button_back: '⬅️ Назад',
  button_change_currency: '💱 Сменить валюту',
  button_change_timezone: '🌍 Часовой пояс',
  button_change_language: '🌐 Язык',
  
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
}; 