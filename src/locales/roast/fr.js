// «😈 Mode clash» — французский. Синтаксис шаблонов (utils/roast.js): {param}; {м|ж} — форма по полу
// (не показывается тем, кто выбрал «не скажу»); {м|ж|без рода}; {n#одна|много} — слово по числу.
// Обращение на «tu». Markdown в шаблонах не используется (никаких * _ ` [).
module.exports = {
  labels: {
    total_budget: 'ton budget global',
    category_budget: 'ton budget «{category}»'
  },

  // 🌶 Piquant: сарказм без мата
  spicy: {
    morning_good: [
      "Limite du jour : {daily}. Ce n'est pas un défi, c'est une prière.",
      "Le plan est prêt. Le plus dur : ne pas faire comme s'il n'existait pas.",
      "Hier, dans le plan. Ton portefeuille espère une rediffusion."
    ],
    morning_bad: [
      "Hier, {over} au-dessus du plan. Aujourd'hui, jour de rédemption.",
      "Le plan a perdu hier. Revanche aujourd'hui, sans livraison.",
      "Hier, le portefeuille a maigri plus que prévu. Doucement aujourd'hui."
    ],
    budget_over: [
      'Et voilà, {budget} y est passé : {spent} pour une limite de {limit}. Dépassement : {over}. La limite, c’était une suggestion, visiblement.',
      '«{desc}» pour {amount}, et {budget} est officiellement mort. Une minute de silence, s’il te plaît.',
      'Bravo, tu as explosé {budget} de {over}. Dommage, ce n’est pas le genre de record dont on se vante.',
      'Encore {days_left} {days_left#jour|jours} avant la fin de la période, et {budget} est déjà dans le rouge de {over}. Stratégie audacieuse.',
      'La limite de {limit}, c’est toi qui l’as fixée. Et c’est toi qui l’as enjambée, de {over}. Quelle constance.',
      'Le budget en est à {percent} %. Cent pour cent, c’est pour les gens ennuyeux, hein ?',
      'Le budget était de {limit}. Était. Maintenant c’est {spent}, et le budget n’est plus qu’un doux souvenir.',
      'Tu étais si {sûr|sûre} de tenir {budget}. Résultat : {over} de dépassement.'
    ],
    budget_80: [
      '{percent} % de {budget} déjà dépensés. Il reste {left} pour {days_left} {days_left#jour|jours}. Bonne chance, tu vas en avoir besoin.',
      '«{desc}» pour {amount}, et plus que {left} avant la limite. C’est le moment de commencer à économiser. Hier, idéalement.',
      'Tu frôles la limite : {percent} %. Encore deux «{desc}» et c’est terminé.',
      '{left} pour le reste de la période. Ce n’est plus un budget, c’est un jeu de survie.',
      'Plus que {left} sur {budget}. Tu es {sûr|sûre} que «{desc}» en valait la peine ?',
      '{percent} % du budget derrière toi, mais pas la période. Drôle d’ordre des choses.'
    ],
    allowance: [
      'Limite du jour : {daily}. Dépensé : {spent}. Demain paie déjà pour aujourd’hui.',
      'Tu pouvais dépenser {daily} aujourd’hui, et {spent} sont partis. {over} de trop, demain va le sentir.',
      '«{desc}» pour {amount}, et la limite de {daily} par jour, c’est de l’histoire ancienne. Le plan aussi.',
      'Tu as grillé {times} jours de budget d’un coup. Efficace, je te l’accorde.',
      'La limite était de {daily}. Tu l’as prise pour un conseil, pas pour une règle : {spent}.',
      'Le plan du jour : {daily}. La réalité : {spent}. Le plan était ambitieux, mais pas à ce point.',
      'Le budget du jour est mort sur «{desc}». On recommence demain, d’accord ?',
      'Tu étais {parti|partie} pour {daily} aujourd’hui. Tu es {arrivé|arrivée} à {spent}.'
    ],
    challenge: [
      'Ta semaine sans «{category}» a tenu {days} {days#jour|jours}. Un record, mais pas du monde.',
      'Tu t’étais promis une semaine sans «{category}». La promesse a coûté {amount}.',
      '«{desc}» pour {amount}, et le défi «{category}» rejoint le cimetière des défis.',
      'Volonté : {days} {days#jour|jours}. Prix de la capitulation : {amount}.',
      'Défi raté. J’espère qu’au moins «{desc}» valait le coup.',
      'Tu as craqué pour «{desc}». Une semaine sans «{category}», c’est vrai que c’est long, sept jours entiers.',
      'Tu étais si {motivé|motivée} pour ce défi «{category}». Ça a duré jusqu’à «{desc}».'
    ],
    impulse: [
      '«{desc}» pour {amount}, soit {times} fois ta dépense habituelle ({median}). Impulsion notée.',
      'D’habitude, tu dépenses dans les {median}. Et là, {amount} pour «{desc}». Il s’est passé quelque chose, ou juste l’envie ?',
      '{amount} d’un coup. Tu ne t’y attendais pas toi-même ? Moi non plus.',
      'Ça fait {cat_times} achats «{category}» habituels en un seul coup. Le grand geste.',
      '«{desc}» pour {amount}. J’espère que tu en seras encore {content|contente} la semaine prochaine.',
      'Achat impulsif du jour : «{desc}», {amount}. Ton achat médian, c’est {median}, je dis ça comme ça.',
      '{times} fois plus cher que d’habitude. Quelque part, ton portefeuille sanglote en silence.'
    ],
    junk: [
      '«{desc}» pour {amount}. Déjà {count} fois cette période, {sum} au total. La régularité, c’est la marque des grands.',
      '«{desc}» : {amount}. Une habitude à {sum} cette période. Bel abonnement, dommage qu’il soit aux bêtises.',
      'Révélation : rien ne t’oblige à acheter «{desc}». Mais évidemment, tu l’as fait.',
      '{count} fois cette période. «{desc}», c’est presque une charge fixe maintenant.',
      'Encore {amount} pour «{desc}». Ton portefeuille l’a ajouté à sa liste de griefs.',
      '«{desc}» frappe encore : {sum} cette période. Avec cet argent, on aurait pu… bref, laisse tomber.',
      '«{desc}» pour {amount}. Ton futur toi te remercie. Non, je rigole, il est furieux.'
    ],
    junk_fastfood: [
      '«{desc}» pour {amount}. Fast-food : {count} fois cette période. Ce n’est pas demain que tu ouvriras un restaurant étoilé.',
      'Fast-food : {sum} cette période. Ton frigo est vexé et ne te parle plus.'
    ],
    junk_delivery: [
      'Livraison pour {amount}. Le livreur va bientôt t’appeler par ton prénom.',
      '{count} {count#livraison|livraisons} cette période, {sum} au total. La cuisinière, c’est de la déco ?'
    ],
    junk_alcohol: [
      '«{desc}» pour {amount}. {count} fois cette période : ce n’est plus une fête, c’est un abonnement.',
      '«{desc}» : {amount}. À voir les tickets de caisse, c’est la fête toute l’année.'
    ],
    junk_smoking: [
      '«{desc}» : {amount}. {sum} cette période, littéralement partis en fumée.',
      '{amount} pour «{desc}». On peut donc fumer de l’argent, aussi.'
    ],
    junk_energy: [
      'Boisson énergisante à {amount}. Plus d’énergie, moins d’argent.',
      '{count} {count#canette|canettes} cette période, {sum} au total. Rester éveillé coûte cher de nos jours.'
    ],
    junk_taxi: [
      'Taxi pour {amount}. Les jambes, c’est décoratif, apparemment.',
      '{count} {count#taxi|taxis} cette période, {sum} au total. Encore un peu, et une voiture aurait coûté moins cher.'
    ],
    week_more: [
      'Cette semaine t’a coûté {percent} % de plus que d’habitude, soit {amount} en plus. On vit dans le luxe, à ce que je vois.',
      '{amount} de plus qu’une semaine normale. Soit tu fêtais quelque chose, soit… non, tu fêtais quelque chose.',
      '{total} cette semaine, {percent} % au-dessus de la normale. La tendance a la pêche. Ton portefeuille, moins.',
      'Une semaine {amount} plus chère que d’habitude. Lundi te regarde de travers.'
    ],
    week_less: [
      'Cette semaine, {percent} % de moins que d’habitude. Louche. Tu as bien tout noté ?',
      '{amount} de moins qu’une semaine normale. Je n’y crois pas, mais j’aime bien.',
      '{amount} d’économisés. Ne te relâche pas, le week-end arrive pour les récupérer.',
      '{total} cette semaine, {percent} % de moins que d’habitude. Qui es-tu, et qu’as-tu fait du grand dépensier ?'
    ],
    week_same: [
      'Une semaine comme les autres : {total}. La stabilité, c’est aussi un résultat. Ennuyeux, mais quand même.',
      'Ni mieux ni pire que d’habitude. Rien à redire. Presque.',
      '{total}, comme toujours. Prévisible comme un réveil.'
    ],
    month_empty: [
      'Pas une seule dépense cette période. Soit tu es {un saint|une sainte|une âme pure}, soit tu ne notes rien.',
      'Vide. Zéro dépense. Propre de façon louche, comme un appart juste avant l’arrivée des invités.'
    ],
    month_open: [
      '{spent} en {days} {days#jour|jours}, {count} {count#dépense|dépenses}. Voyons ça de plus près.',
      '{count} {count#dépense|dépenses} pour {spent}, en seulement {days} {days#jour|jours}. Impressionnant. Pas dans le bon sens.',
      'Total : {spent} en {days} {days#jour|jours}. Installe-toi, ça va piquer.'
    ],
    month_top: [
      'Le grand amour de la période : «{category}», {sum}, soit {share} % du total.',
      '«{category}» a englouti {share} % de l’argent, soit {sum}. Les autres catégories ont eu les miettes.',
      'En tête de la course : «{category}» avec {sum}. Aucune concurrence.'
    ],
    month_biggest: [
      'Plus gros achat : «{desc}» pour {amount}. J’espère que ça valait le coup.',
      'Record de la période : «{desc}», {amount}. À encadrer.',
      '«{desc}» pour {amount}, le coup le plus dur pour ton portefeuille.'
    ],
    month_more: [
      'Par rapport au même jour de la période précédente, tu dépenses {percent} % de plus, soit {amount}. Ça grimpe. Dans le mauvais sens.',
      '{amount} de plus que la dernière fois à la même date. Ton inflation perso : {percent} %.',
      '+{percent} % par rapport à la période précédente. Si c’était le plan, il a marché.'
    ],
    month_less: [
      'Par rapport au même jour de la période précédente : {percent} % de moins, {amount} d’économisés. Je n’en crois pas mes yeux.',
      '{amount} économisés par rapport à la période précédente. Qui es-tu, et où est le vrai propriétaire de ce portefeuille ?',
      '−{percent} % par rapport à la période précédente. Des félicitations ? Bon, un peu.'
    ],
    month_budget_over: [
      'Ton budget global de {limit} est explosé de {over}. Le budget a pleuré, personne n’a écouté.',
      'Budget : {percent} %. La limite de {limit}, c’est du passé.'
    ],
    month_budget_ok: [
      'Il reste {left} sur ton budget de {limit}. Ça tient. Pour l’instant.',
      '{percent} % du budget dépensés, {left} de marge. Ne crie pas victoire trop vite.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast-food, livraisons et autres petits plaisirs : {count} fois, {sum}. Ton frigo déprime.' },
      '{count} {count#achat inutile|achats inutiles} pour {sum}. Ce n’est pas une faiblesse, c’est un hobby.',
      '{sum} de bêtises en {count} {count#achat|achats}. Tu aurais pu économiser, mais qui fait ça ?'
    ],
    month_verdict_bad: [
      'Verdict : ton portefeuille demande l’asile politique.',
      'Bilan : l’argent ne reste pas chez toi. Il n’enlève même pas ses chaussures.',
      'Verdict : super plan. Dommage qu’il soit resté un plan.'
    ],
    month_verdict_good: [
      'Verdict : étonnamment correct. Continue, je te surveille.',
      'Bilan : presque rien à te reprocher. Presque, parce que je suis généreux aujourd’hui.',
      'Verdict : tu tiens bien la route. Ne prends pas la grosse tête.'
    ]
  },

  // 🔥 Sans filtre: мат и грубость — по тратам и решениям, без оскорблений по признакам
  savage: {
    morning_good: [
      "Limite du jour : {daily}. Tout claquer avant midi, c'est pas l'objectif, putain.",
      "Hier, dans le plan. Bordel, continue comme ça.",
      "Le plan est prêt. Fais pas le con, dépense pas plus."
    ],
    morning_bad: [
      "Hier, {over} au-dessus du plan. Merde, mode économie aujourd'hui.",
      "Le plan s'est fait envoyer chier hier. Pas aujourd'hui.",
      "Hier, t'as dépassé le plan. Freine, bordel."
    ],
    budget_over: [
      'Bravo, génie : {budget} est foutu. {spent} pour {limit}, {over} de dépassement. {Content|Contente} de toi ?',
      '«{desc}» pour {amount}, et {budget} part en couille. {over} de trop. Putain de bravo.',
      'Tu as fixé la limite toi-même, et tu l’as défoncée toi-même : {percent} %. Quel bordel.',
      'Encore {days_left} {days_left#jour|jours} à tenir et {budget} est déjà {over} dans la merde. Le plan : nul. L’exécution : pire.',
      'La limite, c’était {limit}. Maintenant c’est {spent}. Ce n’est plus un dépassement, c’est une putain de catastrophe à {percent} %.',
      'Tu as explosé {budget} de {over}. Un boulot de merde, vraiment remarquable.',
      'Boum, {budget} est mort, {over} de trop. Pâtes au beurre jusqu’à la paie, espèce d’{abruti|abrutie}.'
    ],
    budget_80: [
      '{percent} % de {budget} déjà cramés. {left} pour {days_left} {days_left#jour|jours}. Bon courage, putain.',
      '«{desc}» pour {amount}, et plus que {left}. Freine, bordel, avant qu’il soit trop tard.',
      '{percent} % du budget envolés et la période n’est même pas finie. Tu te fous de ma gueule ?',
      'Encore deux «{desc}» et {budget} est niqué. Il reste {left}.',
      '{left} pour le reste de la période. Ce n’est plus un budget, c’est Koh-Lanta, merde.',
      'T’es {sûr|sûre} d’avoir des freins, {abruti|abrutie} ? {percent} % du budget déjà partis.'
    ],
    allowance: [
      'Tu pouvais dépenser {daily} aujourd’hui, t’as claqué {spent}. Demain, tu bouffes de l’air.',
      '«{desc}» pour {amount}, et la limite de {daily} part à la poubelle. {over} de trop, bordel.',
      'Limite du jour : {daily}. Dépensé : {spent}. Les maths, putain, c’est pas ton truc.',
      'T’as bouffé {times} jours de budget en une journée. Bel appétit, merde.',
      'Le plan, c’était {daily} par jour. T’as dit «on s’en fout du plan» et t’as rajouté {over}.',
      'Le budget du jour a crevé sur «{desc}». Repose en paix, espèce d’{inconscient|inconsciente}.',
      '{spent} en une journée pour {daily} prévus. Gaspillage de niveau olympique, bordel.'
    ],
    challenge: [
      'Ta semaine sans «{category}» a tenu {days} {days#jour|jours}. Niveau volonté : «rien à foutre».',
      'Tu avais promis une semaine sans «{category}». Cette promesse a coûté {amount}. Belle parole de merde.',
      '«{desc}» pour {amount}, et le défi «{category}» est foutu. Ça ne m’étonne même pas.',
      'Craqué pour «{desc}». Une semaine sans «{category}», c’était trop long, putain ?',
      'Volonté : {days} {days#jour|jours}. Prix de la reddition : {amount}. Pathétique, bordel.',
      'Le défi «{category}» est mort. J’espère que «{desc}» était foutrement génial, au moins.',
      'T’as tenu comme {un vrai pro|une vraie pro}… jusqu’à «{desc}». {Nul|Nulle}, franchement.'
    ],
    impulse: [
      '«{desc}» pour {amount}, {times} fois ta dépense habituelle. Tu te prends pour qui, putain, pour Bernard Arnault ?',
      'D’habitude tu dépenses dans les {median}, et paf : {amount} pour «{desc}». Qui t’a filé une carte bancaire, bordel ?',
      'Bien joué, {abruti|abrutie}. «{desc}» pour {amount}. {Content|Contente} ?',
      'Ça fait {cat_times} achats «{category}» habituels d’un coup. {Quel flambeur|Quelle flambeuse} de merde.',
      '{amount} d’un coup pour «{desc}». L’impulsion : oui. Le cerveau : non.',
      '«{desc}», {amount}. La semaine prochaine, tu regarderas ça en te disant «mais putain, pourquoi ?». Moi, c’est déjà fait.',
      '{times} fois ton achat habituel. T’as complètement pété les plombs.'
    ],
    junk: [
      'Bien joué, {abruti|abrutie} : «{desc}» pour {amount} au lieu d’un truc utile. {Content|Contente} ?',
      '«{desc}», déjà {count} fois cette période, {sum} au total. Constant dans la merde. Respect.',
      'Encore {amount} pour «{desc}». À ce rythme, il te faudra un crédit pour ces conneries.',
      '{sum} cette période en «{desc}» et autres conneries. Et après, «mais où passe mon fric», hein.',
      'Encore «{desc}» ? {count} fois, putain. Ce n’est plus un achat, c’est une tradition.',
      'T’as encore claqué {amount} pour «{desc}». Ton portefeuille demande l’asile.'
    ],
    junk_fastfood: [
      '«{desc}» pour {amount} au lieu d’un sac de courses. T’aurais pu bien manger trois fois, mais non, rien à foutre.',
      'Fast-food : {count} fois cette période, {sum} au total. Ta cuisinière, c’est de la putain de déco ?'
    ],
    junk_delivery: [
      'Livraison pour {amount}. Le livreur connaît ton prénom, et ton portefeuille a envie de t’envoyer te faire foutre.',
      '{count} {count#livraison|livraisons} cette période, {sum} au total. La cuisine est à cinq putains de mètres.'
    ],
    junk_alcohol: [
      '«{desc}» pour {amount}. {count} fois cette période : pas une fête, un putain d’abonnement.',
      '«{desc}» : {amount}. {sum} de picole cette période. La belle vie, hein.'
    ],
    junk_smoking: [
      '«{desc}» : {amount}. {sum} cette période, littéralement partis en fumée. Bordel de génie.',
      '{amount} pour «{desc}». Tu fous littéralement le feu à ton fric.'
    ],
    junk_energy: [
      'Boisson énergisante à {amount}. De l’énergie à gogo, du fric que dalle.',
      '{count} {count#canette|canettes} cette période, {sum} au total. Rester éveillé au prix d’un putain de dîner.'
    ],
    junk_taxi: [
      'Taxi pour {amount}. Tes jambes, c’est de la putain de déco ?',
      '{count} {count#taxi|taxis} cette période, {sum} au total. T’aurais mieux fait d’acheter une bagnole, bordel.'
    ],
    week_more: [
      'Cette semaine t’a coûté {percent} % de plus que d’habitude, {amount} en plus. On fête quoi, putain ?',
      '{amount} de plus qu’une semaine normale. Le fric file comme s’il était en retard.',
      '{total} cette semaine, {percent} % au-dessus de la normale. Putain de tendance, tiens-moi au courant.',
      'Une semaine {amount} plus chère. Ils sont où, tes freins, bordel ?'
    ],
    week_less: [
      'Cette semaine, {percent} % de moins que d’habitude. Putain. T’as vraiment tout noté ?',
      '{amount} de moins qu’une semaine normale. Merde alors, t’as réussi. J’y crois pas, mais respect.',
      '{amount} d’économisés. Prends pas la grosse tête, le week-end va tout foutre en l’air.',
      '{total} cette semaine, {percent} % de moins. T’es qui, bordel, et où est passé le vrai flambeur ?'
    ],
    week_same: [
      'Une semaine comme les autres : {total}. Toujours la même merde, stable.',
      'Ni mieux ni pire que d’habitude. Rien à gueuler. Presque.',
      '{total}, comme toujours. Prévisible comme un putain de lundi.'
    ],
    month_empty: [
      'Pas une dépense cette période. Soit t’es {un saint|une sainte|un ange}, soit tu notes que dalle.',
      'Vide, bordel. Zéro dépense. J’y crois pas une seconde.'
    ],
    month_open: [
      '{spent} en {days} {days#jour|jours}, {count} {count#dépense|dépenses}. Fouillons dans ce bordel.',
      '{count} {count#dépense|dépenses} pour {spent}, en {days} {days#jour|jours} seulement. Putain de merde.',
      'Total : {spent} en {days} {days#jour|jours}. Accroche-toi, ça va faire mal.'
    ],
    month_top: [
      'Le grand amour de la période : «{category}», {sum}, {share} % du total. Putain, t’es fan.',
      '«{category}» a bouffé {share} % du fric, {sum}. Le reste a eu que dalle.',
      'En tête : «{category}» avec {sum}. Personne n’avait la moindre putain de chance.'
    ],
    month_biggest: [
      'La connerie la plus chère de la période : «{desc}» pour {amount}. J’espère que ça valait le coup.',
      'Record de la période : «{desc}», {amount}. Encadre-moi cette merde.',
      '«{desc}» pour {amount}, le plus gros coup dans ton portefeuille. Paf, plus de fric.'
    ],
    month_more: [
      'Par rapport au même jour de la période précédente : {percent} % de plus, {amount} en plus. Ça grimpe, bordel. Dans le mauvais sens.',
      '{amount} de plus que la dernière fois. Inflation perso de {percent} %, putain.',
      '+{percent} % sur la période précédente. Si c’était le plan, le plan est merdique.'
    ],
    month_less: [
      'Par rapport au même jour de la période précédente : {percent} % de moins, {amount} d’économisés. Putain, j’y crois pas.',
      '{amount} économisés par rapport à la période précédente. Merde alors. T’es qui, et où est le vrai proprio de ce portefeuille ?',
      '−{percent} % sur la période précédente. Des félicitations ? Bon, bordel, bien joué.'
    ],
    month_budget_over: [
      'Ton budget global de {limit} est explosé de {over}. Le budget a gueulé, tout le monde s’en est foutu.',
      'Budget : {percent} %. La limite de {limit} peut aller se faire foutre.'
    ],
    month_budget_ok: [
      'Il reste {left} sur ton budget de {limit}. Ça tient, mais je te surveille, putain.',
      '{percent} % du budget dépensés, {left} de marge. Va pas tout foutre en l’air.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Fast-food, livraisons et autres conneries : {count} fois, {sum}. Ton frigo est vénère.' },
      '{count} {count#achat inutile|achats inutiles} pour {sum}. Pas une faiblesse, un putain de mode de vie.',
      '{sum} de conneries en {count} {count#achat|achats}. T’aurais pu économiser, mais pourquoi, bordel ?'
    ],
    month_verdict_bad: [
      'Verdict : ton portefeuille est foutu et demande l’asile politique.',
      'Bilan : le fric arrive et se barre aussitôt.',
      'Verdict : le plan était béton, putain. Dommage qu’il soit resté un plan.'
    ],
    month_verdict_good: [
      'Verdict : étonnamment correct, merde alors. Continue, je te surveille.',
      'Bilan : presque rien à te gueuler dessus. Presque.',
      'Verdict : tu gères comme {un chef|une cheffe|un pro}. Prends pas la grosse tête.'
    ]
  }
};
