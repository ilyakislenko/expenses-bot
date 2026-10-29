// Режим прожарки — испанский (tú). Синтаксис шаблонов (utils/roast.js): {param}; {m|f} — род (пропускается при
// «не указывать»); {m|f|neutral}; {n#one|other} — слово по числу. Без Markdown в шаблонах.
module.exports = {
  labels: {
    total_budget: 'tu presupuesto total',
    category_budget: 'tu presupuesto de «{category}»'
  },

  spicy: {
    morning_good: [
      "Límite de hoy: {daily}. No es un reto, es un ruego.",
      "Plan listo. Lo difícil es no fingir que no existe.",
      "Ayer, dentro del plan. Tu cartera espera una repetición."
    ],
    morning_bad: [
      "Ayer, {over} por encima del plan. Hoy toca redimirse.",
      "El plan perdió ayer. Revancha hoy, y sin delivery.",
      "Ayer la cartera adelgazó más de lo previsto. Hoy, con calma."
    ],
    budget_over: [
      'Y adiós a {budget}: {spent} con un límite de {limit}. Te pasaste por {over}. El límite era solo una sugerencia, por lo visto.',
      '«{desc}» por {amount}, y {budget} ha muerto oficialmente. Un minuto de silencio, por favor.',
      'Enhorabuena, superaste {budget} por {over}. Lástima que no sea un récord para presumir.',
      'Quedan {days_left} {days_left#día|días} del periodo y {budget} ya va {over} en rojo. Estrategia valiente.',
      'El límite de {limit} lo pusiste tú. Y tú {mismo|misma} lo pisaste por {over}. Palabra de honor, ¿eh?',
      '{budget}: {percent}%. El cien por cien es para gente aburrida, ¿no?',
      'El presupuesto era {limit}. Era. Ahora vas por {spent} y el presupuesto es un bonito recuerdo.'
    ],
    budget_80: [
      '{budget} va por el {percent}%. Te quedan {left} para {days_left} {days_left#día|días}. Suerte, la vas a necesitar.',
      '«{desc}» por {amount}, y solo quedan {left} antes del límite. Buen momento para empezar a ahorrar. Ayer.',
      'Ya rozas el límite: {percent}%. Dos «{desc}» más y se acabó la partida.',
      '{left} para el resto del periodo. Eso ya no es presupuesto, es un reality de supervivencia.',
      'Solo quedan {left} de {budget}. ¿Seguro que «{desc}» valía la pena?',
      'Ya gastaste el {percent}% del presupuesto, pero el periodo sigue. Orden curioso de los acontecimientos.'
    ],
    allowance: [
      'Límite de hoy: {daily}. Gastado: {spent}. Mañana ya está pagando por hoy.',
      'Hoy podías gastar {daily} y se fueron {spent}. Te pasaste por {over}; mañana lo notará.',
      '«{desc}» por {amount}, y el límite diario de {daily} pasó a la historia. Junto con el plan.',
      'Te fundiste {times} días de presupuesto de una sentada. Eficiencia pura, eso sí.',
      'El límite era {daily}. Lo tomaste como una pista, no como una regla: {spent}.',
      'Plan del día: {daily}. Realidad: {spent}. El plan era ambicioso, pero no tanto.',
      'El presupuesto de hoy murió en «{desc}». Mañana empezamos de cero, ¿vale?'
    ],
    challenge: [
      'Tu semana sin «{category}» duró {days} {days#día|días}. Un récord, pero no mundial.',
      'Te prometiste una semana sin «{category}». La promesa costó {amount}.',
      '«{desc}» por {amount}, y el reto de «{category}» se va al cementerio de retos.',
      'Fuerza de voluntad: {days} {days#día|días}. Precio de la rendición: {amount}.',
      'Reto fallido. Espero que «{desc}» al menos valiera la pena.',
      'Caíste con «{desc}». Una semana entera sin «{category}», qué dura, siete días nada menos.'
    ],
    impulse: [
      '«{desc}» por {amount}: {times} veces tu gasto habitual ({median}). Impulso anotado.',
      'Normalmente gastas unos {median}. Y ahora {amount} en «{desc}». ¿Pasó algo o simplemente te apeteció?',
      '{amount} de golpe. ¿No te lo esperabas de ti? Yo tampoco.',
      'Eso son {cat_times} compras normales de «{category}» de una vez. Qué gesto tan grandioso.',
      '«{desc}» por {amount}. Ojalá te siga encantando la semana que viene.',
      'Capricho del día: «{desc}», {amount}. Tu compra media es {median}, solo lo digo.',
      '{times} veces más caro de lo normal. En algún lugar, tu cartera llora en silencio.'
    ],
    junk: [
      '«{desc}» por {amount}. Ya van {count} este periodo, {sum} en total. La constancia es señal de maestría.',
      '«{desc}»: {amount}. Un hábito de {sum} este periodo. Gran suscripción, lástima que sea a tonterías.',
      'Giro de guion: no tienes por qué comprar «{desc}». Pero claro, lo compraste.',
      'Van {count} este periodo. «{desc}» ya es prácticamente un gasto fijo.',
      'Otros {amount} en «{desc}». Tu cartera lo apuntó en su lista de quejas.',
      '«{desc}» ataca de nuevo: {sum} este periodo. Con ese dinero podrías… bah, da igual.'
    ],
    junk_fastfood: [
      '«{desc}» por {amount}: comida rápida número {count} este periodo. Lo de cocinar no es lo tuyo.',
      'Comida rápida: {sum} este periodo. Tu nevera está ofendida y no te habla.'
    ],
    junk_delivery: [
      'Pedido a domicilio por {amount}. El repartidor pronto te saludará por tu nombre.',
      'Pedido número {count} este periodo, {sum} en total. ¿La cocina es de decoración?'
    ],
    junk_alcohol: [
      '«{desc}» por {amount}. Número {count} este periodo: eso no es una fiesta, es una membresía.',
      '«{desc}»: {amount}. A juzgar por los tickets, aquí es fiesta todo el año.'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} este periodo, literalmente hechos humo.',
      '{amount} en «{desc}». Resulta que el dinero también se fuma.'
    ],
    junk_energy: [
      'Bebida energética por {amount}. Más energía, menos dinero.',
      'Lata número {count} este periodo, {sum} en total. Estar despierto sale caro.'
    ],
    junk_taxi: [
      'Taxi por {amount}. Las piernas son de adorno, por lo visto.',
      'Taxi número {count} este periodo, {sum} en total. Un poco más y salía más barato comprarse un coche.'
    ],
    week_more: [
      'Esta semana costó un {percent}% más de lo normal: {amount} extra. Viviendo a lo grande, ya veo.',
      '{amount} por encima de una semana normal. O estabas de celebración o… no, estabas de celebración.',
      '{total} esta semana, un {percent}% por encima de lo normal. La tendencia está animada. Tu cartera, no.'
    ],
    week_less: [
      'Esta semana fue un {percent}% más barata de lo normal. Sospechoso. ¿Lo apuntaste todo?',
      '{amount} menos que una semana normal. No me lo creo, pero me gusta.',
      'Ahorraste {amount}. No te relajes, que el finde viene a por ellos.'
    ],
    week_same: [
      'Una semana como cualquier otra: {total}. La estabilidad también es un logro. Aburrido, pero logro.',
      'Ni mejor ni peor que siempre. Nada que criticar. Casi.'
    ],
    month_empty: [
      'Ni un solo gasto este periodo. O tienes alma de santo o no estás apuntando nada.',
      'Vacío. Cero gastos. Sospechosamente limpio, como un piso justo antes de que lleguen visitas.'
    ],
    month_open: [
      '{spent} en {days} {days#día|días}, {count} {count#gasto|gastos}. Vamos a echar un vistazo.',
      '{count} {count#gasto|gastos} por {spent} en solo {days} {days#día|días}. Impresionante. Y no para bien.',
      'Total: {spent} en {days} {days#día|días}. Prepárate, que esto va a escocer.'
    ],
    month_top: [
      'El gran amor del periodo: «{category}», {sum}, el {share}% de todo.',
      '«{category}» se comió el {share}% del dinero: {sum}. Las demás categorías, las sobras.'
    ],
    month_biggest: [
      'Compra más grande: «{desc}» por {amount}. Espero que valiera la pena.',
      'Récord del periodo: «{desc}», {amount}. Para enmarcar.'
    ],
    month_more: [
      'Comparado con el mismo día del periodo anterior, gastas un {percent}% más: {amount} extra. Creciendo. En la dirección equivocada.',
      '{amount} más que la última vez a estas alturas. Tu inflación personal: {percent}%.'
    ],
    month_less: [
      'Comparado con el mismo día del periodo anterior: un {percent}% menos, {amount} ahorrados. No doy crédito.',
      '{amount} ahorrados respecto al periodo anterior. ¿Quién eres y dónde está el dueño de esta cartera?'
    ],
    month_budget_over: [
      'Tu presupuesto total de {limit} se fue al garete por {over}. El presupuesto lloró y nadie lo escuchó.',
      'Presupuesto: {percent}%. El límite de {limit} es historia.'
    ],
    month_budget_ok: [
      'Quedan {left} de tu presupuesto de {limit}. Aguantando. De momento.',
      'Gastado el {percent}% del presupuesto, quedan {left}. No lo gafes.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Comida rápida, pedidos y otros placeres: {count} {count#vez|veces}, {sum}. Tu nevera está deprimida.' },
      '{sum} en tonterías varias en {count} {count#compra|compras}. Podías haberlo ahorrado, pero quién hace eso.'
    ],
    month_verdict_bad: [
      'Veredicto: tu cartera pide asilo político.',
      'Resumen: el dinero no se queda contigo. Ni siquiera se quita los zapatos.'
    ],
    month_verdict_good: [
      'Veredicto: sospechosamente decente. Sigue así, te estoy vigilando.',
      'Resumen: casi nada que criticar. Casi, porque hoy me siento generoso.'
    ]
  },

  savage: {
    morning_good: [
      "Límite de hoy: {daily}. Fundirlo antes de comer no es la meta, joder.",
      "Ayer, dentro del plan. Hostia, sigue así.",
      "Plan listo. No la cagues, simplemente no gastes de más."
    ],
    morning_bad: [
      "Ayer, {over} por encima del plan. Pues vaya mierda: hoy, modo ahorro.",
      "Ayer mandaste el plan a la mierda. Hoy no, ¿vale?",
      "Ayer te pasaste del plan. Frena, joder."
    ],
    budget_over: [
      'Muy bien, {genio|genia}: {budget} a la mierda. {spent} con un límite de {limit}, {over} de más. ¿Contento{|a}?',
      '«{desc}» por {amount}, y {budget} se fue a la mierda. {over} de más. Aplausos, cabrón.',
      'Pusiste el límite y te lo cargaste {tú solito|tú solita|sin ayuda de nadie}: {percent}%. Qué puto circo.',
      'Quedan {days_left} {days_left#día|días} y {budget} ya va {over} hundido en la mierda. Plan: una mierda. Ejecución: peor.',
      'El límite era {limit}. Ahora vas por {spent}. Eso no es pasarse, es una puta catástrofe al {percent}%.',
      'Te cargaste {budget} por {over}. Trabajo de puta madre. De verdad.',
      'Pum: {budget} reventado, {over} de más. Toca fideos instantáneos hasta el día de cobro, joder.'
    ],
    budget_80: [
      '{budget} va por el {percent}%. Quedan {left} para {days_left} {days_left#día|días}. Suerte, joder.',
      '«{desc}» por {amount}, y solo quedan {left}. Pisa el puto freno antes de que sea tarde.',
      'Ya se fue el {percent}% del presupuesto y el periodo ni ha terminado. ¿Me estás jodiendo?',
      'Dos «{desc}» más y {budget} se va al carajo. Quedan {left}.',
      'Ya te has pulido el {percent}% del presupuesto. Los frenos existen por algo, carajo.'
    ],
    allowance: [
      'Hoy podías gastar {daily} y reventaste {spent}. Mañana comes aire.',
      '«{desc}» por {amount}, y el límite diario de {daily} a la mierda. {over} de más.',
      'Límite diario: {daily}. Gastado: {spent}. Las mates no son lo tuyo, joder.',
      'Te zampaste {times} días de presupuesto en uno. Menudo apetito, cabrón.',
      'El plan era {daily} al día. Dijiste «a la mierda el plan» y metiste {over} extra.',
      '{spent} en un día con un presupuesto de {daily}. Nivel olímpico de despilfarro, joder.'
    ],
    challenge: [
      'Tu semana sin «{category}» duró {days} {days#día|días}. Fuerza de voluntad nivel «a la mierda».',
      'Prometiste una semana sin «{category}». La promesa costó {amount}. Menudo bocazas.',
      '«{desc}» por {amount}, y el reto de «{category}» a tomar por culo. Ni me sorprende.',
      'Caíste con «{desc}». Una semana sin «{category}» era demasiado, ¿eh, campeón{|a}?',
      'El reto de «{category}» ha muerto. Espero que «{desc}» estuviera de puta madre por lo menos.'
    ],
    impulse: [
      '«{desc}» por {amount}: {times} veces tu gasto normal. ¿Quién coño te crees, un millonario?',
      'Normalmente gastas unos {median}, y de repente {amount} en «{desc}». ¿Quién carajo te dejó suelto con dinero?',
      'Bravo, {idiota|idiota|cabeza hueca}. «{desc}» por {amount}. ¿Contento{|a}?',
      '{amount} de una sentada en «{desc}». Impulso: sí. Cerebro: ni de coña.',
      '«{desc}», {amount}. La semana que viene lo mirarás y dirás «¿pero qué coño?». Yo ya lo digo.',
      '{times} veces tu compra habitual. Se te ha ido la puta olla.'
    ],
    junk: [
      'Bravo: «{desc}» por {amount} en vez de algo útil. ¿Para qué cojones?',
      '«{desc}»: el número {count} este periodo, {sum} en total. Constante en la mierda. Respeto.',
      'Otros {amount} en «{desc}». A este ritmo vas a necesitar una hipoteca para esta mierda.',
      '{sum} este periodo en «{desc}» y mierdas similares. Y luego «¿dónde se va mi dinero?», claro.',
      'Otra vez {amount} tirados en «{desc}». Tu cartera está pidiendo asilo, joder.'
    ],
    junk_fastfood: [
      '«{desc}» por {amount} en vez de una bolsa de compra. Bravo, joder.',
      'Comida rápida número {count} este periodo, {sum} en total. ¿La cocina es de puto adorno?'
    ],
    junk_delivery: [
      'Pedido por {amount}. El repartidor ya sabe tu nombre y tu cartera quiere mandarte a la mierda.',
      'Pedido número {count} este periodo, {sum} en total. La cocina está a cinco putos metros.'
    ],
    junk_alcohol: [
      '«{desc}» por {amount}. Número {count} este periodo: no es una fiesta, es una puta membresía.',
      '«{desc}»: {amount}. {sum} bebidos este periodo. Qué vida más loca, joder.'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} este periodo, hechos humo. Brillante, joder.',
      '{amount} en «{desc}». Estás quemando dinero, literalmente.'
    ],
    junk_energy: [
      'Bebida energética por {amount}. Energía: un huevo. Dinero: una mierda.',
      'Lata número {count} este periodo, {sum} en total. Estar despierto al precio de una puta cena.'
    ],
    junk_taxi: [
      'Taxi por {amount}. ¿Las piernas son de puto adorno?',
      'Taxi número {count} este periodo, {sum} en total. Cómprate un coche de una puta vez.'
    ],
    week_more: [
      'Esta semana costó un {percent}% más de lo normal, {amount} extra. ¿Celebrando algo o qué coño?',
      '{amount} por encima de una semana normal. El dinero se va por el desagüe como si llegara tarde.',
      'Una semana {amount} más cara. ¿Dónde carajo tienes los frenos?'
    ],
    week_less: [
      'Esta semana fue un {percent}% más barata. Hostia. ¿De verdad lo apuntaste todo?',
      '{amount} menos que una semana normal. Joder, lo lograste. No me lo creo, pero respeto.',
      'Ahorraste {amount}. No te flipes, que el finde la va a cagar.'
    ],
    week_same: [
      'Una semana como cualquier otra: {total}. La misma mierda de siempre, estable.',
      'Ni mejor ni peor que siempre. Nada de qué quejarse, joder. Casi.'
    ],
    month_empty: [
      'Ni un gasto este periodo. O tienes alma de santo o no apuntas una mierda.',
      'Vacío de cojones. Cero gastos. No me lo trago ni de coña.'
    ],
    month_open: [
      '{spent} en {days} {days#día|días}, {count} {count#gasto|gastos}. Vamos a remover esta mierda.',
      '{count} {count#gasto|gastos} por {spent} en solo {days} {days#día|días}. Hostia puta.',
      'Total: {spent} en {days} {days#día|días}. Agárrate, que esto va a doler.'
    ],
    month_top: [
      'El gran amor del periodo: «{category}», {sum}, el {share}% de todo. Joder, qué fan.',
      '«{category}» se zampó el {share}% del dinero: {sum}. Al resto, una mierda.'
    ],
    month_biggest: [
      'La mierda más cara del periodo: «{desc}» por {amount}. Espero que valiera la pena.',
      'Récord del periodo: «{desc}», {amount}. Enmarca esa mierda.'
    ],
    month_more: [
      'Respecto al mismo día del periodo anterior gastas un {percent}% más, {amount} extra. Creciendo, joder. Hacia el lado equivocado.',
      '{amount} más que la última vez. Inflación personal del {percent}%, hostia.'
    ],
    month_less: [
      'Respecto al mismo día del periodo anterior: un {percent}% menos, {amount} ahorrados. Hostia, no me lo creo.',
      '{amount} ahorrados respecto al periodo anterior. Joder. ¿Quién eres y dónde está el dueño de la cartera?'
    ],
    month_budget_over: [
      'Tu presupuesto total de {limit} reventado por {over}. El presupuesto gritó y a nadie le importó una mierda.',
      'Presupuesto: {percent}%. El límite de {limit} que se vaya a la mierda.'
    ],
    month_budget_ok: [
      'Quedan {left} de tu presupuesto de {limit}. Aguantas, pero te estoy vigilando, joder.',
      'Gastado el {percent}% del presupuesto, quedan {left}. No la cagues.'
    ],
    month_junk: [
      { needs: ['fastfood', 'delivery'], text: 'Comida rápida, pedidos y demás mierdas: {count} {count#vez|veces}, {sum}. Tu nevera está cabreada.' },
      '{count} compras basura por {sum}. No es una debilidad, es un puto estilo de vida.'
    ],
    month_verdict_bad: [
      'Veredicto: tu cartera está jodida y pide asilo político.',
      'Resumen: el dinero entra y se larga a tomar por culo al instante.'
    ],
    month_verdict_good: [
      'Veredicto: sospechosamente decente, joder. Sigue así, te vigilo.',
      'Resumen: casi nada de qué quejarse. Casi.'
    ]
  }
};
