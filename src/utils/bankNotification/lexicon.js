// Словари разбора уведомлений банка: валюты, слова операций, остатка, маски карт. Всё в нижнем регистре (ё → е),
// сопоставление — по тексту, приведённому prepare() из index.js. Порядок важен только там, где сказано.
const { SUPPORTED_CURRENCIES } = require('../../config/currencies');

// Символы валют (могут стоять до или после суммы)
const SYMBOLS = [
  ['r$', 'BRL'], ['$', 'USD'], ['€', 'EUR'], ['₽', 'RUB'], ['₸', 'KZT'], ['₾', 'GEL'], ['₺', 'TRY'], ['₹', 'INR'],
  ['£', 'GBP'], ['฿', 'THB'], ['¥', 'JPY'], ['円', 'JPY'], ['元', 'CNY']
];

// Коды и слова валют (отдельным словом). RUR — старый код рубля в SMS Альфы и ВТБ, TL — турецкая лира, Rs — рупия
const CURRENCY_WORDS = {
  RUB: ['rub', 'rur', 'руб', 'руб.', 'р', 'р.', 'рублей', 'рубля', 'рубль', 'rubl'],
  USD: ['usd', 'us$', 'долл', 'долл.', 'долларов'],
  EUR: ['eur', 'euro', 'евро', 'eur.'],
  KZT: ['kzt', 'тг', 'тг.', 'тенге', 'tenge', 'tg'],
  UZS: ['uzs', 'сум', 'сўм', "so'm", 'so‘m', 'soʻm', "so`m", 'som', 'sum', 'сумм'],
  GEL: ['gel', 'лари', 'lari', 'ლარი'],
  TRY: ['try', 'tl', 'lira'],
  INR: ['inr', 'rs', 'rs.', 'rupees'],
  CNY: ['cny', 'rmb', '人民币', '元'],
  JPY: ['jpy', '円', 'yen'],
  THB: ['thb', 'baht'],
  // Не поддерживаются ботом: распознаются, чтобы честно сказать «валюта не поддерживается», а не записать чужую сумму
  GBP: ['gbp'], CHF: ['chf'], BRL: ['brl'], AED: ['aed'], PLN: ['pln', 'zł', 'zl'], UAH: ['uah', 'грн'], BYN: ['byn'],
  AMD: ['amd'], AZN: ['azn'], KGS: ['kgs'], TJS: ['tjs'], CAD: ['cad'], AUD: ['aud'], SGD: ['sgd'], HKD: ['hkd'],
  KRW: ['krw'], VND: ['vnd'], IDR: ['idr'], MYR: ['myr'], EGP: ['egp'], ILS: ['ils'], CZK: ['czk'], SEK: ['sek'],
  NOK: ['nok'], DKK: ['dkk'], HUF: ['huf'], RON: ['ron'], MXN: ['mxn'], ARS: ['ars']
};

const CURRENCY_BY_WORD = new Map();
for (const [code, words] of Object.entries(CURRENCY_WORDS)) {
  for (const word of words) CURRENCY_BY_WORD.set(word, code);
}

function isSupported(code) {
  return SUPPORTED_CURRENCIES.includes(code);
}

// Слова операции: основы слов в нижнем регистре (ё → е, «İ» → «i»). Слово ищется с начала (не внутри другого
// слова латиницей, кириллицей или грузинским); иероглифы — где угодно.
const BOUNDARY = '(?<![\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Georgian}])';
function stems(list) {
  return new RegExp(`${BOUNDARY}(?:${list.join('|')})`, 'u');
}

// Отказ банка: операция не прошла — не записываем
const DECLINED = stems([
  'отказ', 'отклонен', 'недостаточно средств', 'операция не выполнена', 'не прошла', 'declin', 'rejected', 'insufficient',
  'denied', 'was not approved', 'reddedil', 'yetersiz', 'onaylanmad', 'rechaz', 'denegad', 'abgelehnt', 'refus[eé]', 'recusad',
  'negad', 'rad etil', 'rad qilin', 'amalga oshmadi', 'бас тартыл', 'қабылданбады', 'უარყოფ', 'ვერ შესრულდა', '拒绝', '交易失败',
  '承認されませんでした'
]);

// Возврат и отмена покупки: не доход и не трата — предлагаем удалить ту покупку
const REFUND = stems([
  'возврат', 'отмена', 'refund', 'reversal', 'reversed', 'chargeback', 'returned to your card', 'iade', 'reembolso', 'devoluci[oó]n',
  'erstattung', 'r[uü]ckerstattung', 'storno', 'remboursement', 'annulation', 'estorno', 'qaytar', 'vozvrat', 'otmena', 'қайтар',
  'დაბრუნ', '退款', '退货', '返金'
]);

