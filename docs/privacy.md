# SpendTracker — Политика конфиденциальности / Privacy Policy

## Русский
Редакция от 28.10.2026. Оператор персональных данных — ИП KISLENKO (Республика Казахстан), ИИН 010320550645. Бот SpendTracker (@ExpensesAssistant_bot). Контакт: ikis.dev01@gmail.com, в боте — /paysupport.

## Какие данные бот хранит
- Из Telegram: ID, имя, username, язык.
- То, что ты вводишь: траты, доходы, регулярные траты, бюджеты, категории, описания, накопления и цели (суммы, названия, сроки, история пополнений), долги (суммы, названия, ставки, платежи в месяц, история изменений), параметры прогноза, настройки (валюта, часовой пояс, начало периода, напоминания, сводка).
- Импорт банковской выписки: из присланного файла сохраняются только операции — дата, сумма, валюта, описание (обычно название магазина или получателя перевода) и категория. Сам файл, номера карт и счетов, остатки и прочие строки выписки не сохраняются: файл разбирается в памяти и удаляется сразу после обработки.
- Фото чеков: из присланного фото сохраняются только траты по позициям чека (название, сумма, валюта, категория, дата) и сводка чека (продавец, дата, итог). Само фото бот не сохраняет. Если в цифрах чека бот не уверен, распознанные позиции ждут твоего решения («записать» или «отмена») до 7 дней, потом удаляются.
- Вопросы боту («🤖 Спроси бота»): текст вопроса не сохраняется — только факт ответа (дата, тип вопроса) для дневного лимита.
- Голосовые сообщения: распознаются программой на сервере бота (whisper.cpp) и никуда не передаются. Сохраняются только записанные из них траты и доходы и число голосовых за день (для дневного лимита). Само голосовое и его текстовая расшифровка не сохраняются: временный файл удаляется сразу после распознавания.
- Семья: участие в семье и приглашения. Семейные траты видят участники семьи.
- Покупки в Telegram Stars: тариф, сумма в звёздах, идентификатор платежа Telegram. Данные карт и счетов бот не получает — оплата проходит внутри Telegram.
- Сообщения в поддержку и баг-репорты.
- Код рекламной ссылки, по которой ты пришёл, и шаги первого запуска — для обезличенной статистики.
- Приглашения друзей: кто кого пригласил по личной ссылке и выданные за это дни премиума. Пригласивший видит в боте число приглашённых и получает сообщение с именем друга из Telegram, когда тот пришёл по ссылке и когда начал вести учёт; траты друга ему не видны.
- «😈 Злой режим» (по желанию): уровень, обращение (мужской / женский / «не скажу» — только чтобы правильно согласовать фразы) и счётчик подколок за день. Сами подколки не сохраняются.
- Ответы на вопросы «🧭 Настроим бота под тебя» (по желанию, любой можно пропустить): зачем тебе бот (цели), как удобнее записывать, какие вопросы пропущены и когда опрос пройден — чтобы настроить бот и показать нужные разделы, а также для обезличенной статистики. Остальные ответы сразу становятся обычными настройками.

## Зачем
Чтобы вести учёт, считать итоги и бюджеты, присылать напоминания, сводки и уведомления, выдавать премиум, отвечать в поддержке и улучшать бот.

## Кому передаются
Данные не продаются и не передаются для рекламы. Сообщения доставляет Telegram. Курсы валют загружаются с cbr-xml-daily.ru без твоих данных. Голосовые сообщения распознаются на сервере бота и третьим лицам не передаются. Фото чека распознаёт нейросеть — только изображение, без твоего имени и ID. Обычно это модели, запущенные на компьютерах разработчика: тогда фото никуда не уходит. Если они недоступны и в боте настроен облачный сервис (например, Google Gemini или Mistral), фото отправляется ему; бесплатный тариф Gemini позволяет Google использовать присланные данные для улучшения своих продуктов, поэтому не присылай фото с лишними личными данными.
Вопрос боту, который бот не разобрал сам, разбирает нейросеть — только текст вопроса, сегодняшняя дата и названия твоих категорий, без имени, ID и сумм. Суммы и ответ считает сам бот по твоим записям. Нейросеть та же, что для чеков (обычно на компьютерах разработчика, облачный сервис — только если локальные недоступны и он настроен).

