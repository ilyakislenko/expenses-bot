// Режим прожарки — португальский (бразильский, «você»). Синтаксис шаблонов (utils/roast.js): {param}; {m|f} — род
// (пропускается при «не указывать»); {m|f|neutral}; {n#one|other} — слово по числу. Без Markdown в шаблонах.
module.exports = {
  labels: {
    total_budget: 'seu orçamento total',
    category_budget: 'seu orçamento de «{category}»'
  },

  spicy: {
    budget_over: [
      'E lá se foi {budget}: {spent} para um limite de {limit}. Estourou em {over}. Pelo visto o limite era só uma sugestão.',
      '«{desc}» por {amount}, e {budget} morreu oficialmente. Um minuto de silêncio, por favor.',
      'Parabéns, você superou {budget} em {over}. Pena que não é recorde para se gabar.',
      'Faltam {days_left} {days_left#dia|dias} no período e {budget} já está {over} no vermelho. Estratégia ousada.',
      'O limite de {limit} foi você que definiu. E você mesmo{|a} passou por cima dele, em {over}. Palavra de honra, hein?',
      '{budget}: {percent}%. Cem por cento é coisa de gente sem graça, né?',
      'O orçamento era {limit}. Era. Agora está em {spent}, e o orçamento virou uma doce lembrança.'
    ],
    budget_80: [
      '{budget} está em {percent}%. Sobram {left} para {days_left} {days_left#dia|dias}. Boa sorte, vai precisar.',
      '«{desc}» por {amount}, e só sobram {left} até o limite. Ótima hora para começar a economizar. Ontem.',
      'Já está no limite: {percent}%. Mais dois «{desc}» e é game over.',
      '{left} para o resto do período. Isso não é mais orçamento, é reality de sobrevivência.',
      'Só sobram {left} de {budget}. Tem certeza de que «{desc}» valeu a pena?',
      '{percent}% do orçamento já foi, mas o período não. Ordem curiosa dos acontecimentos.'
    ],
    allowance: [
      'Limite de hoje: {daily}. Gasto: {spent}. O amanhã já está pagando pelo hoje.',
      'Hoje dava para gastar {daily} e foram {spent}. Passou {over}; amanhã vai sentir.',
      '«{desc}» por {amount}, e o limite diário de {daily} virou história. Junto com o plano.',
      'Você torrou {times} dias de orçamento de uma vez só. Eficiência pura, isso eu admito.',
      'O limite era {daily}. Você entendeu como dica, não como regra: {spent}.',
      'Plano do dia: {daily}. Realidade: {spent}. O plano era ambicioso, mas nem tanto.',
      'O orçamento de hoje morreu em «{desc}». Amanhã a gente recomeça, combinado?'
    ],
    challenge: [
      'Sua semana sem «{category}» durou {days} {days#dia|dias}. Um recorde, só que não mundial.',
      'Você prometeu uma semana sem «{category}». A promessa custou {amount}.',
      '«{desc}» por {amount}, e o desafio de «{category}» foi para o cemitério dos desafios.',
      'Força de vontade: {days} {days#dia|dias}. Preço da rendição: {amount}.',
      'Desafio fracassado. Espero que «{desc}» pelo menos tenha valido a pena.',
      'Caiu em «{desc}». Uma semana inteira sem «{category}», que sacrifício, sete dias inteirinhos.'
    ],
    impulse: [
      '«{desc}» por {amount}: {times} vezes o seu gasto normal ({median}). Impulso registrado.',
      'Você costuma gastar uns {median}. E agora {amount} em «{desc}». Aconteceu alguma coisa ou só deu vontade?',
      '{amount} de uma vez. Não esperava isso de si mesmo{|a}? Nem eu.',
      'Isso dá {cat_times} compras normais de «{category}» numa tacada só. Que gesto grandioso.',
      '«{desc}» por {amount}. Tomara que você ainda ame isso semana que vem.',
      'Impulso do dia: «{desc}», {amount}. Sua compra média é {median}, só comentando.',
      '{times} vezes mais caro que o normal. Em algum lugar, sua carteira chora baixinho.'
    ],
    junk: [
      '«{desc}» por {amount}. Já são {count} neste período, {sum} no total. Constância é sinal de maestria.',
      '«{desc}»: {amount}. Um hábito de {sum} neste período. Bela assinatura, pena que é de besteira.',
      'Reviravolta: você não precisa comprar «{desc}». Mas é claro que comprou.',
      'Número {count} neste período. «{desc}» já é praticamente gasto fixo.',
      'Mais {amount} em «{desc}». Sua carteira anotou na lista de reclamações.',
      '«{desc}» ataca de novo: {sum} neste período. Com esse dinheiro dava pra… deixa pra lá.'
    ],
    junk_fastfood: [
      '«{desc}» por {amount}: fast food número {count} neste período. Cozinhar não é a sua praia.',
      'Fast food: {sum} neste período. Sua geladeira ficou ofendida e não fala mais com você.'
    ],
    junk_delivery: [
      'Delivery de {amount}. Logo o entregador vai te cumprimentar pelo nome.',
      'Delivery número {count} neste período, {sum} no total. O fogão é só enfeite?'
    ],
    junk_alcohol: [
      '«{desc}» por {amount}. Número {count} neste período: isso não é festa, é assinatura.',
      '«{desc}»: {amount}. Pelas notinhas, aqui é Carnaval o ano inteiro.'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} neste período, literalmente virando fumaça.',
      '{amount} em «{desc}». Pelo visto dá pra fumar dinheiro também.'
    ],
    junk_energy: [
      'Energético por {amount}. Mais energia, menos dinheiro.',
      'Lata número {count} neste período, {sum} no total. Ficar acordado anda caro.'
    ],
    junk_taxi: [
      'Uber por {amount}. As pernas são só decoração, pelo visto.',
      'Corrida número {count} neste período, {sum} no total. Mais um pouco e sairia mais barato comprar um carro.'
    ],
    week_more: [
      'Esta semana custou {percent}% a mais que o normal: {amount} extra. Vivendo como rei, estou vendo.',
      '{amount} acima de uma semana normal. Ou você estava comemorando ou… não, estava comemorando.',
      '{total} esta semana, {percent}% acima do normal. A tendência está animada. Sua carteira, não.'
    ],
    week_less: [
      'Esta semana saiu {percent}% mais barata que o normal. Suspeito. Você anotou tudo?',
      '{amount} abaixo de uma semana normal. Não acredito, mas gostei.',
      'Economizou {amount}. Não relaxa, o fim de semana vem buscar.'
    ],
    week_same: [
      'Uma semana como qualquer outra: {total}. Estabilidade também é resultado. Chato, mas é.',
      'Nem melhor nem pior que o normal. Nada para criticar. Quase.'
    ],
    month_empty: [
      'Nenhum gasto neste período. Ou você virou monge, ou não está anotando nada.',
      'Vazio. Zero gastos. Limpo demais, tipo casa logo antes da visita chegar.'
    ],
    month_open: [
      '{spent} em {days} {days#dia|dias}, {count} {count#gasto|gastos}. Vamos dar uma olhada.',
      '{count} {count#gasto|gastos} somando {spent} em só {days} {days#dia|dias}. Impressionante. E não no bom sentido.',
      'Total: {spent} em {days} {days#dia|dias}. Se prepara, que vai arder.'
    ],
    month_top: [
      'O grande amor do período: «{category}», {sum}, {share}% de tudo.',
      '«{category}» engoliu {share}% do dinheiro: {sum}. As outras categorias ficaram com as sobras.'
    ],
    month_biggest: [
      'Maior compra: «{desc}» por {amount}. Espero que tenha valido a pena.',
      'Recorde do período: «{desc}», {amount}. Pode emoldurar.'
    ],
    month_more: [
      'Comparado com o mesmo dia do período passado, você gasta {percent}% a mais: {amount} extra. Crescendo. Na direção errada.',
      '{amount} a mais que da última vez a esta altura. Sua inflação pessoal: {percent}%.'
    ],
    month_less: [
      'Comparado com o mesmo dia do período passado: {percent}% a menos, {amount} economizados. Nem acredito.',
      '{amount} economizados em relação ao período passado. Quem é você e cadê o dono desta carteira?'
    ],
    month_budget_over: [
      'Seu orçamento total de {limit} estourou em {over}. O orçamento chorou e ninguém ouviu.',
      'Orçamento: {percent}%. O limite de {limit} é história.'
    ],
    month_budget_ok: [
      'Sobram {left} do seu orçamento de {limit}. Segurando. Por enquanto.',
      '{percent}% do orçamento gasto, sobram {left}. Não vai zicar.'
    ],
    month_junk: [
      'Fast food, delivery e outras alegrias: {count} {count#vez|vezes}, {sum}. Sua geladeira está deprimida.',
      '{sum} em besteiras variadas em {count} {count#compra|compras}. Dava pra ter guardado, mas quem faz isso.'
    ],
    month_verdict_bad: [
      'Veredito: sua carteira está pedindo asilo político.',
      'Resumo: dinheiro não para com você. Nem tira o sapato.'
    ],
    month_verdict_good: [
      'Veredito: decente de um jeito suspeito. Continua assim, estou de olho.',
      'Resumo: quase nada para zoar. Quase, porque hoje estou bonzinho.'
    ]
  },

  savage: {
    budget_over: [
      'Mandou bem, {gênio|gênia}: {budget} foi pro caralho. {spent} para um limite de {limit}, {over} a mais. Satisfeito{|a}?',
      '«{desc}» por {amount}, e {budget} foi pra merda. {over} a mais. Palmas, porra.',
      'Você mesmo{|a} definiu o limite e você mesmo{|a} fodeu com ele: {percent}%. Que circo do caralho.',
      'Faltam {days_left} {days_left#dia|dias} e {budget} já está {over} afundado na merda. Plano: uma merda. Execução: pior.',
      'O limite era {limit}. Agora está em {spent}. Isso não é exagero, é uma catástrofe do caralho a {percent}%.',
      'Você estourou {budget} em {over}. Trabalho do caralho. Sério mesmo.',
      'Bum: {budget} detonado, {over} a mais. Miojo até o dia do pagamento, porra.'
    ],
    budget_80: [
      '{budget} está em {percent}%. Sobram {left} para {days_left} {days_left#dia|dias}. Boa sorte, porra.',
      '«{desc}» por {amount}, e só sobram {left}. Pisa na porra do freio antes que seja tarde.',
      '{percent}% do orçamento já foi e o período nem acabou. Tá de sacanagem comigo?',
      'Mais dois «{desc}» e {budget} vai pro caralho. Sobram {left}.',
      '{percent}% do orçamento já era. Freio existe por um motivo, caralho.'
    ],
    allowance: [
      'Hoje dava para gastar {daily} e você torrou {spent}. Amanhã o almoço é vento.',
      '«{desc}» por {amount}, e o limite diário de {daily} foi pra merda. {over} a mais.',
      'Limite diário: {daily}. Gasto: {spent}. Matemática claramente não é a porra do seu forte.',
      'Você comeu {times} dias de orçamento num dia só. Que apetite do caralho.',
      'O plano era {daily} por dia. Você disse «foda-se o plano» e meteu {over} a mais.',
      '{spent} num dia com orçamento de {daily}. Nível olímpico de torrar dinheiro, porra.'
    ],
    challenge: [
      'Sua semana sem «{category}» durou {days} {days#dia|dias}. Força de vontade nível «foda-se».',
      'Você prometeu uma semana sem «{category}». A promessa custou {amount}. Que papo furado.',
      '«{desc}» por {amount}, e o desafio de «{category}» foi pro caralho. Nem me surpreende.',
      'Caiu em «{desc}». Uma semana sem «{category}» era demais, né, {campeão|campeã}?',
      'O desafio de «{category}» morreu. Espero que «{desc}» tenha sido bom pra caralho, pelo menos.'
    ],
    impulse: [
      '«{desc}» por {amount}: {times} vezes o seu gasto normal. Quem você pensa que é, porra, milionário?',
      'Você costuma gastar uns {median}, e do nada {amount} em «{desc}». Quem caralhos te deixou solto com dinheiro?',
      'Parabéns, {idiota|idiota|gênio do caralho}. «{desc}» por {amount}. Satisfeito{|a}?',
      '{amount} de uma tacada em «{desc}». Impulso: sim. Cérebro: nem fodendo.',
      '«{desc}», {amount}. Semana que vem você vai olhar isso e pensar «que porra é essa?». Eu já estou pensando.',
      '{times} vezes a sua compra normal. Você pirou de vez, caralho.'
    ],
    junk: [
      'Parabéns: «{desc}» por {amount} em vez de algo útil. Pra que porra?',
      '«{desc}»: número {count} neste período, {sum} no total. Constante na merda. Respeito.',
      'Mais {amount} em «{desc}». Nesse ritmo vai precisar de financiamento pra essa merda.',
      '{sum} neste período em «{desc}» e merdas parecidas. E depois «pra onde vai meu dinheiro?», né.',
      'De novo {amount} jogados fora em «{desc}». Sua carteira está pedindo asilo, porra.'
    ],
    junk_fastfood: [
      '«{desc}» por {amount} em vez de uma sacola de mercado. Bravo, porra.',
      'Fast food número {count} neste período, {sum} no total. O fogão é a porra de um enfeite?'
    ],
    junk_delivery: [
      'Delivery de {amount}. O entregador já sabe seu nome e sua carteira quer te mandar à merda.',
      'Delivery número {count} neste período, {sum} no total. A cozinha fica a cinco metros, caralho.'
    ],
    junk_alcohol: [
      '«{desc}» por {amount}. Número {count} neste período: não é festa, é a porra de uma assinatura.',
      '«{desc}»: {amount}. {sum} bebidos neste período. Que vida boa, hein, caralho.'
    ],
    junk_smoking: [
      '«{desc}»: {amount}. {sum} neste período, virando fumaça. Genial pra caralho.',
      '{amount} em «{desc}». Você está literalmente tacando fogo em dinheiro.'
    ],
    junk_energy: [
      'Energético por {amount}. Energia: pra caralho. Dinheiro: porra nenhuma.',
      'Lata número {count} neste período, {sum} no total. Ficar acordado pelo preço de uma porra de um jantar.'
    ],
    junk_taxi: [
      'Uber por {amount}. As pernas são a porra de um enfeite?',
      'Corrida número {count} neste período, {sum} no total. Compra logo a porra de um carro.'
    ],
    week_more: [
      'Esta semana custou {percent}% a mais que o normal, {amount} extra. Comemorando o quê, porra?',
      '{amount} acima de uma semana normal. O dinheiro está descendo pelo ralo como se estivesse atrasado.',
      'Uma semana {amount} mais cara. Cadê a porra do seu freio?'
    ],
    week_less: [
      'Esta semana saiu {percent}% mais barata. Caralho. Você anotou tudo mesmo?',
      '{amount} abaixo de uma semana normal. Porra, conseguiu. Não acredito, mas respeito.',
      'Economizou {amount}. Não se empolga, o fim de semana vai foder com tudo.'
    ],
    week_same: [
      'Uma semana como qualquer outra: {total}. A mesma merda de sempre, estável.',
      'Nem melhor nem pior que o normal. Nada pra reclamar, porra. Quase.'
    ],
    month_empty: [
      'Nenhum gasto neste período. Ou você virou monge, ou não anota porra nenhuma.',
      'Vazio pra caralho. Zero gastos. Não acredito nem fodendo.'
    ],
    month_open: [
      '{spent} em {days} {days#dia|dias}, {count} {count#gasto|gastos}. Bora revirar essa merda.',
      '{count} {count#gasto|gastos} somando {spent} em só {days} {days#dia|dias}. Puta que pariu.',
      'Total: {spent} em {days} {days#dia|dias}. Se segura, que vai doer.'
    ],
    month_top: [
      'O grande amor do período: «{category}», {sum}, {share}% de tudo. Caralho, que fã.',
      '«{category}» devorou {share}% do dinheiro: {sum}. O resto ficou com porra nenhuma.'
    ],
    month_biggest: [
      'A merda mais cara do período: «{desc}» por {amount}. Espero que tenha valido.',
      'Recorde do período: «{desc}», {amount}. Emoldura essa merda.'
    ],
    month_more: [
      'Comparado com o mesmo dia do período passado, você gasta {percent}% a mais, {amount} extra. Crescendo, porra. Na direção errada.',
      '{amount} a mais que da última vez. Inflação pessoal de {percent}%, puta merda.'
    ],
    month_less: [
      'Comparado com o mesmo dia do período passado: {percent}% a menos, {amount} economizados. Caralho, não acredito.',
      '{amount} economizados em relação ao período passado. Porra. Quem é você e cadê o dono da carteira?'
    ],
    month_budget_over: [
      'Seu orçamento total de {limit} estourou em {over}. O orçamento gritou e ninguém deu a mínima, porra.',
      'Orçamento: {percent}%. O limite de {limit} que se foda.'
    ],
    month_budget_ok: [
      'Sobram {left} do seu orçamento de {limit}. Segurando, mas estou de olho, caralho.',
      '{percent}% do orçamento gasto, sobram {left}. Não vai cagar tudo.'
    ],
    month_junk: [
      'Fast food, delivery e outras merdas: {count} {count#vez|vezes}, {sum}. Sua geladeira está puta.',
      '{count} compras inúteis somando {sum}. Não é fraqueza, é a porra de um estilo de vida.'
    ],
    month_verdict_bad: [
      'Veredito: sua carteira está fodida e pedindo asilo político.',
      'Resumo: o dinheiro entra e vaza na hora, caralho.'
    ],
    month_verdict_good: [
      'Veredito: decente de um jeito suspeito, porra. Continua assim, estou de olho.',
      'Resumo: quase nada pra reclamar. Quase.'
    ]
  }
};
