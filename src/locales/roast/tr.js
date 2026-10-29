// «😈 Acımasız mod» — турецкий. Синтаксис шаблонов (utils/roast.js): {param}; {n#форма} — слово по числу
// (в турецком после числа множественного числа нет, поэтому не используется). Язык без рода — токенов {м|ж} нет.
// К подстановкам не приклеиваем падежные аффиксы (гармония гласных зависит от значения) — только послелоги.
// Процент по-турецки пишется перед числом: %{percent}. Markdown в шаблонах не используется (никаких * _ ` [).
module.exports = {
  labels: {
    total_budget: 'toplam bütçen',
    category_budget: '«{category}» bütçen'
  },

  // 🌶 Acı: küfürsüz iğneleme
  spicy: {
    morning_good: [
      "Bugünün limiti {daily}. Bu bir meydan okuma değil, rica.",
      "Plan hazır. Zor olan, yokmuş gibi davranmamak.",
      "Dün planda kaldı. Cüzdan tekrarını umuyor."
    ],
    morning_bad: [
      "Dün plandan {over} fazla. Bugün telafi günü.",
      "Plan dün kaybetti. Rövanş bugün, siparişsiz.",
      "Dün cüzdan plandan hızlı eridi. Bugün yavaş."
    ],
    // {budget} {limit} {spent} {over} {percent} {amount} {desc} {days_left}
    budget_over: [
      '{budget} bitti: {limit} limitle {spent} harcadın. Aşım: {over}. Demek ki limit sadece bir öneriymiş.',
      '«{desc}» için {amount} — ve {budget} resmen öldü. Bir dakikalık saygı duruşu lütfen.',
      'Tebrikler, limiti {over} farkla geçtin. Keşke bu rekorla övünülebilseydi.',
      'Dönemin bitmesine {days_left} gün var, {budget} ise şimdiden {over} ekside. Cesur strateji.',
      '{limit} limitini kendin koydun. Sonra da {over} farkla üstünden geçtin. Sözünü tutan biri varsa o da sen değilsin.',
      '{budget}: %{percent}. Yüzde yüz sıkıcı insanlar için, değil mi?',
      'Bütçe {limit} idi. İdi. Şimdi {spent} ve bütçe artık güzel bir anı.'
    ],
    // {budget} {limit} {spent} {left} {percent} {amount} {desc} {days_left}
    budget_80: [
      '{budget} şimdiden %{percent}. {days_left} gün için {left} kaldı. Bol şans, lazım olacak.',
      '«{desc}» için {amount} — limite sadece {left} kaldı. Tasarrufa başlamanın tam zamanı. Dün.',
      'Limite yapıştın: %{percent}. İki «{desc}» daha ve oyun biter.',
      'Dönemin geri kalanı için {left}. Bu artık bütçe değil, hayatta kalma oyunu.',
      'Limite sadece {left} kaldı. «{desc}» buna değdi mi bari?',
      'Bütçe %{percent} doldu, dönem ise daha bitmedi. Sıralamada bir sorun var gibi.'
    ],
    // {daily} {spent} {over} {amount} {desc} {times}
    allowance: [
      'Bugünün limiti: {daily}. Harcanan: {spent}. Yarın şimdiden bugünün borcunu ödüyor.',
      'Bugün {daily} harcayabilirdin, {spent} gitti. {over} fazlası yarından kesilecek.',
      '«{desc}» için {amount} — ve {daily} günlük limit tarih oldu. Planla birlikte.',
      'Tek seferde {times} günlük harçlığı yaktın. Verimlilik desen, var.',
      'Limit {daily} idi. Sen bunu kural değil, ipucu olarak okudun: {spent}.',
      'Günün planı: {daily}. Gerçek: {spent}. Plan iddialıydı ama bu kadar da değil.',
      'Bugünün harçlığı «{desc}» uğruna can verdi. Yarın yeni sayfa, değil mi?'
    ],
    // {category} {days} {amount} {desc}
    challenge: [
      '«{category}» olmadan geçecek haftan {days} gün sürdü. Rekor — ama dünya rekoru değil.',
      'Kendine «{category}» olmadan bir hafta sözü verdin. Sözün bedeli: {amount}.',
      '«{desc}» için {amount} — ve «{category}» meydan okuması mezarlığı boyladı.',
      'İrade: {days} gün. Teslimiyetin bedeli: {amount}.',
      'Meydan okuma başarısız. Umarım «{desc}» buna değmiştir.',
      '«{desc}» karşısında pes ettin. «{category}» olmadan koca bir hafta — tam yedi gün, ne zor.'
    ],
    // {amount} {desc} {median} {times} {category} {cat_times}
    impulse: [
      '«{desc}» için {amount} — normal harcamanın {times} katı ({median}). Dürtü kayda geçti.',
      'Genelde {median} civarı harcarsın. Şimdi «{desc}» için {amount}. Bir şey mi oldu, yoksa canın mı çekti?',
      'Tek seferde {amount}. Kendinden beklemiyordun, değil mi? Ben de.',
      'Tek hamlede {cat_times} normal «{category}» alışverişi. Ne büyük jest.',
      '«{desc}» için {amount}. Umarım gelecek hafta da bu kadar seversin.',
      'Günün dürtüsel alışverişi: «{desc}», {amount}. Ortalama alışverişin {median}, söylemiş olayım.',
      'Normalden {times} kat pahalı. Bir yerlerde cüzdanın sessizce ağlıyor.'
    ],
    // {amount} {desc} {count} {sum}
    junk: [
      '«{desc}» için {amount}. Bu dönem {count}. kez, toplam {sum}. İstikrar ustalık işaretidir.',
      '«{desc}» — {amount}. Bu dönem {sum} tutan bir alışkanlık. Harika abonelik, saçmalığa olması yazık.',
      'Sürpriz: «{desc}» almak zorunda değilsin. Ama tabii ki aldın.',
      'Bu dönem {count}. kez. «{desc}» artık sabit gider sayılır.',
      '«{desc}» için yine {amount}. Cüzdanın bunu şikâyet listesine ekledi.',
      '«{desc}» yine sahnede: bu dönem {sum}. O parayla… neyse, boş ver.',
      '«{desc}» için {amount}. Sağlıklı, ucuz, mantıklı… hiçbiri değil.'
    ],
    junk_fastfood: [
      '«{desc}» için {amount} — bu dönem {count}. fast food. Şef olmayacağın kesin.',
      'Bir poşet market alışverişi yerine «{desc}» için {amount}. Lezzetli, hızlı, pahalı.'
    ],
    junk_delivery: [
      '{amount} tutarında sipariş. Kurye yakında seni adınla selamlayacak.',
      'Bu dönem {count}. sipariş, toplam {sum}. Ocak sadece dekor mu?'
    ],
    junk_alcohol: [
      '«{desc}» için {amount}. Bu dönem {count}. kez — bu parti değil, üyelik.',
      '«{desc}» — {amount}. Fişlere bakılırsa her gün bayram.'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. Bu dönem {sum}, kelimenin tam anlamıyla duman oldu.',
      '«{desc}» için {amount}. Meğer para da içilebiliyormuş.'
    ],
    junk_energy: [
      '{amount} tutarında enerji içeceği. Enerji arttı, para azaldı.',
      'Bu dönem {count}. kutu, toplam {sum}. Uyanık kalmak pahalı iş.'
    ],
    junk_taxi: [
      'Taksiye {amount}. Bacaklar galiba süs için.',
      'Bu dönem {count}. taksi, toplam {sum}. Biraz daha ve araba almak ucuza gelecekti.'
    ],
    // {total} {percent} {amount}
    week_more: [
      'Bu hafta normalden %{percent} pahalı geçti — fazladan {amount}. Krallar gibi yaşıyoruz.',
      'Normal bir haftadan {amount} fazla. Ya bir şey kutladın ya da… yok, kutladın.',
      'Bu hafta {total}, normalin %{percent} üstü. Trend canlı. Cüzdan değil.',
      'Normalden {amount} pahalı bir hafta. Pazartesi sana ters ters bakıyor.'
    ],
    week_less: [
      'Bu hafta normalden %{percent} ucuz. Şüpheli. Her şeyi yazdın mı?',
      'Normal bir haftadan {amount} az. İnanmıyorum ama hoşuma gitti.',
      '{amount} tasarruf. Gevşeme, hafta sonu peşinde.',
      'Bu hafta {total}, normalin %{percent} altı. Sen kimsin ve o savurganı ne yaptın?'
    ],
    week_same: [
      'Her zamanki gibi bir hafta: {total}. İstikrar da bir sonuçtur. Sıkıcı ama yine de.',
      'Ne daha iyi ne daha kötü. Laf sokacak bir şey yok. Neredeyse.',
      '{total} — tıpkı her zamanki gibi. Çalar saat kadar tahmin edilebilir.'
    ],
    month_empty: [
      'Bu dönem tek bir harcama yok. Ya azizsin ya da hiçbir şey yazmıyorsun.',
      'Bomboş. Sıfır harcama. Misafir gelmeden hemen önceki ev kadar şüpheli temiz.'
    ],
    // {spent} {count} {days}
    month_open: [
      '{days} günde {spent}, {count} harcama. Bir bakalım.',
      'Sadece {days} günde {spent} tutarında {count} harcama. Etkileyici. İyi anlamda değil.',
      'Toplam: {days} günde {spent}. Rahat otur, biraz acıtacak.'
    ],
    // {category} {sum} {share}
    month_top: [
      'Dönemin gerçek aşkı: «{category}» — {sum}, toplamdaki payı %{share}.',
      '«{category}» paranın %{share} kadarını yedi — {sum}. Diğer kategorilere kırıntılar kaldı.',
      'Yarışın lideri: {sum} ile «{category}». Rakip yok.'
    ],
    // {amount} {desc}
    month_biggest: [
      'En büyük alışveriş: «{desc}», {amount}. Umarım değmiştir.',
      'Dönemin rekoru: «{desc}», {amount}. Çerçeveletip duvara as.',
      '«{desc}» için {amount} — cüzdanına inen en ağır darbe.'
    ],
    // {percent} {amount}
    month_more: [
      'Geçen dönemin aynı gününe göre %{percent} fazla harcıyorsun — fazladan {amount}. Büyüyorsun. Yanlış yöne.',
      'Geçen sefere göre bugüne kadar {amount} fazla. Kişisel enflasyonun: %{percent}.',
      'Geçen döneme göre %{percent} artış. Plan buysa, işe yaradı.'
    ],
    month_less: [
      'Geçen dönemin aynı gününe göre %{percent} az, {amount} tasarruf. Gözlerime inanamıyorum.',
      'Geçen döneme göre {amount} tasarruf. Sen kimsin, bu cüzdanın gerçek sahibi nerede?',
      'Geçen döneme göre %{percent} düşüş. Övgü mü? Peki, birazcık.'
    ],
    // {over} {limit} {percent}
    month_budget_over: [
      '{limit} toplam bütçe {over} aşıldı. Bütçe ağladı, kimse dinlemedi.',
      'Bütçe: %{percent}. {limit} limiti tarih oldu.'
    ],
    // {left} {limit} {percent}
    month_budget_ok: [
      '{limit} bütçeden {left} kaldı. Dayanıyorsun. Şimdilik.',
      'Bütçenin %{percent} kadarı harcandı, {left} yedekte. Nazar değmesin.'
    ],
    // {count} {sum}
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast food, sipariş ve diğer keyifler: {count} kez, {sum}. Buzdolabın depresyonda.' },
      '{sum} tutarında {count} gereksiz alışveriş. Bu zaaf değil, hobi.',
      '{count} alışverişte çeşit çeşit saçmalığa {sum}. Biriktirebilirdin ama kim yapar ki.'
    ],
    month_verdict_bad: [
      'Karar: cüzdanın siyasi sığınma talep ediyor.',
      'Sonuç: para sende durmuyor. Ayakkabılarını bile çıkarmıyor.',
      'Karar: harika plan. Plan olarak kalması yazık.'
    ],
    month_verdict_good: [
      'Karar: şüphe uyandıracak kadar düzgün. Devam et, izliyorum.',
      'Sonuç: laf sokacak neredeyse bir şey yok. Neredeyse — çünkü bugün cömertim.',
      'Karar: iyi gidiyorsun. Şımarma.'
    ]
  },

  // 🔥 Sansürsüz: küfürlü, ama hedef harcamalar
  savage: {
    morning_good: [
      "Bugünün limiti {daily}. Öğlene kadar hepsini çarçur etmek hedef değil, lan.",
      "Dün planda kaldı. Vay be, böyle devam.",
      "Plan hazır. Saçmalama, fazla harcama yeter."
    ],
    morning_bad: [
      "Dün plandan {over} fazla. Kahretsin, bugün tasarruf modu.",
      "Dün planı siktir ettin. Bugün yapma.",
      "Dün planı aştın. Fren yap, lan."
    ],
    budget_over: [
      'Aferin dâhi, {budget} bitti: {limit} limite karşı {spent}. Aşım {over}. Mutlu musun şimdi?',
      '«{desc}» için {amount} ve {budget} boka sardı. Aşım {over}. Yavaş alkış, lan.',
      'Limiti kendin koydun, sonra kendin içine ettin: %{percent}. Ne biçim sirk bu be.',
      'Dönemin bitmesine {days_left} gün var, {budget} şimdiden {over} ekside. Plan bok, uygulama daha beter.',
      'Limit {limit} idi. Şimdi {spent}. Bu aşım değil, %{percent} ile düpedüz felaket amk.',
      '{budget} patladı, aşım {over}. Muhteşem iş, gerizekalı. Gerçekten.',
      'Bum — {budget} bitti. Maaşa kadar kuru ekmek artık, ne yapalım.'
    ],
    budget_80: [
      '{budget} %{percent} oldu. {days_left} gün için {left} kaldı. Bol şans be.',
      '«{desc}» için {amount}, kalan sadece {left}. Geç olmadan frene bas lan.',
      'Bütçe %{percent} doldu, dönem daha bitmedi. Dalga mı geçiyorsun amk?',
      'İki «{desc}» daha ve {budget} sıçar. {left} kaldı.',
      'Dönemin geri kalanı için {left}. Bu bütçe değil, lanet olası bir hayatta kalma oyunu.',
      'Bütçe şimdiden %{percent}. Fren diye bir şey var, salak.'
    ],
    allowance: [
      'Bugün {daily} harcayabilirdin, {spent} gömdün. Yarın öğle yemeğinde hava yersin.',
      '«{desc}» için {amount} — {daily} günlük limit boka sardı. {over} fazla.',
      'Günlük limit: {daily}. Harcanan: {spent}. Matematik senin işin değil be.',
      'Bir günde {times} günlük harçlığı yedin. Ne iştah lan.',
      'Plan günde {daily} idi. Sen «siktir et planı» deyip üstüne {over} koydun.',
      'Bugünün harçlığı «{desc}» uğruna gitti. Mekânı cennet olsun, senin aklın da bir gelsin artık.',
      '{daily} harçlıkla günde {spent}. Olimpik düzeyde savurganlık amk.'
    ],
    challenge: [
      '«{category}» olmadan geçecek haftan {days} gün sürdü. İrade seviyesi: «siktir et».',
      '«{category}» olmadan bir hafta sözü verdin. O sözün bedeli {amount}. Palavracı.',
      '«{desc}» için {amount} ve «{category}» meydan okuması sıçtı. Şaşırmadım bile.',
      '«{desc}» karşısında çöktün. «{category}» olmadan bir hafta fazla mı uzun geldi lan?',
      'İrade: {days} gün. Teslimiyetin bedeli: {amount}. Rezalet.',
      '«{category}» meydan okuması öldü. Umarım «{desc}» bari çok iyiydi be.'
    ],
    impulse: [
      '«{desc}» için {amount} — normalin {times} katı. Kendini ne sanıyorsun lan, milyoner mi?',
      'Genelde {median} civarı harcarsın, sonra bam — «{desc}» için {amount}. Seni paraya kim yaklaştırdı be?',
      'Helal olsun salak. «{desc}» için {amount}. Mutlu musun?',
      'Tek seferde {cat_times} normal «{category}» alışverişi. Kodaman mı oldun be?',
      '«{desc}» için tek hamlede {amount}. Dürtü: var. Beyin: yok.',
      '«{desc}», {amount}. Gelecek hafta bakıp «ne sikime aldım bunu» diyeceksin. Ben şimdiden diyorum.',
      'Normalin {times} katı. Tamamen kafayı yemişsin.'
    ],
    junk: [
      'Helal olsun gerizekalı: işe yarar bir şey yerine «{desc}» için {amount}. Mutlu musun?',
      '«{desc}» — bu dönem {count}. kez, toplam {sum}. İstikrarlı bir boktanlık. Saygılar.',
      '«{desc}» için yine {amount}. Bu gidişle bu zırvalık için kredi çekeceksin.',
      'Bu dönem «{desc}» ve benzeri saçmalıklara {sum}. Sonra da «param nereye gidiyor», di mi?',
      'Yine mi «{desc}»? {count}. kez, yeter be. Bu artık alışveriş değil, gelenek.',
      '«{desc}» için yine {amount} gömdün. Cüzdanın sığınma başvurusu yaptı.'
    ],
    junk_fastfood: [
      'Aferin salak — market alışverişi yerine «{desc}» için {amount}. Mutlu musun?',
      'Bu dönem {count}. fast food, toplam {sum}. Ocak süs mü lan?'
    ],
    junk_delivery: [
      '{amount} tutarında sipariş. Kurye adını biliyor, cüzdanın da sana siktir git demek istiyor.',
      'Bu dönem {count}. sipariş, toplam {sum}. Mutfak beş metre ötede be.'
    ],
    junk_alcohol: [
      '«{desc}» için {amount}. Bu dönem {count}. kez — parti değil, lanet bir üyelik.',
      '«{desc}» — {amount}. Bu dönem {sum} içip gittin. Keyfin yerinde ha.'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. Bu dönem {sum} resmen duman oldu. Dâhiyane amk.',
      '«{desc}» için {amount}. Parayı düpedüz yakıyorsun be.'
    ],
    junk_energy: [
      '{amount} tutarında enerji içeceği. Enerji: bol. Para: sıfır.',
      'Bu dönem {count}. kutu, toplam {sum}. Akşam yemeği parasına uyanıklık, lan.'
    ],
    junk_taxi: [
      'Taksiye {amount}. Bacaklar süs mü lan?',
      'Bu dönem {count}. taksi, toplam {sum}. Keşke lanet olası bir araba alsaydın.'
    ],
    week_more: [
      'Bu hafta normalden %{percent} pahalı, fazladan {amount}. Neyi kutluyoruz be?',
      'Normal bir haftadan {amount} fazla. Para lağıma akıyor, sanki bir yere yetişecek.',
      'Bu hafta {total}, normalin %{percent} üstü. Muhteşem trend amk, haber ver.',
      '{amount} daha pahalı bir hafta. Frenin nerede lan?'
    ],
    week_less: [
      'Bu hafta normalden %{percent} ucuz. Vay anasını. Gerçekten her şeyi yazdın mı?',
      'Normal bir haftadan {amount} az. Lan, başardın. İnanmıyorum ama saygı.',
      '{amount} tasarruf. Şımarma, hafta sonu hepsinin içine edecek.',
      'Bu hafta {total}, normalin %{percent} altı. Sen kimsin lan, asıl savurgan nerede?'
    ],
    week_same: [
      'Aynı bok, farklı hafta: {total}. İstikrarlı.',
      'Ne iyi ne kötü. Sövecek bir şey yok. Neredeyse.',
      '{total} — her zamanki gibi. Lanet bir pazartesi kadar tahmin edilebilir.'
    ],
    month_empty: [
      'Bu dönem tek harcama yok. Ya azizsin ya da hiçbir bok yazmıyorsun.',
      'Bomboş. Sıfır harcama. Bunu bir saniye bile yemem.'
    ],
    month_open: [
      '{days} günde {spent}, {count} harcama. Hadi bu rezalete bir bakalım.',
      'Sadece {days} günde {spent} tutarında {count} harcama. Vay anasını.',
      'Toplam: {days} günde {spent}. Hazır ol, canın yanacak.'
    ],
    month_top: [
      'Dönemin gerçek aşkı: «{category}» — {sum}, toplamdaki payı %{share}. Vay be, resmen hayransın.',
      '«{category}» paranın %{share} kadarını yuttu — {sum}. Gerisine koca bir hiç kaldı.',
      'Yarışın lideri: {sum} ile «{category}». Kimsenin lanet bir şansı yoktu.'
    ],
    month_biggest: [
      'Dönemin en pahalı zırvalığı: «{desc}», {amount}. Umarım değmiştir.',
      'Dönemin rekoru: «{desc}», {amount}. Çerçevele bu boku.',
      '«{desc}» için {amount} — cüzdana inen en ağır darbe. Bam, para yok.'
    ],
    month_more: [
      'Geçen dönemin aynı gününe göre %{percent} fazla — {amount} öndesin. Büyüyorsun be. Yanlış yöne.',
      'Geçen seferden {amount} fazla. %{percent} kişisel enflasyon, vay anasını.',
      'Geçen döneme göre %{percent} artış. Plan buysa, plan berbat.'
    ],
    month_less: [
      'Geçen dönemin aynı gününe göre %{percent} az, {amount} tasarruf. Vay anasını, inanamıyorum.',
      'Geçen döneme göre {amount} tasarruf. Lan. Sen kimsin, cüzdanın asıl sahibi nerede?',
      'Geçen döneme göre %{percent} düşüş. Övgü mü? Tamam be, aferin.'
    ],
    month_budget_over: [
      '{limit} toplam bütçe {over} aşıldı. Bütçe bağırdı, kimsenin umurunda olmadı.',
      'Bütçe: %{percent}. {limit} limiti siktirip gitti.'
    ],
    month_budget_ok: [
      '{limit} bütçeden {left} kaldı. Dayanıyorsun ama gözüm üstünde lan.',
      'Bütçenin %{percent} kadarı gitti, {left} yedekte. Sakın batırma.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast food, sipariş ve diğer zırvalıklar: {count} kez, {sum}. Buzdolabın kudurmuş.' },
      '{sum} tutarında {count} gereksiz alışveriş. Zaaf değil, lanet bir yaşam tarzı.',
      '{count} alışverişte çeşit çeşit saçmalığa {sum}. Biriktirebilirdin ama ne gerek var, di mi be.'
    ],
    month_verdict_bad: [
      'Karar: cüzdanın sıçmış durumda, siyasi sığınma istiyor.',
      'Sonuç: para geliyor ve anında siktirip gidiyor.',
      'Karar: plan sağlamdı be. Plan olarak kalması yazık.'
    ],
    month_verdict_good: [
      'Karar: şüphe uyandıracak kadar düzgün, lan. Devam, izliyorum.',
      'Sonuç: sövecek neredeyse bir şey yok. Neredeyse.',
      'Karar: patron gibi dayanıyorsun. Şımarma.'
    ]
  }
};
