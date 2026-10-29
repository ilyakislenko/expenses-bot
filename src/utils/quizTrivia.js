// Загадки про деньги для квиза недели (только ru и en). Верный ответ — первый в o (варианты перемешиваются при показе).
// q — вопрос (≤ 300), o — 4 варианта (≤ 100), x — пояснение после ответа (≤ 200). id не менять: по нему не повторяем
// уже заданные пользователю загадки.
module.exports = [
  {
    id: 't01',
    ru: { q: 'Правило 50/30/20: какая доля дохода по нему уходит в накопления?', o: ['20%', '30%', '50%', '10%'], x: '50% — на нужное, 30% — на желания, 20% — в накопления и на долги.' },
    en: { q: 'The 50/30/20 rule: what share of income goes to savings?', o: ['20%', '30%', '50%', '10%'], x: '50% for needs, 30% for wants, 20% for savings and debt.' }
  },
  {
    id: 't02',
    ru: { q: '100 000 ₽ под 10% годовых с капитализацией раз в год. Сколько будет через 2 года?', o: ['121 000 ₽', '120 000 ₽', '110 000 ₽', '200 000 ₽'], x: 'Проценты начисляются и на проценты: 100 000 × 1,1 × 1,1 = 121 000 ₽.' },
    en: { q: '$1,000 at 10% a year, compounded yearly. How much after 2 years?', o: ['$1,210', '$1,200', '$1,100', '$2,000'], x: 'Interest earns interest: 1,000 × 1.1 × 1.1 = $1,210.' }
  },
  {
    id: 't03',
    ru: { q: 'Правило 72: примерно за сколько лет удвоятся деньги под 8% годовых?', o: ['9 лет', '6 лет', '12 лет', '72 года'], x: '72 / 8 = 9: так быстро прикидывают срок удвоения при сложном проценте.' },
    en: { q: 'Rule of 72: roughly how many years to double money at 8% a year?', o: ['9 years', '6 years', '12 years', '72 years'], x: '72 / 8 = 9 — a quick way to estimate doubling time with compound interest.' }
  },
  {
    id: 't04',
    ru: { q: 'Цены за год выросли на 10%. Насколько меньше товаров можно купить на ту же сумму?', o: ['Примерно на 9%', 'Ровно на 10%', 'На 20%', 'Столько же'], x: '1 / 1,1 ≈ 0,91: покупательная способность упала примерно на 9%.' },
    en: { q: 'Prices rose 10% in a year. How much less can the same money buy?', o: ['About 9% less', 'Exactly 10% less', '20% less', 'The same'], x: '1 / 1.1 ≈ 0.91: purchasing power fell by about 9%.' }
  },
  {
    id: 't05',
    ru: { q: 'Сколько обычно советуют держать в «подушке безопасности»?', o: ['3–6 месяцев расходов', '1 неделю расходов', '1 месячный доход', '5 лет расходов'], x: 'Запас на 3–6 месяцев обычных расходов помогает пережить потерю дохода без долгов.' },
    en: { q: 'How big an emergency fund is usually recommended?', o: ['3–6 months of expenses', '1 week of expenses', 'One monthly paycheck', '5 years of expenses'], x: '3–6 months of usual expenses lets you survive a lost income without debt.' }
  },
  {
    id: 't06',
    ru: { q: 'Кофе за 250 ₽ каждый рабочий день (около 250 дней). Сколько это за год?', o: ['≈ 62 500 ₽', '≈ 25 000 ₽', '≈ 9 000 ₽', '≈ 125 000 ₽'], x: '250 ₽ × 250 дней = 62 500 ₽ — «латте-фактор»: мелочи складываются в крупные суммы.' },
    en: { q: 'A $5 coffee every workday (about 250 days). How much is that a year?', o: ['≈ $1,250', '≈ $500', '≈ $180', '≈ $2,500'], x: '$5 × 250 days = $1,250 — the “latte factor”: small things add up.' }
  },
  {
    id: 't07',
    ru: { q: 'Что такое диверсификация?', o: ['Деньги в разных активах, чтобы снизить риск', 'Все деньги в одной надёжной акции', 'Перевод денег между картами', 'Досрочное погашение кредита'], x: 'Не все яйца в одной корзине: падение одного актива меньше бьёт по всему капиталу.' },
    en: { q: 'What is diversification?', o: ['Spreading money across assets to cut risk', 'All money in one safe stock', 'Moving money between cards', 'Paying off a loan early'], x: 'Not all eggs in one basket: one asset falling hurts the whole portfolio less.' }
  },
  {
    id: 't08',
    ru: { q: 'Кредитка с беспроцентным периодом: что будет, если до его конца вернуть весь долг?', o: ['Проценты не начислят', 'Начислят проценты за месяц', 'Карту заблокируют', 'Спишут штраф'], x: 'В льготный период проценты не платят, если погасить всю сумму вовремя.' },
    en: { q: 'A credit card with a grace period: what if you repay the full balance before it ends?', o: ['No interest is charged', 'A month of interest is charged', 'The card is blocked', 'A penalty is charged'], x: 'Pay the full statement balance within the grace period and you pay no interest.' }
  },
  {
    id: 't09',
    ru: { q: 'Кредит под 2% в месяц. Это примерно сколько в год с учётом сложного процента?', o: ['≈ 27%', '24%', '2%', '12%'], x: '1,02^12 ≈ 1,268: «всего 2% в месяц» — почти 27% годовых.' },
    en: { q: 'A loan at 2% a month. Roughly what is that per year with compounding?', o: ['≈ 27%', '24%', '2%', '12%'], x: '1.02^12 ≈ 1.268: “just 2% a month” is almost 27% a year.' }
  },
  {
    id: 't10',
    ru: { q: 'Что значит «заплати сначала себе»?', o: ['Откладывать сразу, как пришёл доход', 'Тратить на себя до счетов', 'Брать зарплату наличными', 'Копить то, что осталось в конце месяца'], x: 'Сначала — перевод в накопления, потом траты: остатка в конце месяца обычно нет.' },
    en: { q: 'What does “pay yourself first” mean?', o: ['Save right when income arrives', 'Treat yourself before paying bills', 'Take your salary in cash', 'Save whatever is left at month-end'], x: 'Move money to savings first, then spend: there is rarely anything left at month-end.' }
  },
  {
    id: 't11',
    ru: { q: 'Что обычно рискованнее?', o: ['Акции одной компании', 'Индексный фонд на сотни компаний', 'Вклад в крупном банке', 'Наличные в рублях на месяц'], x: 'Одна компания может обанкротиться, а фонд на сотни компаний распределяет риск.' },
    en: { q: 'Which is usually riskier?', o: ['Shares of a single company', 'An index fund of hundreds of companies', 'A deposit at a big bank', 'Cash for one month'], x: 'One company can go bust; a fund of hundreds of companies spreads the risk.' }
  },
  {
    id: 't12',
    ru: { q: 'Вклад под 8% годовых, инфляция 10%. Что с деньгами в реальном выражении?', o: ['Дешевеют примерно на 2% в год', 'Растут на 8% в год', 'Растут на 18% в год', 'Не меняются'], x: 'Реальная доходность ≈ ставка − инфляция: 8% − 10% ≈ −2%.' },
    en: { q: 'A deposit pays 8% a year, inflation is 10%. What happens to the money in real terms?', o: ['Loses about 2% a year', 'Grows 8% a year', 'Grows 18% a year', 'Stays the same'], x: 'Real return ≈ rate − inflation: 8% − 10% ≈ −2%.' }
  },
  {
    id: 't13',
    ru: { q: 'Платить по кредитке только минимальный платёж — это…', o: ['Долг тянется годами и проценты растут', 'Самый дешёвый способ', 'Способ поднять кредитный лимит', 'Бесплатно'], x: 'Минимальный платёж в основном покрывает проценты, а сам долг почти не уменьшается.' },
    en: { q: 'Paying only the minimum on a credit card means…', o: ['Debt lasts years and interest piles up', 'The cheapest way to repay', 'A way to raise your limit', 'It is free'], x: 'The minimum mostly covers interest, so the balance barely shrinks.' }
  },
  {
    id: 't14',
    ru: { q: 'Что такое «метод конвертов»?', o: ['Делить деньги на траты заранее по категориям', 'Хранить деньги под матрасом', 'Отправлять деньги почтой', 'Платить только картой'], x: 'Каждой категории — свой «конверт»: кончился — до следующего дохода в ней не тратишь.' },
    en: { q: 'What is the “envelope method”?', o: ['Splitting money by spending category in advance', 'Keeping cash under the mattress', 'Sending money by mail', 'Paying only by card'], x: 'Each category gets an “envelope”; when it is empty, you stop spending there until next income.' }
  },
  {
    id: 't15',
    ru: { q: 'Как проще всего бороться с импульсивными покупками?', o: ['Подождать сутки перед покупкой', 'Покупать только по акции', 'Платить кредиткой', 'Покупать сразу, пока не передумал'], x: 'Пауза в 24 часа (для крупного — 30 дней) отсеивает большую часть спонтанных трат.' },
    en: { q: 'What is a simple way to fight impulse buys?', o: ['Wait a day before buying', 'Buy only on sale', 'Pay by credit card', 'Buy before you change your mind'], x: 'A 24-hour pause (30 days for big items) filters out most impulse spending.' }
  },
  {
    id: 't16',
    ru: { q: 'Подписка за 299 ₽ в месяц. Сколько это за год?', o: ['3 588 ₽', '2 990 ₽', '1 794 ₽', '29 900 ₽'], x: '299 ₽ × 12 = 3 588 ₽ — проверь, какими подписками ты правда пользуешься.' },
    en: { q: 'A $9.99 monthly subscription. How much is that a year?', o: ['≈ $120', '≈ $100', '≈ $60', '≈ $999'], x: '$9.99 × 12 ≈ $120 — check which subscriptions you actually use.' }
  },
  {
    id: 't17',
    ru: { q: 'Что такое ликвидность актива?', o: ['Как быстро его продать без потерь', 'Сколько он приносит в год', 'Сколько он стоил при покупке', 'Его налог'], x: 'Деньги на карте ликвидны сразу, квартиру продают месяцами и часто со скидкой.' },
    en: { q: 'What is the liquidity of an asset?', o: ['How fast it can be sold without loss', 'How much it earns a year', 'What it cost to buy', 'Its tax rate'], x: 'Money on a card is liquid instantly; a flat can take months to sell, often at a discount.' }
  },
  {
    id: 't18',
    ru: { q: 'Метод «лавина» при нескольких долгах — это сначала гасить…', o: ['Долг с самой высокой ставкой', 'Самый маленький долг', 'Самый новый долг', 'Все поровну'], x: 'Так меньше всего переплата по процентам. «Снежный ком» — сначала самый маленький, ради мотивации.' },
    en: { q: 'The “avalanche” method with several debts means paying off first…', o: ['The highest-interest debt', 'The smallest debt', 'The newest debt', 'All equally'], x: 'It saves the most interest. The “snowball” pays the smallest first, for motivation.' }
  },
  {
    id: 't19',
    ru: { q: 'Метод «снежный ком» при нескольких долгах — это сначала гасить…', o: ['Самый маленький долг', 'Долг с самой высокой ставкой', 'Самый крупный долг', 'Самый старый долг'], x: 'Быстрые маленькие победы мотивируют, хотя по процентам «лавина» обычно выгоднее.' },
    en: { q: 'The “snowball” method with several debts means paying off first…', o: ['The smallest debt', 'The highest-interest debt', 'The largest debt', 'The oldest debt'], x: 'Quick small wins keep you going, though the “avalanche” usually saves more interest.' }
  },
  {
    id: 't20',
    ru: { q: 'Бюджет «с нуля» (zero-based) — это когда…', o: ['Каждому рублю дохода заранее дана задача', 'Тратишь ноль рублей в месяц', 'Начинаешь копить с нуля каждый год', 'Не ведёшь учёт'], x: 'Доход − все запланированные траты и накопления = 0: ни одного «ничейного» рубля.' },
    en: { q: 'A “zero-based” budget means…', o: ['Every unit of income gets a job in advance', 'Spending zero each month', 'Restarting savings every year', 'Not tracking anything'], x: 'Income − all planned spending and savings = 0: no money without a purpose.' }
  },
  {
    id: 't21',
    ru: { q: 'Откладывать 10% от дохода 50 000 ₽ в месяц. Сколько накопится за год без процентов?', o: ['60 000 ₽', '50 000 ₽', '5 000 ₽', '120 000 ₽'], x: '5 000 ₽ × 12 = 60 000 ₽ — почти месячный доход «из ничего».' },
    en: { q: 'Saving 10% of a $3,000 monthly income. How much in a year, without interest?', o: ['$3,600', '$3,000', '$300', '$7,200'], x: '$300 × 12 = $3,600 — more than a month of income “out of nowhere”.' }
  },
  {
    id: 't22',
    ru: { q: 'Что такое чистый капитал (net worth)?', o: ['Всё, что есть, минус все долги', 'Зарплата после налогов', 'Деньги на карте', 'Доход за год'], x: 'Активы − обязательства. Растёт, когда копишь и гасишь долги.' },
    en: { q: 'What is net worth?', o: ['Everything you own minus all debts', 'Salary after tax', 'Money on your card', 'Yearly income'], x: 'Assets − liabilities. It grows as you save and pay off debt.' }
  },
  {
    id: 't23',
    ru: { q: 'Кэшбэк 1% при тратах 30 000 ₽ в месяц. Сколько вернётся за год?', o: ['3 600 ₽', '300 ₽', '30 000 ₽', '12 000 ₽'], x: '300 ₽ × 12 = 3 600 ₽. Приятно, но тратить ради кэшбэка невыгодно.' },
    en: { q: '1% cashback on $1,000 of spending a month. How much back in a year?', o: ['$120', '$10', '$1,000', '$12'], x: '$10 × 12 = $120. Nice, but spending for cashback never pays off.' }
  },
  {
    id: 't24',
    ru: { q: 'Как люди обычно оценивают свои мелкие траты, если их не записывать?', o: ['Недооценивают: мелочи забываются первыми', 'Всегда оценивают точно', 'Переоценивают в разы', 'Забывают только крупные траты'], x: 'Кофе, перекусы и такси выпадают из памяти — поэтому учёт часто удивляет.' },
    en: { q: 'Without tracking, how do people usually estimate their small purchases?', o: ['They underestimate them: small things are forgotten first', 'They never underestimate', 'Only big purchases are forgotten', 'Only on holiday'], x: 'Coffee, snacks and taxis slip from memory — that is why tracking surprises people.' }
  }
];
