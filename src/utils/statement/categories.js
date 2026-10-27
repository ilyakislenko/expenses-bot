// Категория бота (имя системной категории) для операции выписки: по категории банка, затем по MCC,
// затем по ключевым словам описания. null — не узнали (запишется в категорию по умолчанию).
const FOOD = 'Еда';
const TRANSPORT = 'Транспорт';
const ENTERTAINMENT = 'Развлечения';
const SHOPPING = 'Покупки';
const HEALTH = 'Здоровье';

const BANK_CATEGORY_RULES = [
  [HEALTH, /аптек|медицин|здоров|клиник|стоматолог|больниц|анализ|pharmac|medical|health|drug|clinic|dental/i],
  [FOOD, /супермаркет|продукт|рестора|кафе|фастфуд|фаст-фуд|(^|\s)еда|(^|\s)бары?($|\s|,)|кофе|пекар|кондитер|доставка еды|столов|grocer|supermarket|restaurant|cafe|café|food|coffee|bakery|азық|тамақ/i],
  [TRANSPORT, /транспорт|такси|топлив|азс|бензин|каршеринг|метро|парковк|ж\/д|железнодорож|авиа|автоуслуг|аренда авто|автомобил|taxi|transport|fuel|gas station|parking|airline|railway|car rental|көлік/i],
  [ENTERTAINMENT, /развлеч|кино|театр|музык|игр(?!ушк)|отдых|культур|хобби|концерт|музе|подписк|entertainment|cinema|movie|game|music|stream|hobby|leisure/i],
  [SHOPPING, /одежд|обув|маркетплейс|электрон|техник|для дома|ремонт|различные товары|универмаг|книг|спорттовар|цвет|подарк|игрушк|косметик|красот|животн|детск|ювелир|shopping|clothing|electronics|marketplace|department|books|beauty|gifts|pets/i]
];

// MCC: точные коды и диапазоны
const MCC_RULES = [
  [FOOD, [5411, 5412, 5422, 5441, 5451, 5462, 5499, 5811, 5812, 5813, 5814, 5921]],
  [TRANSPORT, [4111, 4112, 4121, 4131, 4411, 4511, 4582, 4784, 4789, 5172, 5511, 5532, 5533, 5541, 5542, 5552, 5983, 7511, 7512, 7513, 7523, 7531, 7534, 7535, 7538, 7542, 7549, [3000, 3350], [3351, 3500]]],
  [HEALTH, [4119, 5047, 5122, 5912, 5975, 5976, 8011, 8021, 8031, 8041, 8042, 8043, 8049, 8050, 8062, 8071, 8099]],
  [ENTERTAINMENT, [5815, 5816, 5817, 5818, 7829, 7832, 7841, 7911, 7922, 7929, 7932, 7933, 7941, 7991, 7992, 7993, 7994, 7996, 7997, 7998, 7999, 5733, 5735]],
  [SHOPPING, [5200, 5211, 5251, 5261, 5300, 5309, 5310, 5311, 5331, 5399, 5611, 5621, 5631, 5641, 5651, 5655, 5661, 5681, 5691, 5697, 5698, 5699,
    5712, 5713, 5714, 5719, 5722, 5732, 5734, 5940, 5941, 5942, 5943, 5944, 5945, 5947, 5948, 5949, 5950, 5964, 5965, 5969, 5970, 5977, 5992, 5994, 5995, 5999, 7230, 7298]]
];

const DESCRIPTION_RULES = [
  [FOOD, /пят[её]рочк|pyaterochk|перекр[её]ст|perekrestok|магнит|magnit|вкусвилл|vkusvill|ашан|auchan|лента|lenta|дикси|dixy|metro c&c|самокат|samokat|яндекс\.?\s?еда|yandex\.?\s?eda|delivery club|макдоналдс|mcdonald|kfc|бургер кинг|burger king|вкусно и точка|teremok|теремок|starbucks|шоколадница|magnum|\bsmall\b|galmart|korzinka|carrefour|migros|lidl|aldi|rewe|edeka/i],
  [TRANSPORT, /такси|taxi|uber|yandex\.?\s?go|яндекс\.?\s?go|\bbolt\b|indriver|ситимобил|лукойл|lukoil|газпромнефть|gazpromneft|роснефть|rosneft|\bshell\b|tatneft|татнефть|метрополитен|metro mos|тройка|аэрофлот|aeroflot|ржд|\brzd\b|\bs7\b|\bonay\b|делимобиль|delimobil|whoosh|юрент|urent/i],
  [HEALTH, /аптек|apteka|pharm|еаптека|ригла|rigla|горздрав|invitro|инвитро|гемотест|helix|хеликс|стоматолог|dental|клиник|clinic/i],
  [ENTERTAINMENT, /кино|cinema|синема|театр|netflix|spotify|кинопоиск|kinopoisk|okko|\bivi\b|steam|playstation|xbox|nintendo|apple\.com\/bill|яндекс плюс|yandex plus|youtube/i],
  [SHOPPING, /wildberries|вайлдберриз|\bozon\b|озон|aliexpress|алиэкспресс|яндекс маркет|yandex market|lamoda|ламода|\bdns\b|мвидео|m\.video|эльдорадо|eldorado|\bikea\b|икеа|леруа|leroy|\bobi\b|\bzara\b|h&m|uniqlo|sulpak|technodom|детский мир|золотое яблоко|летуаль|l'etoile|sportmaster|спортмастер/i]
];

function mccMatches(codes, mcc) {
  return codes.some(code => (Array.isArray(code) ? mcc >= code[0] && mcc <= code[1] : code === mcc));
}

function mapBankCategory({ bankCategory = '', mcc = '', description = '' } = {}) {
  if (bankCategory) {
    for (const [name, pattern] of BANK_CATEGORY_RULES) {
      if (pattern.test(bankCategory)) return name;
    }
  }
  const code = parseInt(mcc, 10);
  if (Number.isInteger(code)) {
    for (const [name, codes] of MCC_RULES) {
      if (mccMatches(codes, code)) return name;
    }
  }
  if (description) {
    for (const [name, pattern] of DESCRIPTION_RULES) {
      if (pattern.test(description)) return name;
    }
  }
  return null;
}

module.exports = { mapBankCategory };
