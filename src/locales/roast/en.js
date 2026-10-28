// Roast mode — English. Template syntax (utils/roast.js): {param}; {m|f} gendered forms (skipped for «rather
// not say»); {m|f|neutral}; {n#one|other} — word by number. No Markdown in templates.
module.exports = {
  labels: {
    total_budget: 'your total budget',
    category_budget: 'your «{category}» budget'
  },

  spicy: {
    budget_over: [
      'And that\'s {budget} gone: {spent} against a {limit} limit. Over by {over}. Turns out the limit was just a suggestion.',
      '«{desc}» for {amount} — and {budget} is officially dead. A moment of silence, please.',
      'Congrats, you beat {budget} by {over}. Shame it\'s not the kind of record people brag about.',
      '{days_left} {days_left#day|days} left in the period and {budget} is already {over} in the red. Bold strategy.',
      'You set the {limit} limit yourself. Then you stepped right over it — by {over}. At least someone keeps their word… oh wait.',
      '{budget}: {percent}%. A hundred percent is for boring people, right?',
      'The budget was {limit}. Was. Now it\'s {spent}, and the budget is just a fond memory.'
    ],
    budget_80: [
      '{budget} is at {percent}%. {left} left for {days_left} {days_left#day|days}. Good luck — you\'ll need it.',
      '«{desc}» for {amount}, and only {left} left before the limit. Great time to start saving. Yesterday.',
      'You\'re hugging the limit: {percent}%. Two more «{desc}» and it\'s game over.',
      '{left} for the rest of the period. That\'s not a budget anymore, that\'s a survival quest.',
      'Only {left} left on {budget}. Sure «{desc}» was worth it?',
      '{percent}% of the budget is behind you, but the period isn\'t. Interesting order of events.'
    ],
    allowance: [
      'Today\'s limit: {daily}. Spent: {spent}. Tomorrow is already paying for today.',
      'You could spend {daily} today, and {spent} is gone. Over by {over} — tomorrow will feel it.',
      '«{desc}» for {amount} — and the {daily} daily limit is history. Along with the plan.',
      'You burned {times} days\' worth of allowance in one go. Efficient, I\'ll give you that.',
      'The limit was {daily}. You read it as a hint, not a rule: {spent}.',
      'Plan for the day: {daily}. Reality: {spent}. The plan was ambitious, but not that ambitious.',
      'Today\'s allowance died on «{desc}». Fresh start tomorrow, yeah?'
    ],
    challenge: [
      'Your week without «{category}» lasted {days} {days#day|days}. A record — just not a world one.',
      'You promised yourself a week without «{category}». The promise cost {amount}.',
      '«{desc}» for {amount} — and the «{category}» challenge joins the challenge graveyard.',
      'Willpower: {days} {days#day|days}. Price of surrender: {amount}.',
      'Challenge failed. Hope «{desc}» was at least worth it.',
      'Folded on «{desc}». A whole week without «{category}» — so long, so hard, seven entire days.'
    ],
    impulse: [
      '«{desc}» for {amount} — {times}× your usual spend ({median}). Impulse noted.',
      'You usually spend about {median}. And now {amount} on «{desc}». Something happen, or just felt like it?',
      '{amount} in one go. Didn\'t see that coming from yourself? Neither did I.',
      'That\'s {cat_times} of your usual «{category}» purchases in one swipe. Grand gesture.',
      '«{desc}» for {amount}. Hope you still love it next week.',
      'Impulse buy of the day: «{desc}», {amount}. Your median purchase is {median}, just saying.',
      '{times}× pricier than usual. Somewhere, your wallet is quietly sobbing.'
    ],
    junk: [
      '«{desc}» for {amount}. That\'s number {count} this period, {sum} total. Consistency is a sign of mastery.',
      '«{desc}» — {amount}. A habit worth {sum} this period. Great subscription, shame it\'s to nonsense.',
      'Plot twist: you don\'t have to buy «{desc}». But of course you did.',
      'Number {count} this period. «{desc}» might as well be a fixed expense now.',
      'Another {amount} on «{desc}». Your wallet added it to its list of grievances.',
      '«{desc}» strikes again: {sum} this period. That money could have… never mind.'
    ],
    junk_fastfood: [
      '«{desc}» for {amount} — fast food number {count} this period. Chef material you are not.',
      'Fast food: {sum} this period. Your fridge is offended and not speaking to you.',
      '«{desc}» for {amount} instead of a bag of groceries. Tasty, quick, expensive.'
    ],
    junk_delivery: [
      'Delivery for {amount}. The courier will start greeting you by name soon.',
      'Delivery number {count} this period, {sum} total. Is the stove just decorative?'
    ],
    junk_alcohol: [
      '«{desc}» for {amount}. Number {count} this period — that\'s not a party, that\'s a membership.',
      '«{desc}» — {amount}. Judging by the receipts, it\'s a holiday all year round.'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. {sum} this period, literally up in smoke.',
      '{amount} on «{desc}». Turns out you can smoke money too.'
    ],
    junk_energy: [
      'Energy drink for {amount}. More energy, less money.',
      'Can number {count} this period, {sum} total. Being awake is pricey these days.'
    ],
    junk_taxi: [
      'Taxi for {amount}. Legs are apparently just for show.',
      'Taxi number {count} this period, {sum} total. A bit more and buying a car would\'ve been cheaper.'
    ],
    week_more: [
      'This week cost {percent}% more than usual — {amount} extra. Living large, I see.',
      '{amount} over a normal week. Either you were celebrating or… no, you were celebrating.',
      '{total} this week, {percent}% above normal. The trend is lively. Your wallet isn\'t.',
      'A week {amount} pricier than usual. Monday is giving you a look.'
    ],
    week_less: [
      'This week was {percent}% cheaper than usual. Suspicious. Did you log everything?',
      '{amount} below a normal week. I don\'t believe it, but I like it.',
      'Saved {amount}. Don\'t relax — the weekend is coming for it.',
      '{total} this week, {percent}% under usual. Who are you and what did you do with the big spender?'
    ],
    week_same: [
      'A week like any other: {total}. Stability is a result too. A boring one, but still.',
      'No better, no worse than usual. Nothing to nitpick. Almost.',
      '{total} — exactly as always. Predictable as an alarm clock.'
    ],
    month_empty: [
      'Not a single expense this period. Either you\'re a saint or you\'re just not logging anything.',
      'Empty. Zero expenses. Suspiciously clean — like a flat right before guests arrive.'
    ],
    month_open: [
      '{spent} in {days} {days#day|days}, {count} {count#expense|expenses}. Let\'s take a look.',
      '{count} {count#expense|expenses} worth {spent} — in just {days} {days#day|days}. Impressive. Not in a good way.',
      'Total: {spent} in {days} {days#day|days}. Get comfortable, this will sting.'
    ],
    month_top: [
      'True love of the period: «{category}» — {sum}, {share}% of everything.',
      '«{category}» ate {share}% of the money — {sum}. The other categories got leftovers.',
      'Leading the race: «{category}» with {sum}. No contest.'
    ],
    month_biggest: [
      'Biggest purchase: «{desc}» for {amount}. Hope it was worth it.',
      'Record of the period: «{desc}», {amount}. Frame it.',
      '«{desc}» for {amount} — the heaviest blow to your wallet.'
    ],
    month_more: [
      'Compared to the same day last period, you\'re spending {percent}% more — {amount} extra. Growing. In the wrong direction.',
      '{amount} more than last time by this day. Your personal inflation: {percent}%.',
      '{percent}% up on last period. If that was the plan, it worked.'
    ],
    month_less: [
      'Compared to the same day last period — {percent}% less, {amount} saved. I can\'t believe my eyes.',
      '{amount} saved versus last period. Who are you and where is the real owner of this wallet?',
      '{percent}% down on last period. Praise? Fine, a little.'
    ],
    month_budget_over: [
      'Your {limit} total budget is blown by {over}. The budget cried; nobody listened.',
      'Budget: {percent}%. The {limit} limit is history.'
    ],
    month_budget_ok: [
      '{left} left of your {limit} budget. Holding on. For now.',
      '{percent}% of the budget spent, {left} to spare. Don\'t jinx it.'
    ],
    month_junk: [
      'Fast food, delivery and other joys: {count} {count#time|times}, {sum}. Your fridge is depressed.',
      '{count} junk purchases worth {sum}. That\'s not a weakness, that\'s a hobby.',
      '{sum} on assorted nonsense across {count} {count#purchase|purchases}. Could have saved it, but who does that.'
    ],
    month_verdict_bad: [
      'Verdict: your wallet is requesting political asylum.',
      'Bottom line: money doesn\'t stay with you. It doesn\'t even take its shoes off.',
      'Verdict: great plan. Shame it stayed a plan.'
    ],
    month_verdict_good: [
      'Verdict: suspiciously decent. Keep it up, I\'m watching.',
      'Bottom line: barely anything to roast. Barely — because I\'m feeling generous.',
      'Verdict: holding up well. Don\'t get cocky.'
    ]
  },

  savage: {
    budget_over: [
      'Well done, genius — {budget} is fucked: {spent} against {limit}. {over} over. Happy now?',
      '«{desc}» for {amount}, and {budget} just went to shit. {over} over. Slow clap, motherfucker.',
      'You set the limit yourself and then fucked it yourself: {percent}%. What a goddamn circus.',
      '{days_left} {days_left#day|days} to go and {budget} is already {over} deep in the shit. Plan: crap. Execution: worse.',
      'The limit was {limit}. Now it\'s {spent}. That\'s not overspending, that\'s a fucking catastrophe at {percent}%.',
      'You blew {budget} by {over}. Fantastic fucking work. Truly.',
      'Boom — {budget} is done, {over} over. Ramen until payday, I guess.'
    ],
    budget_80: [
      '{budget} is at {percent}%. {left} left for {days_left} {days_left#day|days}. Good fucking luck.',
      '«{desc}» for {amount}, and only {left} left. Hit the damn brakes before it\'s too late.',
      '{percent}% of the budget gone and the period isn\'t even over. Are you fucking kidding me?',
      'Two more «{desc}» and {budget} is screwed. {left} left.',
      '{left} for the rest of the period. That\'s not a budget, that\'s a goddamn survival game.',
      '{percent}% of the budget gone already. Brakes exist for a fucking reason.'
    ],
    allowance: [
      'You could spend {daily} today and you blew {spent}. Air for lunch tomorrow.',
      '«{desc}» for {amount} — and the {daily} daily limit went to shit. {over} over.',
      'Daily limit: {daily}. Spent: {spent}. Math is clearly not your fucking strength.',
      'You ate {times} days\' worth of allowance in one day. Hell of an appetite.',
      'The plan was {daily} a day. You said «fuck the plan» and tossed in {over} extra.',
      'Today\'s allowance died on «{desc}». Rest in peace, you reckless bastard.',
      '{spent} in a day against a {daily} allowance. Olympic-level fucking spending.'
    ],
    challenge: [
      'Your week without «{category}» lasted {days} {days#day|days}. Willpower level: «fuck it».',
      'You promised a week without «{category}». That promise cost {amount}. Bullshitter.',
      '«{desc}» for {amount}, and the «{category}» challenge is fucked. Not even surprised.',
      'Caved on «{desc}». A week without «{category}» was just too damn long, huh?',
      'Willpower: {days} {days#day|days}. Price of surrender: {amount}. Pathetic as hell.',
      'The «{category}» challenge is dead. Hope «{desc}» was fucking amazing at least.'
    ],
    impulse: [
      '«{desc}» for {amount} — {times}× your usual spend. Who the fuck do you think you are, a millionaire?',
      'You usually spend about {median}, then bam — {amount} on «{desc}». Who the hell let you near money?',
      'Nice one, dumbass. «{desc}» for {amount}. Happy now?',
      'That\'s {cat_times} of your usual «{category}» purchases at once. Big fucking spender.',
      '{amount} in one shot on «{desc}». Impulse: yes. Brain: no.',
      '«{desc}», {amount}. Next week you\'ll look at this and go «why the fuck?». I already am.',
      '{times}× your usual purchase. You\'ve completely lost it.'
    ],
    junk: [
      'Nice one, dumbass: «{desc}» for {amount} instead of something useful. Happy now?',
      '«{desc}» — number {count} this period, {sum} total. Consistently shit. Respect.',
      'Another {amount} on «{desc}». At this rate you\'ll need a mortgage for this crap.',
      '{sum} this period on «{desc}» and similar crap. Then «where does my money go», right.',
      '«{desc}» again? Number {count}, for fuck\'s sake. It\'s not a purchase anymore, it\'s a tradition.',
      'You blew {amount} on «{desc}» again. Your wallet is filing for asylum.'
    ],
    junk_fastfood: [
      'Well done, dumbass — «{desc}» for {amount} instead of a bag of groceries. Happy now?',
      'Fast food number {count} this period, {sum} total. Is your stove just fucking decor?',
      '«{desc}» for {amount}. Could\'ve eaten properly three times, but no, fuck that.'
    ],
    junk_delivery: [
      'Delivery for {amount}. The courier knows your name, and your wallet wants to tell you to fuck off.',
      'Delivery number {count} this period, {sum} total. The kitchen is five fucking meters away.'
    ],
    junk_alcohol: [
      '«{desc}» for {amount}. Number {count} this period — not a party, a goddamn membership.',
      '«{desc}» — {amount}. {sum} drunk away this period. Living the high life, huh.'
    ],
    junk_smoking: [
      '«{desc}» — {amount}. {sum} this period, literally up in smoke. Fucking brilliant.',
      '{amount} on «{desc}». You\'re literally setting money on fire.'
    ],
    junk_energy: [
      'Energy drink for {amount}. Energy: shitloads. Money: fuck all.',
      'Can number {count} this period, {sum} total. Being awake at the price of a damn dinner.'
    ],
    junk_taxi: [
      'Taxi for {amount}. Are your legs just for fucking decoration?',
      'Taxi number {count} this period, {sum} total. Should\'ve just bought a damn car.'
    ],
    week_more: [
      'This week cost {percent}% more than usual, {amount} extra. Celebrating something, are we?',
      '{amount} over a normal week. Money is going down the drain like it\'s late for something.',
      '{total} this week, {percent}% above normal. Fucking stellar trend, keep me posted.',
      'A week {amount} pricier. Where the hell are your brakes?'
    ],
    week_less: [
      'This week was {percent}% cheaper than usual. Holy shit. Did you actually log everything?',
      '{amount} below a normal week. Damn, you did it. I don\'t believe it, but respect.',
      'Saved {amount}. Don\'t get cocky, the weekend will fuck it up.',
      '{total} this week, {percent}% under usual. Who the hell are you and where\'s the real spender?'
    ],
    week_same: [
      'A week like any other: {total}. Same old shit, stable.',
      'No better, no worse than usual. Nothing to bitch about. Almost.',
      '{total} — as always. Predictable as a damn Monday.'
    ],
    month_empty: [
      'Not one expense this period. Either you\'re a saint or you\'re not logging shit.',
      'Empty as hell. Zero expenses. I don\'t buy it for a second.'
    ],
    month_open: [
      '{spent} in {days} {days#day|days}, {count} {count#expense|expenses}. Let\'s dig through this shitshow.',
      '{count} {count#expense|expenses} worth {spent} — in just {days} {days#day|days}. Holy hell.',
      'Total: {spent} in {days} {days#day|days}. Brace yourself, this is gonna hurt.'
    ],
    month_top: [
      'True love of the period: «{category}» — {sum}, {share}% of everything. Damn, you\'re a fan.',
      '«{category}» devoured {share}% of the money — {sum}. Everything else got fuck all.',
      'Leading the race: «{category}» with {sum}. Nobody else stood a fucking chance.'
    ],
    month_biggest: [
      'Most expensive crap of the period: «{desc}» for {amount}. Hope it was worth it.',
      'Record of the period: «{desc}», {amount}. Frame that shit.',
      '«{desc}» for {amount} — the heaviest hit to your wallet. Bam, money gone.'
    ],
    month_more: [
      'Same day last period you\'d spent {percent}% less — you\'re {amount} up. Growing, damn it. In the wrong direction.',
      '{amount} more than last time. Personal inflation of {percent}%, holy shit.',
      '{percent}% up on last period. If that was the plan, the plan sucks.'
    ],
    month_less: [
      'Same day last period — {percent}% less, {amount} saved. Holy shit, I can\'t believe it.',
      '{amount} saved versus last period. Damn. Who are you and where\'s the wallet\'s real owner?',
      '{percent}% down on last period. Praise? Fine, damn it, good job.'
    ],
    month_budget_over: [
      'Your {limit} total budget is blown by {over}. The budget screamed and nobody gave a shit.',
      'Budget: {percent}%. The {limit} limit can go fuck itself.'
    ],
    month_budget_ok: [
      '{left} left of your {limit} budget. Holding on, but I\'m fucking watching.',
      '{percent}% of the budget spent, {left} to spare. Don\'t screw it up.'
    ],
    month_junk: [
      'Fast food, delivery and other crap: {count} {count#time|times}, {sum}. Your fridge is pissed.',
      '{count} junk purchases worth {sum}. Not a weakness — a fucking lifestyle.',
      '{sum} on assorted crap across {count} {count#purchase|purchases}. Could\'ve saved it, but why the hell would you.'
    ],
    month_verdict_bad: [
      'Verdict: your wallet is fucked and requesting political asylum.',
      'Bottom line: money flies in and immediately fucks off.',
      'Verdict: the plan was solid as hell. Shame it stayed a plan.'
    ],
    month_verdict_good: [
      'Verdict: suspiciously decent, damn it. Keep going, I\'m watching.',
      'Bottom line: barely anything to bitch about. Barely.',
      'Verdict: holding up like a boss. Don\'t get cocky.'
    ]
  }
};
