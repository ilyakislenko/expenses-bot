// «😈 Zaharxanda rejimi» — узбекский (латиница). Синтаксис шаблонов (utils/roast.js): {param}; {n#форма} — слово
// по числу (в узбекском после числа множественного числа нет, поэтому не используется). Язык без рода — токенов {м|ж} нет.
// К суммам и процентам не приклеиваем аффиксы — только послелоги («uchun») и именительный падеж.
// Markdown в шаблонах не используется (никаких * _ ` [).
module.exports = {
  labels: {
    total_budget: 'umumiy byudjeting',
    category_budget: '«{category}» byudjeting'
  },

  // 🌶 Kinoyali: so‘kinishsiz istehzo
  spicy: {
    morning_good: [
      "Bugungi limit {daily}. Bu sinov emas, iltimos.",
      "Reja tayyor. Eng qiyini — uni yo‘qdek ko‘rmaslik.",
      "Kecha rejada qolindi. Hamyon takrorini kutyapti."
    ],
    morning_bad: [
      "Kecha rejadan {over} ortiq. Bugun tuzatish kuni.",
      "Reja kecha yutqazdi. Revansh bugun, yetkazib berishsiz.",
      "Kecha hamyon rejadan ko‘proq ozdi. Bugun sekinroq."
    ],
    // {budget} {limit} {spent} {over} {percent} {amount} {desc} {days_left}
    budget_over: [
      '{budget} tugadi: {limit} limitga {spent} sarflading. Oshiqcha: {over}. Limit shunchaki maslahat ekan-da.',
      '«{desc}» uchun {amount} — va {budget} rasman o‘ldi. Bir daqiqa sukut, iltimos.',
      'Tabriklayman, limitdan oshib ketding, farqi {over}. Afsus, bu rekord bilan maqtanib bo‘lmaydi.',
      'Davr tugashiga {days_left} kun bor, {budget} esa allaqachon {over} minusda. Jasur strategiya.',
      'Limitni ({limit}) o‘zing qo‘ygansan. Keyin o‘zing undan oshib o‘tding — farqi {over}. Va’dasida turadiganlar bor… sen emas.',
      '{budget}: {percent}%. Yuz foiz — zerikarli odamlar uchun, to‘g‘rimi?',
      'Byudjet {limit} edi. Edi. Endi {spent}, byudjet esa shirin xotira.'
    ],
    // {budget} {limit} {spent} {left} {percent} {amount} {desc} {days_left}
    budget_80: [
      '{budget} allaqachon {percent}%. {days_left} kunga {left} qoldi. Omad, kerak bo‘ladi.',
      '«{desc}» uchun {amount} — limitgacha atigi {left} qoldi. Tejashni boshlash vaqti keldi. Kecha.',
      'Limitga yopishib qolding: {percent}%. Yana ikkita «{desc}» — va o‘yin tugadi.',
      'Davrning qolgan qismi uchun {left}. Bu endi byudjet emas, omon qolish o‘yini.',
      'Limitgacha atigi {left} qoldi. «{desc}» shunga arzidimi?',
      'Byudjet {percent}% to‘ldi, davr esa hali tugamadi. Tartibda nimadir noto‘g‘ri.'
    ],
    // {daily} {spent} {over} {amount} {desc} {times}
    allowance: [
      'Bugungi limit: {daily}. Sarflandi: {spent}. Ertangi kun bugun uchun to‘layapti.',
      'Bugun {daily} sarflash mumkin edi, {spent} ketdi. Ortiqcha {over} ertaga sezilsa kerak.',
      '«{desc}» uchun {amount} — {daily} kunlik limit tarixga aylandi. Reja bilan birga.',
      'Bir martada {times} kunlik limitni kuydirding. Samaradorlik bor, tan olaman.',
      'Limit {daily} edi. Sen buni qoida emas, ishora deb tushunding: {spent}.',
      'Kun rejasi: {daily}. Haqiqat: {spent}. Reja katta edi, lekin bunchalik emas.',
      'Bugungi limit «{desc}» uchun jon berdi. Ertaga yangi sahifa, a?'
    ],
    // {category} {days} {amount} {desc}
    challenge: [
      '«{category}»siz haftang {days} kun davom etdi. Rekord — lekin jahon rekordi emas.',
      'O‘zingga «{category}»siz bir hafta va’da bergan eding. Va’da {amount} turdi.',
      '«{desc}» uchun {amount} — «{category}» chellenji chellenjlar qabristoniga ketdi.',
      'Iroda: {days} kun. Taslim bo‘lish narxi: {amount}.',
      'Chellenj yiqildi. Hech bo‘lmasa «{desc}» arzigandir.',
      '«{desc}» oldida taslim bo‘lding. «{category}»siz butun bir hafta — yetti kun, qanchalar og‘ir.'
    ],
    // {amount} {desc} {median} {times} {category} {cat_times}
    impulse: [
      '«{desc}» uchun {amount} — odatdagi xarajatingdan {times} barobar ko‘p ({median}). Impuls qayd etildi.',
      'Odatda {median} atrofida sarflaysan. Endi esa «{desc}» uchun {amount}. Nimadir bo‘ldimi yoki shunchaki ko‘ngil tusadimi?',
      'Bir martada {amount}. O‘zingdan kutmaganmiding? Men ham.',
      'Bir zarbada {cat_times} ta odatdagi «{category}» xaridi. Qo‘li ochiqlikni qara.',
      '«{desc}» uchun {amount}. Umid qilamanki, bir haftadan keyin ham yoqib turadi.',
      'Kunning impulsiv xaridi: «{desc}», {amount}. O‘rtacha xariding {median}, aytib qo‘yay.',
      'Odatdagidan {times} barobar qimmat. Hamyoning qayerdadir jimgina yig‘layapti.'
    ],
    // {amount} {desc} {count} {sum}
    junk: [
      '«{desc}» uchun {amount}. Bu davrda {count}-marta, jami {sum}. Barqarorlik — mahorat belgisi.',
      '«{desc}» — {amount}. Bu davrda {sum} turgan odat. Zo‘r obuna, faqat bema’nilikka.',
      'Kutilmagan yangilik: «{desc}» olish shart emas. Lekin sen, albatta, olding.',
      'Bu davrda {count}-marta. «{desc}» endi doimiy xarajat hisoblanadi.',
      '«{desc}» uchun yana {amount}. Hamyoning buni shikoyatlar ro‘yxatiga qo‘shdi.',
      '«{desc}» yana sahnada: bu davrda {sum}. Shu pulga… mayli, qo‘y.',
      '«{desc}» uchun {amount}. Foydali, arzon, aqlli… hech biri emas.'
    ],
    junk_fastfood: [
      '«{desc}» uchun {amount} — bu davrda {count}-fastfud. Oshpaz bo‘lmasliging aniq.',
      'Bir xalta oziq-ovqat o‘rniga «{desc}» uchun {amount}. Mazali, tez, qimmat.'
    ],
    junk_delivery: [
      'Yetkazib berish uchun {amount}. Kuryer tez orada seni ismingdan taniydi.',
      'Bu davrda {count}-yetkazib berish, jami {sum}. Plita shunchaki bezakmi?'
    ],
    junk_alcohol: [
      '«{desc}» uchun {amount}. Bu davrda {count}-marta — bu bazm emas, a’zolik.',
      '«{desc}» — {amount}. Cheklarga qaraganda, har kuning bayram.'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. Bu davrda {sum} tom ma’noda tutun bo‘ldi.',
      '«{desc}» uchun {amount}. Ma’lum bo‘lishicha, pulni ham chekish mumkin ekan.'
    ],
    junk_energy: [
      'Energetik uchun {amount}. Energiya ko‘paydi, pul kamaydi.',
      'Bu davrda {count}-banka, jami {sum}. Bedor yurish qimmat ish.'
    ],
    junk_taxi: [
      'Taksi uchun {amount}. Oyoqlar shunchaki ko‘rinish uchun shekilli.',
      'Bu davrda {count}-taksi, jami {sum}. Yana ozgina — mashina olish arzonroq tushardi.'
    ],
    // {total} {percent} {amount}
    week_more: [
      'Bu hafta odatdagidan {percent}% qimmatga tushdi — ortiqcha {amount}. Podshohlardek yashayapmiz.',
      'Oddiy haftadan {amount} ko‘p. Yo nimanidir nishonlading, yo… yo‘q, nishonlading.',
      'Bu hafta {total}, me’yordan {percent}% yuqori. Trend jonli. Hamyon emas.',
      'Odatdagidan {amount} qimmat hafta. Dushanba senga xo‘mrayib qarayapti.'
    ],
    week_less: [
      'Bu hafta odatdagidan {percent}% arzon. Shubhali. Hammasini yozdingmi?',
      'Oddiy haftadan {amount} kam. Ishonmayman, lekin yoqdi.',
      '{amount} tejading. Bo‘shashma, dam olish kunlari kelyapti.',
      'Bu hafta {total}, odatdagidan {percent}% kam. Sen kimsan va o‘sha isrofgarni nima qilding?'
    ],
    week_same: [
      'Odatdagi hafta: {total}. Barqarorlik ham natija. Zerikarli, lekin baribir.',
      'Na yaxshiroq, na yomonroq. Gap qo‘shadigan narsa yo‘q. Deyarli.',
      '{total} — xuddi har doimgidek. Budilnikdek oldindan bilsa bo‘ladi.'
    ],
    month_empty: [
      'Bu davrda birorta ham xarajat yo‘q. Yo avliyosan, yo hech narsa yozmayapsan.',
      'Bo‘m-bo‘sh. Nol xarajat. Mehmon kelishidan oldingi uydek shubhali toza.'
    ],
    // {spent} {count} {days}
    month_open: [
      '{days} kunda {spent}, {count} ta xarajat. Qani, ko‘raylik.',
      '{count} ta xarajat, jami {spent} — atigi {days} kunda. Ta’sirli. Yaxshi ma’noda emas.',
      'Jami: {days} kunda {spent}. Qulayroq o‘tir, biroz og‘riydi.'
    ],
    // {category} {sum} {share}
    month_top: [
      'Davrning asl muhabbati: «{category}» — {sum}, barcha xarajatlarning {share}%.',
      '«{category}» pulni yeb qo‘ydi — {sum}, ya’ni {share}%. Qolgan kategoriyalarga sarqit qoldi.',
      'Poygada yetakchi: «{category}», {sum}. Raqobatsiz.'
    ],
    // {amount} {desc}
    month_biggest: [
      'Eng katta xarid: «{desc}», {amount}. Arzigan bo‘lsa kerak.',
      'Davr rekordi: «{desc}», {amount}. Ramkaga solib qo‘y.',
      '«{desc}» uchun {amount} — hamyoningga tushgan eng og‘ir zarba.'
    ],
    // {percent} {amount}
    month_more: [
      'O‘tgan davrning shu kuniga nisbatan {percent}% ko‘p sarflayapsan — ortiqcha {amount}. O‘syapsan. Noto‘g‘ri tomonga.',
      'O‘tgan safarga qaraganda shu kungacha {amount} ko‘p. Shaxsiy inflyatsiyang: {percent}%.',
      'O‘tgan davrga nisbatan {percent}% o‘sish. Reja shu bo‘lsa, ishladi.'
    ],
    month_less: [
      'O‘tgan davrning shu kuniga nisbatan {percent}% kam, {amount} tejalgan. Ko‘zlarimga ishonmayman.',
      'O‘tgan davrga nisbatan {amount} tejalgan. Sen kimsan, bu hamyonning asl egasi qayerda?',
      'O‘tgan davrga nisbatan {percent}% kamaydi. Maqtovmi? Mayli, ozgina.'
    ],
    // {over} {limit} {percent}
    month_budget_over: [
      'Umumiy byudjet {limit} edi, oshiqcha — {over}. Byudjet yig‘ladi, hech kim eshitmadi.',
      'Byudjet: {percent}%. {limit} limit tarixga aylandi.'
    ],
    // {left} {limit} {percent}
    month_budget_ok: [
      '{limit} byudjetdan {left} qoldi. Chidayapsan. Hozircha.',
      'Byudjetning {percent}% sarflandi, zaxirada {left}. Ko‘z tegmasin.'
    ],
    // {count} {sum}
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fastfud, yetkazib berish va boshqa lazzatlar: {count} marta, {sum}. Muzlatgich tushkunlikda.' },
      '{count} ta keraksiz xarid, jami {sum}. Bu zaiflik emas, xobbi.',
      'Har xil bema’nilikka {sum}, {count} ta xaridda. Tejash mumkin edi, lekin kim ham shunday qiladi.'
    ],
    month_verdict_bad: [
      'Hukm: hamyoning siyosiy boshpana so‘rayapti.',
      'Xulosa: pul senda turmaydi. Hatto oyoq kiyimini ham yechmaydi.',
      'Hukm: zo‘r reja. Afsus, reja bo‘lib qoldi.'
    ],
    month_verdict_good: [
      'Hukm: shubhali darajada yaxshi. Davom et, kuzatib turibman.',
      'Xulosa: tanqid qiladigan deyarli narsa yo‘q. Deyarli — chunki bugun saxiyman.',
      'Hukm: yaxshi turibsan. Gerdayma.'
    ]
  },

  // 🔥 Senzurasiz: qo‘pol, lekin nishon — xarajatlar
  savage: {
    morning_good: [
      "Bugungi limit {daily}. Tushgacha hammasini sovurish maqsad emas, oshna.",
      "Kecha rejada qolindi. Voy-bo‘, shunday davom et.",
      "Reja tayyor. Ahmoqlik qilma, ortiqcha sarflama."
    ],
    morning_bad: [
      "Kecha rejadan {over} ortiq. Ey, bugun tejash rejimi.",
      "Kecha rejani unutding. Bugun bunday qilma.",
      "Kecha rejadan oshib ketding. Tormozni bos, oshna."
    ],
    budget_over: [
      'Barakalla, dahoyim, {budget} pachaq bo‘ldi: {limit} limitga {spent}. Oshiqcha {over}. Endi xursandmisan?',
      '«{desc}» uchun {amount} va {budget} jin ursin, tamom. Oshiqcha {over}. Sekin qarsak, ahmoq.',
      'Limitni o‘zing qo‘yding, o‘zing chilparchin qilding: {percent}%. Bu qanaqa sirk o‘zi, e?',
      'Davr tugashiga {days_left} kun bor, {budget} esa allaqachon {over} minusda. Reja — bema’ni, ijro — undan battar.',
      'Limit {limit} edi. Endi {spent}. Bu oshib ketish emas, {percent}% bilan la’nati falokat.',
      '{budget} portladi, oshiqcha {over}. Ajoyib ish, tentak. Chindan.',
      'Bum — {budget} tugadi. Oylikkacha quruq non, nachora.'
    ],
    budget_80: [
      '{budget} {percent}% bo‘ldi. {days_left} kunga {left} qoldi. Omad senga, e.',
      '«{desc}» uchun {amount}, qolgani atigi {left}. Kech bo‘lmasdan tormozni bos, kallavaram.',
      'Byudjet {percent}% to‘ldi, davr hali tugamagan. Masxara qilyapsanmi, jin ursin?',
      'Yana ikkita «{desc}» — va {budget} chippakka chiqadi. {left} qoldi.',
      'Davrning qolgan qismiga {left}. Bu byudjet emas, la’nati omon qolish o‘yini.',
      'Byudjet allaqachon {percent}%. Tormoz degan narsa bor, ahmoq.'
    ],
    allowance: [
      'Bugun {daily} sarflash mumkin edi, sen {spent} sovurding. Ertaga tushlikka havo yeysan.',
      '«{desc}» uchun {amount} — {daily} kunlik limit chippakka chiqdi. {over} ortiqcha.',
      'Kunlik limit: {daily}. Sarflandi: {spent}. Matematika senga emas ekan, e.',
      'Bir kunda {times} kunlik limitni yeb qo‘yding. Ishtahangni qara-yu.',
      'Reja kuniga {daily} edi. Sen «rejaga tupurdim» deb ustiga {over} qo‘shding.',
      'Bugungi limit «{desc}» uchun o‘ldi. Joyi jannatda bo‘lsin, senga esa aql kirsin.',
      '{daily} limit bilan kuniga {spent}. Olimpiya darajasidagi isrofgarchilik, jin ursin.'
    ],
    challenge: [
      '«{category}»siz haftang {days} kun chidadi. Iroda darajasi: «tupurdim».',
      '«{category}»siz bir hafta va’da bergan eding. O‘sha va’da {amount} turdi. Va’dabozsan.',
      '«{desc}» uchun {amount} va «{category}» chellenji chippakka chiqdi. Hatto ajablanmadim.',
      '«{desc}» oldida sinding. «{category}»siz bir hafta juda uzunlik qildimi, e?',
      'Iroda: {days} kun. Taslim narxi: {amount}. Uyat.',
      '«{category}» chellenji o‘ldi. Hech bo‘lmasa «{desc}» zo‘r chiqqandir, jin ursin.'
    ],
    impulse: [
      '«{desc}» uchun {amount} — odatdagidan {times} barobar ko‘p. O‘zingni kim deb o‘ylayapsan, millionermi?',
      'Odatda {median} atrofida sarflaysan, keyin bam — «{desc}» uchun {amount}. Seni pulga kim yaqinlashtirdi, e?',
      'Barakalla, ahmoq. «{desc}» uchun {amount}. Xursandmisan?',
      'Bir martada {cat_times} ta odatdagi «{category}» xaridi. Boyvachcha bo‘lib qoldingmi?',
      'Bir zarbada «{desc}» uchun {amount}. Impuls: bor. Miya: yo‘q.',
      '«{desc}», {amount}. Bir haftadan keyin qarab «buni nimaga oldim, jin ursin?» deysan. Men hozirdan deyapman.',
      'Odatdagidan {times} barobar ko‘p. Butunlay aqldan ozibsan.'
    ],
    junk: [
      'Barakalla, tentak: foydali narsa o‘rniga «{desc}» uchun {amount}. Xursandmisan?',
      '«{desc}» — bu davrda {count}-marta, jami {sum}. Barqaror bema’nilik. Hurmat.',
      '«{desc}» uchun yana {amount}. Shu ketishda bu bema’nilik uchun kredit olasan.',
      'Bu davrda «{desc}» va shunga o‘xshash axlatga {sum}. Keyin «pulim qayoqqa ketyapti», a?',
      'Yana «{desc}»mi? {count}-marta, bas qil-e. Bu endi xarid emas, an’ana.',
      '«{desc}» uchun yana {amount} sovurding. Hamyoning boshpana so‘rab ariza yozdi.'
    ],
    junk_fastfood: [
      'Barakalla, kallavaram — oziq-ovqat o‘rniga «{desc}» uchun {amount}. Xursandmisan?',
      'Bu davrda {count}-fastfud, jami {sum}. Plita bezak uchunmi, e?'
    ],
    junk_delivery: [
      'Yetkazib berish uchun {amount}. Kuryer isming bilan tanishdi, hamyoning esa seni la’natlayapti.',
      'Bu davrda {count}-yetkazib berish, jami {sum}. Oshxona besh qadam narida-ku, dangasa.'
    ],
    junk_alcohol: [
      '«{desc}» uchun {amount}. Bu davrda {count}-marta — bazm emas, la’nati a’zolik.',
      '«{desc}» — {amount}. Bu davrda {sum} ichib yubording. Kayfing chog‘, a?'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. Bu davrda {sum} tutunga uchdi. Dahoyona, jin ursin.',
      '«{desc}» uchun {amount}. Pulni tom ma’noda yoqib yuboryapsan, e.'
    ],
    junk_energy: [
      'Energetik uchun {amount}. Energiya: mo‘l. Pul: nol.',
      'Bu davrda {count}-banka, jami {sum}. Bir kechki ovqat narxiga bedorlik, tentak.'
    ],
    junk_taxi: [
      'Taksi uchun {amount}. Oyoqlar bezak uchunmi, e?',
      'Bu davrda {count}-taksi, jami {sum}. La’nati mashina olib qo‘ya qolsang bo‘lardi.'
    ],
    week_more: [
      'Bu hafta odatdagidan {percent}% qimmat, ortiqcha {amount}. Nimani bayram qilyapmiz, e?',
      'Oddiy haftadan {amount} ko‘p. Pul ariqqa oqyapti, xuddi biror joyga shoshayotgandek.',
      'Bu hafta {total}, me’yordan {percent}% yuqori. Zo‘r trend, jin ursin, xabar berib tur.',
      '{amount} qimmatroq hafta. Tormozing qayerda, kallavaram?'
    ],
    week_less: [
      'Bu hafta odatdagidan {percent}% arzon. Voy-bo‘. Rostdan hammasini yozdingmi?',
      'Oddiy haftadan {amount} kam. E, uddalading-ku. Ishonmayman, lekin hurmat.',
      '{amount} tejading. Gerdayma, dam olish kunlari hammasini sovuradi.',
      'Bu hafta {total}, odatdagidan {percent}% kam. Sen kimsan, e, asl isrofgar qayerda?'
    ],
    week_same: [
      'Odatdagi hafta: {total}. O‘sha-o‘sha bema’nilik, barqaror.',
      'Na yaxshi, na yomon. So‘kadigan narsa yo‘q. Deyarli.',
      '{total} — har doimgidek. La’nati dushanbadek oldindan ma’lum.'
    ],
    month_empty: [
      'Bu davrda birorta xarajat yo‘q. Yo avliyosan, yo hech balo yozmayapsan.',
      'Bo‘m-bo‘sh. Nol xarajat. Bunga bir soniya ham ishonmayman.'
    ],
    month_open: [
      '{days} kunda {spent}, {count} ta xarajat. Qani, bu sharmandalikni titkilaylik.',
      '{count} ta xarajat, jami {spent} — atigi {days} kunda. Voy-bo‘.',
      'Jami: {days} kunda {spent}. Tayyorlan, og‘riydi.'
    ],
    month_top: [
      'Davrning asl muhabbati: «{category}» — {sum}, barcha xarajatlarning {share}%. Voy, ishqibozsan-ku.',
      '«{category}» pulni yutib yubordi — {sum}, ya’ni {share}%. Qolganlarga hech balo qolmadi.',
      'Poygada yetakchi: «{category}», {sum}. Boshqalarning la’nati imkoni ham yo‘q edi.'
    ],
    month_biggest: [
      'Davrning eng qimmat bema’niligi: «{desc}», {amount}. Arzigandir.',
      'Davr rekordi: «{desc}», {amount}. Bu axlatni ramkaga sol.',
      '«{desc}» uchun {amount} — hamyonga eng og‘ir zarba. Bam, pul yo‘q.'
    ],
    month_more: [
      'O‘tgan davrning shu kuniga nisbatan {percent}% ko‘p — {amount} ortiqcha. O‘syapsan, e. Noto‘g‘ri tomonga.',
      'O‘tgan safarga qaraganda {amount} ko‘p. Shaxsiy inflyatsiya {percent}%, voy-bo‘.',
      'O‘tgan davrga nisbatan {percent}% o‘sish. Reja shu bo‘lsa, reja bema’ni.'
    ],
    month_less: [
      'O‘tgan davrning shu kuniga nisbatan {percent}% kam, {amount} tejalgan. Voy-bo‘, ishonmayman.',
      'O‘tgan davrga nisbatan {amount} tejalgan. E. Sen kimsan, hamyonning asl egasi qayerda?',
      'O‘tgan davrga nisbatan {percent}% kamaydi. Maqtovmi? Mayli, e, barakalla.'
    ],
    month_budget_over: [
      'Umumiy byudjet {limit} edi, oshiqcha — {over}. Byudjet baqirdi, hech kimga farqi yo‘q.',
      'Byudjet: {percent}%. {limit} limit jin ursin, tamom.'
    ],
    month_budget_ok: [
      '{limit} byudjetdan {left} qoldi. Chidayapsan, lekin ko‘zim senda, e.',
      'Byudjetning {percent}% ketdi, zaxirada {left}. Tag‘in buzib qo‘yma.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fastfud, yetkazib berish va boshqa axlat: {count} marta, {sum}. Muzlatgichning jahli chiqqan.' },
      '{count} ta keraksiz xarid, jami {sum}. Zaiflik emas — la’nati turmush tarzi.',
      'Har xil bema’nilikka {sum}, {count} ta xaridda. Tejash mumkin edi, lekin senga nima, a?'
    ],
    month_verdict_bad: [
      'Hukm: hamyoning abgor, siyosiy boshpana so‘rayapti.',
      'Xulosa: pul kiradi-yu, darrov «xayr, ahmoq» deb chiqib ketadi.',
      'Hukm: reja zo‘r edi, e. Afsus, reja bo‘lib qoldi.'
    ],
    month_verdict_good: [
      'Hukm: shubhali darajada yaxshi, jin ursin. Davom et, kuzatyapman.',
      'Xulosa: so‘kadigan deyarli narsa yo‘q. Deyarli.',
      'Hukm: xo‘jayindek turibsan. Gerdayma.'
    ]
  }
};
