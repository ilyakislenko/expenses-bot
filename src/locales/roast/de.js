// «😈 Roast-Modus» — немецкий. Синтаксис шаблонов (utils/roast.js): {param}; {м|ж} — форма по полу
// (не показывается тем, кто выбрал «не скажу»); {м|ж|без рода}; {n#одна|много} — слово по числу.
// Обращение на «du». {budget} — только в позициях Nominativ/Akkusativ («dein … Budget»).
// Markdown в шаблонах не используется (никаких * _ ` [).
module.exports = {
  labels: {
    total_budget: 'dein Gesamtbudget',
    category_budget: 'dein Budget für «{category}»'
  },

  // 🌶 Scharf: сарказм без мата
  spicy: {
    morning_good: [
      "Heutiges Limit: {daily}. Keine Herausforderung, eine Bitte.",
      "Der Plan steht. Schwer ist nur, ihn nicht zu ignorieren.",
      "Gestern im Plan. Dein Geldbeutel hofft vorsichtig auf eine Wiederholung."
    ],
    morning_bad: [
      "Gestern {over} über dem Plan. Heute ist Tag der Wiedergutmachung.",
      "Der Plan hat gestern verloren. Revanche heute, ohne Lieferdienst.",
      "Gestern ist der Geldbeutel schneller geschrumpft als geplant. Heute ruhiger."
    ],
    budget_over: [
      'Und das war’s: {spent} bei einem Limit von {limit}, also {over} drüber. Das Limit war wohl nur eine Empfehlung.',
      '«{desc}» für {amount}, und {budget} ist offiziell hinüber. Eine Schweigeminute, bitte.',
      'Glückwunsch, du hast {budget} um {over} gesprengt. Schade, dass man mit so einem Rekord nicht angeben kann.',
      'Noch {days_left} {days_left#Tag|Tage} bis zum Periodenende, und {budget} ist schon {over} im Minus. Mutige Strategie.',
      'Das Limit von {limit} hast du selbst festgelegt. Und dann selbst drübergetrampelt, um {over}. Wenigstens einer hält sein Wort… ach nee.',
      'Budget bei {percent} %. Hundert Prozent sind was für Langweiler, oder?',
      'Das Budget war {limit}. War. Jetzt sind es {spent}, und das Budget ist nur noch eine schöne Erinnerung.'
    ],
    budget_80: [
      '{budget} steht bei {percent} %. Noch {left} für {days_left} {days_left#Tag|Tage}. Viel Glück, du wirst es brauchen.',
      '«{desc}» für {amount}, und bis zum Limit bleiben nur noch {left}. Perfekter Zeitpunkt zum Sparen. Gestern.',
      'Du kuschelst schon mit dem Limit: {percent} %. Noch zwei «{desc}» und Game over.',
      '{left} für den Rest der Periode. Das ist kein Budget mehr, das ist ein Survival-Game.',
      'Nur noch {left} übrig. Sicher, dass «{desc}» das wert war?',
      '{percent} % des Budgets liegen hinter dir, die Periode aber noch nicht. Interessante Reihenfolge.'
    ],
    allowance: [
      'Limit für heute: {daily}. Ausgegeben: {spent}. Morgen bezahlt schon für heute.',
      'Heute waren {daily} drin, weg sind {spent}. {over} drüber, das spürst du morgen.',
      '«{desc}» für {amount}, und das Tageslimit von {daily} ist Geschichte. Der Plan auch.',
      'Du hast das Budget von {times} Tagen auf einen Schlag verbrannt. Effizient, das muss man dir lassen.',
      'Das Limit war {daily}. Du hast es als Tipp verstanden, nicht als Regel: {spent}.',
      'Plan für heute: {daily}. Realität: {spent}. Der Plan war ehrgeizig, aber so ehrgeizig nun auch wieder nicht.',
      'Das heutige Budget ist an «{desc}» gestorben. Morgen neuer Versuch, ja?'
    ],
    challenge: [
      'Deine Woche ohne «{category}» hat {days} {days#Tag|Tage} gehalten. Ein Rekord, nur kein Weltrekord.',
      'Du hast dir eine Woche ohne «{category}» versprochen. Das Versprechen hat {amount} gekostet.',
      '«{desc}» für {amount}, und die Challenge «{category}» landet auf dem Challenge-Friedhof.',
      'Willenskraft: {days} {days#Tag|Tage}. Preis der Kapitulation: {amount}.',
      'Challenge verloren. Hoffentlich war «{desc}» das wenigstens wert.',
      'Bei «{desc}» eingeknickt. Eine Woche ohne «{category}», klar, ganze sieben Tage, unmenschlich lang.'
    ],
    impulse: [
      '«{desc}» für {amount}, {times}× so viel wie deine übliche Ausgabe ({median}). Impuls notiert.',
      'Normalerweise gibst du so um die {median} aus. Und jetzt {amount} für «{desc}». Ist was passiert, oder einfach Lust drauf?',
      '{amount} auf einen Schlag. Hast du dir selbst nicht zugetraut? Ich auch nicht.',
      'Das sind {cat_times} deiner üblichen «{category}»-Käufe auf einmal. Große Geste.',
      '«{desc}» für {amount}. Hoffentlich liebst du es nächste Woche immer noch.',
      'Impulskauf des Tages: «{desc}», {amount}. Dein Median liegt übrigens bei {median}.',
      '{times}× teurer als sonst. Irgendwo weint dein Geldbeutel leise vor sich hin.'
    ],
    junk: [
      '«{desc}» für {amount}. Schon {count}-mal diese Periode, {sum} insgesamt. Beständigkeit ist eine Tugend.',
      '«{desc}»: {amount}. Eine Gewohnheit für {sum} diese Periode. Tolles Abo, nur leider für Unsinn.',
      'Plot-Twist: Du musst «{desc}» nicht kaufen. Hast du aber natürlich.',
      'Schon {count}-mal diese Periode. «{desc}» ist inzwischen quasi ein Fixkostenposten.',
      'Wieder {amount} für «{desc}». Dein Geldbeutel hat es auf seine Beschwerdeliste gesetzt.',
      '«{desc}» schlägt wieder zu: {sum} diese Periode. Von dem Geld hätte man… ach, vergiss es.'
    ],
    junk_fastfood: [
      '«{desc}» für {amount}. Schon {count}-mal Fast Food diese Periode. Eine Kochkarriere wird das nicht.',
      'Fast Food: {sum} diese Periode. Dein Kühlschrank ist beleidigt und redet nicht mehr mit dir.'
    ],
    junk_delivery: [
      'Lieferung für {amount}. Bald begrüßt dich der Kurier mit Vornamen.',
      '{count} {count#Lieferung|Lieferungen} diese Periode, {sum} insgesamt. Ist der Herd nur Deko?'
    ],
    junk_alcohol: [
      '«{desc}» für {amount}. Schon {count}-mal diese Periode: Das ist keine Party mehr, das ist eine Mitgliedschaft.',
      '«{desc}»: {amount}. Den Kassenbons nach ist bei dir das ganze Jahr Feiertag.'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} diese Periode, buchstäblich in Rauch aufgelöst.',
      '{amount} für «{desc}». Geld kann man also auch rauchen.'
    ],
    junk_energy: [
      'Energy Drink für {amount}. Mehr Energie, weniger Geld.',
      '{count} {count#Dose|Dosen} diese Periode, {sum} insgesamt. Wachsein ist heutzutage teuer.'
    ],
    junk_taxi: [
      'Taxi für {amount}. Beine sind offenbar nur Deko.',
      '{count} {count#Taxifahrt|Taxifahrten} diese Periode, {sum} insgesamt. Noch ein bisschen, und ein Auto wäre billiger gewesen.'
    ],
    week_more: [
      'Diese Woche hat {percent} % mehr gekostet als sonst, {amount} extra. Man gönnt sich, wie ich sehe.',
      '{amount} über einer normalen Woche. Entweder hast du gefeiert oder… nein, du hast gefeiert.',
      '{total} diese Woche, {percent} % über normal. Der Trend lebt. Dein Geldbeutel eher nicht.',
      'Eine Woche, {amount} teurer als sonst. Der Montag schaut dich schon schief an.'
    ],
    week_less: [
      'Diese Woche war {percent} % günstiger als sonst. Verdächtig. Hast du alles eingetragen?',
      '{amount} unter einer normalen Woche. Ich glaub’s nicht, aber es gefällt mir.',
      '{amount} gespart. Nicht nachlassen, das Wochenende will es zurück.',
      '{total} diese Woche, {percent} % unter normal. Wer bist du, und was hast du mit dem Big Spender gemacht?'
    ],
    week_same: [
      'Eine Woche wie jede andere: {total}. Stabilität ist auch ein Ergebnis. Ein langweiliges, aber immerhin.',
      'Nicht besser, nicht schlechter als sonst. Nichts zu meckern. Fast.',
      '{total}, genau wie immer. Berechenbar wie ein Wecker.'
    ],
    month_empty: [
      'Keine einzige Ausgabe in dieser Periode. Entweder bist du heilig, oder du trägst einfach nichts ein.',
      'Leer. Null Ausgaben. Verdächtig sauber, wie eine Wohnung kurz bevor Gäste kommen.'
    ],
    month_open: [
      '{spent} in {days} {days#Tag|Tagen}, {count} {count#Ausgabe|Ausgaben}. Schauen wir mal genauer hin.',
      '{count} {count#Ausgabe|Ausgaben} für {spent}, in nur {days} {days#Tag|Tagen}. Beeindruckend. Nicht im guten Sinne.',
      'Gesamt: {spent} in {days} {days#Tag|Tagen}. Mach’s dir bequem, das wird wehtun.'
    ],
    month_top: [
      'Die große Liebe der Periode: «{category}», {sum}, {share} % von allem.',
      '«{category}» hat {share} % des Geldes gefressen, {sum}. Die anderen Kategorien bekamen Reste.',
      'Spitzenreiter: «{category}» mit {sum}. Konkurrenzlos.'
    ],
    month_biggest: [
      'Größter Einkauf: «{desc}» für {amount}. Hoffentlich hat es sich gelohnt.',
      'Rekord der Periode: «{desc}», {amount}. Bitte einrahmen.',
      '«{desc}» für {amount}, der härteste Schlag für deinen Geldbeutel.'
    ],
    month_more: [
      'Verglichen mit demselben Tag der letzten Periode gibst du {percent} % mehr aus, {amount} extra. Wachstum. In die falsche Richtung.',
      '{amount} mehr als letztes Mal zum selben Tag. Deine persönliche Inflation: {percent} %.',
      '{percent} % mehr als in der letzten Periode. Falls das der Plan war: Er hat funktioniert.'
    ],
    month_less: [
      'Verglichen mit demselben Tag der letzten Periode: {percent} % weniger, {amount} gespart. Ich trau meinen Augen nicht.',
      '{amount} gespart gegenüber der letzten Periode. Wer bist du, und wo ist der echte Besitzer dieses Geldbeutels?',
      '{percent} % weniger als in der letzten Periode. Lob? Na gut, ein bisschen.'
    ],
    month_budget_over: [
      'Dein Gesamtbudget von {limit} ist um {over} gesprengt. Das Budget hat geweint, keiner hat zugehört.',
      'Budget: {percent} %. Das Limit von {limit} ist Geschichte.'
    ],
    month_budget_ok: [
      'Von deinem Budget von {limit} sind noch {left} übrig. Hält. Noch.',
      '{percent} % des Budgets ausgegeben, {left} Puffer. Bloß nicht verschreien.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast Food, Lieferdienste und andere Freuden: {count}-mal, {sum}. Dein Kühlschrank fühlt sich ungeliebt.' },
      '{count} {count#Quatschkauf|Quatschkäufe} für {sum}. Das ist keine Schwäche, das ist ein Hobby.',
      '{sum} für allerlei Unsinn bei {count} {count#Einkauf|Einkäufen}. Hätte man sparen können, aber wer macht das schon.'
    ],
    month_verdict_bad: [
      'Urteil: Dein Geldbeutel beantragt politisches Asyl.',
      'Fazit: Geld bleibt bei dir nicht. Es zieht nicht mal die Schuhe aus.',
      'Urteil: Toller Plan. Schade, dass es beim Plan geblieben ist.'
    ],
    month_verdict_good: [
      'Urteil: Verdächtig ordentlich. Weiter so, ich beobachte dich.',
      'Fazit: Kaum was zum Meckern. Kaum, weil ich heute großzügig bin.',
      'Urteil: Hält sich gut. Werd bloß nicht übermütig.'
    ]
  },

  // 🔥 Unzensiert: мат и грубость — по тратам и решениям, без оскорблений по признакам
  savage: {
    morning_good: [
      "Heutiges Limit: {daily}. Alles bis Mittag verballern ist nicht das Ziel, verdammt.",
      "Gestern im Plan. Scheiße, weiter so.",
      "Der Plan steht. Bau keinen Mist, gib einfach nicht mehr aus."
    ],
    morning_bad: [
      "Gestern {over} über dem Plan. Scheiße, heute Sparmodus.",
      "Gestern hast du den Plan zum Teufel geschickt. Heute nicht.",
      "Gestern über den Plan geschossen. Bremsen, verdammt."
    ],
    budget_over: [
      'Stark, du {Vollidiot|Vollidiotin}: {budget} ist im Arsch. {spent} bei {limit}, {over} drüber. Zufrieden?',
      '«{desc}» für {amount}, und {budget} ist gerade den Bach runter. {over} drüber. Applaus, verdammt nochmal.',
      'Du hast das Limit selbst gesetzt und es selbst zerlegt: {percent} %. Was für ein Scheißzirkus.',
      'Noch {days_left} {days_left#Tag|Tage}, und {budget} steckt schon {over} tief in der Scheiße. Plan: Mist. Umsetzung: noch schlimmer.',
      'Das Limit war {limit}. Jetzt sind es {spent}. Das ist keine Überschreitung, das ist eine verdammte Katastrophe bei {percent} %.',
      'Du hast {budget} um {over} gesprengt. Scheißgute Arbeit. Wirklich.',
      'Bumm, {budget} ist tot, {over} drüber. Bis zum Zahltag gibt’s Nudeln mit Ketchup, Alter.'
    ],
    budget_80: [
      '{budget} steht bei {percent} %. Noch {left} für {days_left} {days_left#Tag|Tage}. Viel verdammtes Glück.',
      '«{desc}» für {amount}, und nur noch {left} übrig. Tritt verdammt nochmal auf die Bremse.',
      '{percent} % des Budgets weg, und die Periode ist noch nicht mal vorbei. Willst du mich verarschen?',
      'Noch zwei «{desc}» und {budget} ist im Arsch. Übrig: {left}.',
      '{left} für den Rest der Periode. Das ist kein Budget, das ist ein Scheiß-Überlebenskampf.',
      'Alter, {percent} % schon weg. Bremsen gibt’s nicht zum Spaß, du {Idiot|Idiotin}.'
    ],
    allowance: [
      'Heute waren {daily} drin, und du hast {spent} rausgehauen. Morgen gibt’s Luft zum Mittag.',
      '«{desc}» für {amount}, und das Tageslimit von {daily} ist im Eimer. {over} drüber, Scheiße.',
      'Tageslimit: {daily}. Ausgegeben: {spent}. Mathe ist echt nicht dein verdammtes Ding.',
      'Du hast das Budget von {times} Tagen an einem Tag verballert. Was für ein Scheißappetit.',
      'Der Plan war {daily} am Tag. Du so: «Scheiß auf den Plan», und noch {over} obendrauf.',
      'Das heutige Budget ist an «{desc}» verreckt. Ruhe in Frieden, du {Vollidiot|Vollidiotin}.',
      '{spent} an einem Tag bei {daily} Limit. Olympisches Geldverbrennen, verdammt.'
    ],
    challenge: [
      'Deine Woche ohne «{category}» hat {days} {days#Tag|Tage} gehalten. Willenskraft-Level: «scheiß drauf».',
      'Du hast eine Woche ohne «{category}» versprochen. Das Versprechen hat {amount} gekostet. Laberbacke.',
      '«{desc}» für {amount}, und die Challenge «{category}» ist im Arsch. Überrascht mich null.',
      'Bei «{desc}» eingeknickt. Eine Woche ohne «{category}» war wohl zu verdammt lang, was?',
      'Willenskraft: {days} {days#Tag|Tage}. Preis der Kapitulation: {amount}. Erbärmlich, verdammt.',
      'Die Challenge «{category}» ist tot. Hoffentlich war «{desc}» wenigstens verdammt geil.',
      'Eine Woche ohne «{category}», und du knickst bei «{desc}» ein, du {Versager|Versagerin}. Scheiße, echt.'
    ],
    impulse: [
      '«{desc}» für {amount}, {times}× deine übliche Ausgabe. Für wen zur Hölle hältst du dich, für {einen Millionär|eine Millionärin}?',
      'Normalerweise gibst du um die {median} aus, und dann zack: {amount} für «{desc}». Wer zur Hölle lässt dich an Geld ran?',
      'Gut gemacht, du {Idiot|Idiotin}. «{desc}» für {amount}. Zufrieden?',
      'Das sind {cat_times} deiner üblichen «{category}»-Käufe auf einmal. Verdammter Großkotz.',
      '{amount} auf einen Schlag für «{desc}». Impuls: ja. Hirn: nein.',
      '«{desc}», {amount}. Nächste Woche guckst du drauf und denkst «was zur Hölle hab ich mir dabei gedacht?». Ich denk’s jetzt schon.',
      '{times}× mehr als sonst. Alter, bist du jetzt komplett durchgedreht?'
    ],
    junk: [
      'Gut gemacht, du {Vollidiot|Vollidiotin}: «{desc}» für {amount} statt was Sinnvollem. Zufrieden?',
      '«{desc}», schon {count}-mal diese Periode, {sum} insgesamt. Konstant scheiße. Respekt.',
      'Schon wieder {amount} für «{desc}». Bei dem Tempo brauchst du für den Scheiß bald einen Kredit.',
      '{sum} diese Periode für «{desc}» und ähnlichen Mist. Und dann «wo ist mein Geld hin?», klar.',
      'Schon wieder «{desc}»? {count}-mal, verdammt nochmal. Das ist kein Kauf mehr, das ist Tradition.',
      'Wieder {amount} für «{desc}» verballert. Dein Geldbeutel beantragt Asyl.'
    ],
    junk_fastfood: [
      '«{desc}» für {amount} statt einer Tüte Lebensmittel. Hättest dreimal ordentlich essen können, aber nee, scheiß drauf.',
      'Schon {count}-mal Fast Food diese Periode, {sum} insgesamt. Ist dein Herd nur verdammte Deko?'
    ],
    junk_delivery: [
      'Lieferung für {amount}. Der Kurier kennt deinen Namen, und dein Geldbeutel will dir sagen: Verpiss dich.',
      '{count} {count#Lieferung|Lieferungen} diese Periode, {sum} insgesamt. Die Küche ist fünf verdammte Meter entfernt.'
    ],
    junk_alcohol: [
      '«{desc}» für {amount}. Schon {count}-mal diese Periode: keine Party, eine verdammte Mitgliedschaft.',
      '«{desc}»: {amount}. {sum} diese Periode versoffen. Läuft bei dir, was?'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} diese Periode, buchstäblich verqualmt. Scheißgenial.',
      '{amount} für «{desc}». Du zündest dein Geld wortwörtlich an.'
    ],
    junk_energy: [
      'Energy Drink für {amount}. Energie: ohne Ende. Kohle: null, verdammt.',
      '{count} {count#Dose|Dosen} diese Periode, {sum} insgesamt. Wachbleiben zum Preis eines verdammten Abendessens.'
    ],
    junk_taxi: [
      'Taxi für {amount}. Sind deine Beine nur verdammte Deko?',
      '{count} {count#Taxifahrt|Taxifahrten} diese Periode, {sum} insgesamt. Hättest dir gleich ein Scheißauto kaufen sollen.'
    ],
    week_more: [
      'Diese Woche hat {percent} % mehr gekostet als sonst, {amount} extra. Was feiern wir denn, verdammt?',
      '{amount} über einer normalen Woche. Die Kohle haut ab, als wäre sie zu spät dran.',
      '{total} diese Woche, {percent} % über normal. Verdammt starker Trend, halt mich auf dem Laufenden.',
      'Eine Woche, {amount} teurer. Wo zur Hölle sind deine Bremsen?'
    ],
    week_less: [
      'Diese Woche war {percent} % günstiger als sonst. Heilige Scheiße. Hast du echt alles eingetragen?',
      '{amount} unter einer normalen Woche. Verdammt, du hast es geschafft. Ich glaub’s nicht, aber Respekt.',
      '{amount} gespart. Werd nicht übermütig, das Wochenende versaut es eh.',
      '{total} diese Woche, {percent} % unter normal. Wer zur Hölle bist du, und wo ist der echte Verschwender?'
    ],
    week_same: [
      'Eine Woche wie jede andere: {total}. Derselbe alte Scheiß, stabil.',
      'Nicht besser, nicht schlechter als sonst. Nichts zum Rummotzen. Fast.',
      '{total}, wie immer. Berechenbar wie ein verdammter Montag.'
    ],
    month_empty: [
      'Keine einzige Ausgabe diese Periode. Entweder bist du heilig, oder du trägst einen Scheiß ein.',
      'Leer, verdammt. Null Ausgaben. Kauf ich dir keine Sekunde ab.'
    ],
    month_open: [
      '{spent} in {days} {days#Tag|Tagen}, {count} {count#Ausgabe|Ausgaben}. Wühlen wir uns durch diese Scheiße.',
      '{count} {count#Ausgabe|Ausgaben} für {spent}, in nur {days} {days#Tag|Tagen}. Heilige Scheiße.',
      'Gesamt: {spent} in {days} {days#Tag|Tagen}. Schnall dich an, das tut weh.'
    ],
    month_top: [
      'Die große Liebe der Periode: «{category}», {sum}, {share} % von allem. Verdammt, du bist echt Fan.',
      '«{category}» hat {share} % der Kohle gefressen, {sum}. Der Rest bekam einen Scheiß.',
      'Spitzenreiter: «{category}» mit {sum}. Sonst hatte keiner eine verdammte Chance.'
    ],
    month_biggest: [
      'Teuerster Mist der Periode: «{desc}» für {amount}. Hoffentlich hat sich’s gelohnt.',
      'Rekord der Periode: «{desc}», {amount}. Rahm dir den Scheiß ein.',
      '«{desc}» für {amount}, der härteste Schlag für deinen Geldbeutel. Zack, Kohle weg.'
    ],
    month_more: [
      'Verglichen mit demselben Tag der letzten Periode: {percent} % mehr, {amount} extra. Wachstum, verdammt. In die falsche Richtung.',
      '{amount} mehr als letztes Mal. Persönliche Inflation von {percent} %, heilige Scheiße.',
      '{percent} % mehr als in der letzten Periode. Falls das der Plan war: Der Plan ist scheiße.'
    ],
    month_less: [
      'Verglichen mit demselben Tag der letzten Periode: {percent} % weniger, {amount} gespart. Heilige Scheiße, ich glaub’s nicht.',
      '{amount} gespart gegenüber der letzten Periode. Verdammt. Wer bist du, und wo ist der echte Besitzer dieses Geldbeutels?',
      '{percent} % weniger als in der letzten Periode. Lob? Na gut, verdammt, gut gemacht.'
    ],
    month_budget_over: [
      'Dein Gesamtbudget von {limit} ist um {over} gesprengt. Das Budget hat geschrien, und es war allen scheißegal.',
      'Budget: {percent} %. Das Limit von {limit} kann sich verpissen.'
    ],
    month_budget_ok: [
      'Von deinem Budget von {limit} sind noch {left} übrig. Hält, aber ich beobachte dich verdammt genau.',
      '{percent} % des Budgets ausgegeben, {left} Puffer. Versau’s jetzt bloß nicht.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast Food, Lieferdienste und anderer Mist: {count}-mal, {sum}. Dein Kühlschrank ist stinksauer.' },
      '{count} {count#Mistkauf|Mistkäufe} für {sum}. Keine Schwäche, ein verdammter Lebensstil.',
      '{sum} für allerlei Scheiß bei {count} {count#Einkauf|Einkäufen}. Hättest sparen können, aber warum zur Hölle solltest du.'
    ],
    month_verdict_bad: [
      'Urteil: Dein Geldbeutel ist im Arsch und beantragt politisches Asyl.',
      'Fazit: Die Kohle kommt rein und verpisst sich sofort wieder.',
      'Urteil: Der Plan war verdammt solide. Schade, dass es beim Plan geblieben ist.'
    ],
    month_verdict_good: [
      'Urteil: Verdächtig ordentlich, verdammt. Weiter so, ich beobachte dich.',
      'Fazit: Kaum was zum Rummotzen. Kaum.',
      'Urteil: Du ziehst das durch wie ein Boss. Werd bloß nicht übermütig.'
    ]
  }
};