// Перевод между своими счетами, на вклад или копилку: не трата (спрашиваем)
const SELF_TRANSFER = stems([
  'между своими', 'на свой сч', 'на свою карт', 'со своего', 'своих сч', 'собственн(?:ых|ого) сч', 'на вклад', 'со вклада',
  'на накопительн', 'с накопительн', 'копилк', 'на депозит', 'с депозита', 'kaspi депозит', 'депозит kaspi', 'kendi hesab',
  'between (?:your|own|my) accounts', 'to your savings', 'from your savings', 'to savings', 'own account',
  'entre (?:tus|sus|mis) cuentas', 'entre cuentas propias', 'entre vos comptes', 'entre (?:as suas )?contas', 'eigenes konto',
  'zwischen (?:deinen|ihren|eigenen) konten', "o'z hisob", 'o‘z hisob', 'өз шот', 'საკუთარ ანგარიშ', '本人账户', '自己账户'
]);

// Снятие и внесение наличных: деньги не потрачены (спрашиваем, как выписка спрашивает про переводы)
const CASH = stems([
  'снятие налич', 'выдача налич', 'снятие в банкомат', 'внесение налич', 'пополнение через банкомат', 'cash withdrawal',
  'atm withdrawal', 'withdrawn at atm', 'withdrawal at atm', 'cash deposit', 'nakit [cç]ek', 'para [cç]ekme', 'retirada de efectivo',
  'retiro de efectivo', 'retiro en cajero', 'bargeldauszahlung', 'bargeldabhebung', 'geldautomat', "retrait d'esp[eè]ces",
  'retrait dab', 'retrait au distributeur', 'levantamento', 'naqd pul', 'naqd yechish', 'nalichny', 'snyatie', 'қолма-қол',
  'нақты ақша', 'ნაღდი ფულ', '取现', '取款', '現金引き出し', 'atm(?!\\p{L})'
]);

// Поступление денег. «+» перед суммой — тоже поступление (см. index.js). Перевод «от …» — входящий
const INCOME = stems([
  'зачислен', 'поступлен', 'пополнен', 'перевод из', 'перевод[^.\\n]{0,40}?\\sот\\s', 'получен перевод', 'входящий перевод',
  'вам перевел', 'зарплат', 'заработн', 'credited', 'received', 'you got', 'incoming', 'deposited', 'salary', 'payroll',
  'transfer[^.\\n]{0,40}? from ', 'gutschrift', 'eingang', 'gehalt', 'lohn(?!\\p{L})', 'has recibido', 'recibiste', 'ingreso', 'abono',
  'n[oó]mina', 'vous avez re[cç]u', 're[cç]u un virement', 'virement re[cç]u', 'recebeu', 'recebido', 'sal[aá]rio', 'yat[ıi]r[ıi]l',
  'gelen', 'maa[sş]', 'hesab[ıi]n[ıi]za(?!\\p{L})', 'tushum', 'kirim', "o'tkazma keldi", 'popolnenie', 'zachislenie', 'postuplenie',
  'perevod[^.\\n]{0,40}?\\sot\\s', 'түсті', 'толықтыр', 'аударым келді', 'ჩარიცხ', 'შემოსავ', 'მიღებ', '入账', '收入', '存入',
  '转入', '振込入金', '入金'
]);

// Списание: покупка, оплата, перевод другому, платёж
const EXPENSE = stems([
  'покупк', 'оплат', 'списан', 'перевод', 'платеж', 'сатып ал', 'төлем', 'аударым', 'pokupka', 'oplata', 'spisanie', 'perevod',
  'platezh', 'xarid', "to'lov", 'to‘lov', 'tolov', "o'tkazma", 'purchase', 'payment', 'paid', 'spent', 'spend', 'debited',
  'debit', 'transaction', 'charged', 'charge(?!\\p{L})', 'sent', 'transfer', 'withdrawn', 'harcama', 'al[ıi][sş]veri[sş]',
  '[oö]deme', 'tahsil', 'compra', 'pago', 'cargo', 'gasto', 'transferencia', 'kartenzahlung', 'zahlung', 'bezahlt', 'belastung',
  'lastschrift', 'abbuchung', '[uü]berweisung', 'paiement', 'achat', 'pr[eé]l[eè]vement', 'd[eé]bit', 'virement', 'pagamento',
  'transfer[eê]ncia', 'for using', 'used (?:at|for|in)', 'has been used', 'გადახდა', 'შენაძენ', 'გადარიცხვ', 'ჩამოჭრ', '消费', '支出', '支付', '扣款', 'ご利用', '利用'
]);

// Зарплата и похожие поступления: слово операции, но и описание («Пополнение. 50 000 RUB. Зарплата.»)
const SALARY = stems(['зарплат', 'заработн', 'salary', 'payroll', 'gehalt', 'lohn', 'n[oó]mina', 'sal[aá]rio', 'maa[sş]', 'ხელფას', '工资', '給与']);