## Хранение
На сервере разработчика в России. Резервные копии базы хранятся 30 дней. Технические логи, в том числе логи ошибок (в них может быть начало текста запросов к боту, до 100 символов), — 14 дней, потом удаляются автоматически.

## Удаление
Напиши на ikis.dev01@gmail.com или в /paysupport — удалим аккаунт и все записи в течение 30 дней (из резервных копий — по истечении их срока).

## Изменения
О существенных изменениях сообщим в боте. Актуальная версия — по команде /privacy.

## English
Version of 28.10.2026. Data controller: IE KISLENKO (Republic of Kazakhstan), IIN 010320550645. SpendTracker bot (@ExpensesAssistant_bot). Contact: ikis.dev01@gmail.com, in the bot — /paysupport.

## What the bot stores
- From Telegram: ID, name, username, language.
- What you enter: expenses, income, recurring expenses, budgets, categories, descriptions, savings and goals (amounts, names, deadlines, deposit history), debts (amounts, names, rates, monthly payments, change history), forecast parameters, settings (currency, time zone, period start, reminders, summary).
- Bank statement import: only the operations from the file you send are stored — date, amount, currency, description (usually the merchant or transfer recipient) and category. The file itself, card and account numbers, balances and the rest of the statement are not stored: the file is processed in memory and discarded right after.
- Receipt photos: only the expenses from the receipt lines (name, amount, currency, category, date) and a receipt summary (merchant, date, total) are stored. The bot does not store the photo itself. If the bot isn't sure about a receipt's numbers, the recognized lines wait for your decision («record» or «cancel») for up to 7 days and are then deleted.
- Questions to the bot («🤖 Ask the bot»): the question text is not stored — only the fact of an answer (date, question type) for the daily limit.
- Voice messages: recognized by a program on the bot's own server (whisper.cpp) and not sent anywhere. Only the expenses and income recorded from them and the number of voice messages per day (for the daily limit) are stored. The voice message itself and its transcript are not stored: the temporary file is deleted right after recognition.
- Family: membership and invitations. Family expenses are visible to family members.
- Telegram Stars purchases: plan, amount in Stars, Telegram payment ID. The bot never receives card or bank details — payment happens inside Telegram.
- Support messages and bug reports.
- The code of the ad link you came from and first-run steps — for anonymous statistics.
- Friend invites: who invited whom via a personal link and the premium days granted for it. The inviter sees the number of invited friends in the bot and gets a message with the friend's Telegram name when the friend joins via the link and when they start tracking; the friend's expenses are never shown to them.
- Roast mode (opt-in): the level, the form of address (male / female / «rather not say» — only to get the grammar right) and a per-day counter of roasts. The roast texts are not stored.
- «🧭 Let's set the bot up for you» answers (optional, any question can be skipped): what you need the bot for (goals), how you prefer to record, which questions were skipped and when the setup was finished — to configure the bot, show the right sections and for anonymous statistics. The other answers simply become regular settings.

## Why
To keep your records, calculate summaries and budgets, send reminders, summaries and notifications, grant premium, answer support requests and improve the bot.

## Sharing
Data is not sold or shared for advertising. Messages are delivered by Telegram. Exchange rates are loaded from cbr-xml-daily.ru without your data. Voice messages are recognized on the bot's own server and are not shared with third parties. A receipt photo is recognized by an AI model — the image only, without your name or ID. Usually these are models running on the developer's own computers, so the photo doesn't leave them. If they are unavailable and a cloud service is configured in the bot (for example Google Gemini or Mistral), the photo is sent to it; Gemini's free tier allows Google to use submitted data to improve its products, so don't send photos with unnecessary personal information.
A question the bot can't parse by itself is parsed by an AI model — only the question text, today's date and your category names, without your name, ID or amounts. The bot computes the amounts and the answer from your records itself. It's the same model as for receipts (usually on the developer's own computers; a cloud service only if those are unavailable and one is configured).

## Storage
On the developer's server in Russia. Database backups are kept for 30 days. Technical logs, including error logs (they may contain the first 100 characters of requests to the bot), are kept for 14 days and then deleted automatically.

## Deletion
Write to ikis.dev01@gmail.com or /paysupport — we will delete your account and all records within 30 days (from backups — when they expire).

## Changes
Significant changes will be announced in the bot. The current version is always available via /privacy.