// Ключевые слова банков и платёжных приложений: шаблон банка и сильный признак уведомления
const BANKS = [
  ['sber', /(сбербанк|сбер(?![а-я])|sberbank|^\s*(ecmc|visa|mir|maes|mc)-?\d{4}|^\s*сч[её]т\d{4})/i],
  ['tbank', /(т-банк|тинькофф|tinkoff|t-bank)/i],
  ['alfa', /(альфа-банк|альфа банк|alfa-bank|alfabank)/i],
  ['vtb', /(втб|vtb)/i],
  ['ozon', /(ozon банк|озон банк|ozon bank)/i],
  ['yandex', /(яндекс банк|яндекс пэй|яндекс пей|yandex bank|yandex pay)/i],
  ['raiffeisen', /(raiffeisen|райффайзен)/i],
  ['kaspi', /(kaspi|каспи)/i],
  ['halyk', /(halyk|халык)/i],
  ['uzcard', /(uzcard)/i],
  ['humo', /(humo)/i],
  ['click', /(^|\s)click(\s|:|$)/i],
  ['payme', /(?<![\p{L}])payme(?![\p{L}])/iu],
  ['tbc', /(^|\s)tbc(\s|:|$)|თიბისი/i],
  ['bog', /(^|\s)bog(\s|:|$)|bank of georgia|საქართველოს ბანკი/i],
  ['garanti', /(garanti)/i],
  ['isbank', /(i̇ş bankas|is bankas|işbank|isbank)/i],
  ['akbank', /(akbank)/i],
  ['hdfc', /(hdfc)/i],
  ['icici', /(icici)/i],
  ['sbi', /(^|\s)sbi(\s|:|$)/i],
  ['chase', /(^|\s)chase(\s|:|$)/i],
  ['revolut', /(revolut)/i],
  ['monzo', /(monzo)/i],
  ['n26', /(^|\s)n26(\s|:|$)/i],
  ['bbva', /(bbva)/i],
  ['santander', /(santander)/i],
  ['sparkasse', /(sparkasse)/i],
  ['boursorama', /(boursorama)/i],
  ['millennium', /(millennium)/i],
  ['cmb', /(招商银行)/],
  ['smbc', /(三井住友)/]
];

// Слова остатка: сумма после них — баланс счёта, её не записываем и не храним
const BALANCE = stems([
  'доступно', 'баланс', 'остаток', 'ост\\.', 'дост\\.', 'қолжетімді', 'қалдық', 'dostupno', 'dostupny', 'ostatok', 'balans',
  'qoldiq', 'available', 'avl\\.? ?bal', 'avail\\.? ?bal', 'bal(?:ance)?(?!\\p{L})', 'remaining', 'kullan[ıi]labilir', 'bakiye',
  'kalan limit', 'saldo', 'disponible', 'kontostand', 'verf[uü]gbar', 'solde', 'dispon[ií]vel', 'ხელმისაწვდომი', 'ნაშთი',
  'ბალანსი', '余额', '可用额度', '残高', '利用可能額'
]);

// Суммы, которые не операция: кэшбэк, комиссия, лимит
const AUXILIARY = stems([
  'кэшбэк', 'кешбэк', 'cashback', 'cash back', 'комисси', 'fee(?!\\p{L})', 'fees', 'commission', 'komissiya', 'komisyon',
  'comisi[oó]n', 'geb[uü]hr', 'frais', 'taxa', 'бонус', 'bonus', 'балл', 'миль', 'points', 'лимит', 'limit', 'l[ií]mite'
]);

// Маски и номера карт и счетов (вырезаются до разбора и хранения)
const CARD_PATTERNS = [
  /(?:visa|ecmc|mir|mc|maes|maestro|amex|master ?card|unionpay|humocard|uzcard|humo|card|karta|карта|карты|карте|картой|сч[её]т|счета|счет|sch[eë]t|schet|a\/c|acct|account|kart[ıi]|cart[aã]o|tarjeta|karte|carte|ბარათი|ანგარიში|卡|尾号)[\s:№#-]*(?:[*•.·xх]+\s?)?\d{4}(?!\d)/giu,
  /[*•·]{1,6}\s?\d{4}(?!\d)/gu,
  /\.{2,4}\s?\d{4}(?!\d)/gu,
  /(?<![\p{L}\d])[xх]{2,}\d{4}(?!\d)/giu,
  /(?:ending|ends) (?:in |with )?\d{4}(?!\d)/gi,
  /\d{4} (?:ile biten|ile bitten)/gi,
  /尾号\d{4}/g,
  /(?<!\d)\d{4}[ -]?\d{2}[*x•]{2,}[*x•\d -]{0,8}\d{4}(?!\d)/giu,
  /(?<![\d.,])\d(?:[ -]?\d){11,18}(?![\d.,])/g // полный номер карты, номер счёта, длинные коды операций
];

module.exports = {
  SYMBOLS, CURRENCY_BY_WORD, isSupported, SALARY, DECLINED, REFUND, SELF_TRANSFER, CASH, INCOME, EXPENSE, BANKS, BALANCE, AUXILIARY,
  CARD_PATTERNS
};
