// Roast mode — English. Template syntax (utils/roast.js): {param}; {m|f} gendered forms (skipped for «rather
// not say»); {m|f|neutral}; {n#one|other} — word by number. No Markdown in templates.
// Situational variant — { when, text }, when = night | weekend | monday | payday (see ru.js). Append new variants
// at the end of a family: the index is the key remembered in roast_state.recent.
module.exports = {
  labels: {
    total_budget: 'your total budget',
    category_budget: 'your «{category}» budget'
  },

  spicy: {
    // {budget} {limit} {spent} {over} {percent} {amount} {desc} {days_left}
    budget_over: [
      'And that\'s {budget} gone: {spent} against a {limit} limit. Over by {over}. Turns out the limit was just a suggestion.',
      '«{desc}» for {amount} — and {budget} is officially dead. A moment of silence, please.',
      'Congrats, you beat {budget} by {over}. Shame it\'s not the kind of record people brag about.',
      '{days_left} {days_left#day|days} left in the period and {budget} is already {over} in the red. Bold strategy.',
      'You set the {limit} limit yourself. Then you stepped right over it — by {over}. At least someone keeps their word… oh wait.',
      '{budget}: {percent}%. A hundred percent is for boring people, right?',
      'The budget was {limit}. Was. Now it\'s {spent}, and the budget is just a fond memory.',
      '{spent} spent on a {limit} budget. Math was never your strong suit, was it?',
      'Over by {over} with {days_left} {days_left#day|days} still to go. The rest of the period will be powered by hope.',
      '«{desc}» for {amount} was the straw that broke {budget}. Elegant finish.',
      'Your limit: {limit}. Your vibe: «limits are for other people».',
      '{percent}% of the budget. You didn\'t just cross the line, you built a house on the other side.',
      { when: 'night', text: 'Blowing {budget} after midnight on «{desc}». Nothing good gets bought at this hour, and this proves it.' },
      { when: 'weekend', text: 'Weekend mode activated, {budget} deactivated. Over by {over}.' },
      { when: 'monday', text: 'It\'s Monday and {budget} is already over by {over}. Ambitious start to the week.' },
      { when: 'payday', text: 'Payday was days ago and {budget} is already {over} over. The salary barely had time to unpack.' },
      { when: 'payday', text: 'Fresh salary, fresh overspend: {spent} against {limit}. Speedrun record.' }
    ],
    // {budget} {limit} {spent} {left} {percent} {amount} {desc} {days_left}
    budget_80: [
      '{budget} is at {percent}%. {left} left for {days_left} {days_left#day|days}. Good luck — you\'ll need it.',
      '«{desc}» for {amount}, and only {left} left before the limit. Great time to start saving. Yesterday.',
      'You\'re hugging the limit: {percent}%. Two more «{desc}» and it\'s game over.',
      '{left} for the rest of the period. That\'s not a budget anymore, that\'s a survival quest.',
      'Only {left} left on {budget}. Sure «{desc}» was worth it?',
      '{percent}% of the budget is behind you, but the period isn\'t. Interesting order of events.',
      '{percent}% gone, {days_left} {days_left#day|days} to go. The rest of the period is going to be very minimalist.',
      '{left} left. Start practising the phrase «no thanks, I\'m good».',
      '«{desc}» for {amount} brought you to {percent}%. The limit can see you coming.',
      'Warning light on: {left} left of {limit}. This is the part where sensible people slow down.',
      '{spent} of {limit} already gone. The finish line is close — the bad kind of finish line.',
      'Just {left} between you and the red zone. Tread carefully, «{desc}» fan.'
    ],
    // {daily} {spent} {over} {amount} {desc} {times}
    allowance: [
      'Today\'s limit: {daily}. Spent: {spent}. Tomorrow is already paying for today.',
      'You could spend {daily} today, and {spent} is gone. Over by {over} — tomorrow will feel it.',
      '«{desc}» for {amount} — and the {daily} daily limit is history. Along with the plan.',
      'You burned {times} days\' worth of allowance in one go. Efficient, I\'ll give you that.',
      'The limit was {daily}. You read it as a hint, not a rule: {spent}.',
      'Plan for the day: {daily}. Reality: {spent}. The plan was ambitious, but not that ambitious.',
      'Today\'s allowance died on «{desc}». Fresh start tomorrow, yeah?',
      'Daily limit {daily}, today\'s damage {spent}. Tomorrow just got poorer by {over}.',
      '«{desc}» for {amount} turned today\'s budget into a rough draft.',
      '{over} over the daily limit. You\'re borrowing from future you, and future you is annoyed.',
      'Today\'s allowance was {daily}. It lasted until «{desc}».',
      'Spent {spent} on a {daily} day. Somewhere a spreadsheet is crying.',
      { when: 'night', text: 'The day\'s limit was {daily}, and you\'re still spending at this hour. Technically that\'s tomorrow\'s money already.' },
      { when: 'weekend', text: 'Weekend allowance: {daily}. Weekend reality: {spent}. Classic.' },
      { when: 'monday', text: 'Monday, and the daily limit is already broken by {over}. The week is off to a stunning start.' },
      { when: 'payday', text: 'Payday glow is real: {spent} today on a {daily} limit. The salary won\'t last at this pace.' },
      { when: 'night', text: 'Night-time «{desc}» for {amount}. The {daily} limit went to bed hours ago — so should you.' }
    ],
    // {category} {days} {amount} {desc}
    challenge: [
      'Your week without «{category}» lasted {days} {days#day|days}. A record — just not a world one.',
      'You promised yourself a week without «{category}». The promise cost {amount}.',
      '«{desc}» for {amount} — and the «{category}» challenge joins the challenge graveyard.',
      'Willpower: {days} {days#day|days}. Price of surrender: {amount}.',
      'Challenge failed. Hope «{desc}» was at least worth it.',
      'Folded on «{desc}». A whole week without «{category}» — so long, so hard, seven entire days.',
      'The «{category}» challenge ended with «{desc}». Short, sad, expensive.',
      '{amount} on «{category}» during a no-«{category}» week. Bold interpretation of the rules.',
      'You lasted {days} {days#day|days} without «{category}». A heroic effort, by goldfish standards.',
      'Challenge status: abandoned. Cause of death: «{desc}», {amount}.',
      'A week without «{category}» was the plan. «{desc}» had other plans.',
      'So the challenge is over. «{category}» wins, you lose {amount}.'
    ],
    // {amount} {desc} {median} {times} {category} {cat_times}
    impulse: [
      '«{desc}» for {amount} — {times}× your usual spend ({median}). Impulse noted.',
      'You usually spend about {median}. And now {amount} on «{desc}». Something happen, or just felt like it?',
      '{amount} in one go. Didn\'t see that coming from yourself? Neither did I.',
      'That\'s {cat_times} of your usual «{category}» purchases in one swipe. Grand gesture.',
      '«{desc}» for {amount}. Hope you still love it next week.',
      'Impulse buy of the day: «{desc}», {amount}. Your median purchase is {median}, just saying.',
      '{times}× pricier than usual. Somewhere, your wallet is quietly sobbing.',
      'Normal day: {median}. Today: {amount} on «{desc}». Something snapped.',
      '«{desc}» for {amount}? That decision took about four seconds, didn\'t it.',
      '{amount} in one go on «{desc}». Your median purchase is {median} and it\'s feeling very small right now.',
      'That «{category}» purchase was worth {cat_times} normal ones. Treat yourself, apparently.',
      'Buy now, think later — and later is now: {amount} for «{desc}».',
      { when: 'night', text: '«{desc}» for {amount} in the middle of the night. Late-night shopping: the most expensive hobby.' },
      { when: 'weekend', text: 'Weekend splurge detected: «{desc}» for {amount}, while you normally spend {median}.' },
      { when: 'monday', text: 'Monday blues treated with «{desc}» for {amount}. Therapy would\'ve been cheaper.' },
      { when: 'payday', text: 'Salary just landed and «{desc}» for {amount} is already out the door. Money doesn\'t sit still with you.' },
      { when: 'monday', text: '{amount} on a Monday. Coping mechanism or tradition?' }
    ],
    // {amount} {desc} {count} {sum} — общие для любой вредной траты; junk_<вид> — свои для вида
    junk: [
      '«{desc}» for {amount}. That\'s number {count} this period, {sum} total. Consistency is a sign of mastery.',
      '«{desc}» — {amount}. A habit worth {sum} this period. Great subscription, shame it\'s to nonsense.',
      'Plot twist: you don\'t have to buy «{desc}». But of course you did.',
      'Number {count} this period. «{desc}» might as well be a fixed expense now.',
      'Another {amount} on «{desc}». Your wallet added it to its list of grievances.',
      '«{desc}» strikes again: {sum} this period. That money could have… never mind.',
      '{sum} on «{desc}» this period. That\'s a small vacation, eaten one receipt at a time.',
      '«{desc}» again, {amount} again. Your bank statement is becoming repetitive.',
      'Small purchase, they said. Harmless, they said. {sum} later…',
      '«{desc}» for {amount}. It\'s not about the money. Okay, it is a bit about the money.',
      'Purchase number {count} of «{desc}». At this point it\'s a loyalty program.',
      '{amount} on «{desc}». Your future self has filed a complaint.',
      { when: 'night', text: '«{desc}» at this hour for {amount}. Bad ideas really do come out at night.' },
      { when: 'night', text: 'Middle of the night, «{desc}», {amount}. The wallet was asleep and you robbed it.' },
      { when: 'weekend', text: 'Weekend and «{desc}» for {amount}. Rest is important, but so is money.' },
      { when: 'weekend', text: 'It\'s the weekend, so «{desc}» costs {amount} and no regrets. Regrets arrive Monday.' },
      { when: 'monday', text: 'Monday started with «{desc}» for {amount}. Survival mode is expensive.' },
      { when: 'payday', text: 'Salary just arrived and is already being spent on «{desc}». It barely got to say hello.' },
      { when: 'payday', text: 'Payday mood: «{desc}» for {amount}. The rest of the month will remember this.' }
    ],
    junk_fastfood: [
      '«{desc}» for {amount} — fast food number {count} this period. Chef material you are not.',
      'Fast food: {sum} this period. Your fridge is offended and not speaking to you.',
      '«{desc}» for {amount} instead of a bag of groceries. Tasty, quick, expensive.',
      '«{desc}» for {amount}. Fast food, slow regret.',
      'Another fast food run: {sum} this period. Your kitchen is starting to feel like a museum.',
      '{amount} on «{desc}». Groceries cost less and don\'t come in a paper bag.',
      { when: 'night', text: 'Fast food at this hour, {amount}. The burger is fine — the timing and the wallet are not.' }
    ],
    junk_delivery: [
      'Delivery for {amount}. The courier will start greeting you by name soon.',
      'Delivery number {count} this period, {sum} total. Is the stove just decorative?',
      '{amount} for delivery. You\'re paying extra so the food can travel further than you.',
      'Delivery again: {sum} this period. The couriers are funding their holidays off you.',
      '«{desc}» delivered for {amount}. Walking was free, just saying.',
      { when: 'weekend', text: 'Weekend delivery for {amount}. Couch: 1, wallet: 0.' }
    ],
    junk_alcohol: [
      '«{desc}» for {amount}. Number {count} this period — that\'s not a party, that\'s a membership.',
      '«{desc}» — {amount}. Judging by the receipts, it\'s a holiday all year round.',
      '«{desc}» for {amount}. Cheers to a lighter wallet.',
      '{sum} this period on drinks. The bar knows your order, the bank knows your sins.',
      '{amount} on «{desc}». Tomorrow\'s regret came with a receipt.',
      { when: 'weekend', text: 'Weekend drinks: {amount} on «{desc}». The weekend ends, the statement stays.' }
    ],
    junk_smoking: [
      '«{desc}» — {amount}. {sum} this period, literally up in smoke.',
      '{amount} on «{desc}». Turns out you can smoke money too.',
      '{amount} on «{desc}». Money in, smoke out.',
      'Smokes again: {sum} this period. A very expensive way to make clouds.',
      '«{desc}» — {amount}. The price keeps going up and so do you, to the shop.'
    ],
    junk_energy: [
      'Energy drink for {amount}. More energy, less money.',
      'Can number {count} this period, {sum} total. Being awake is pricey these days.',
      '{amount} for a can of «{desc}». Sleep was cheaper.',
      'Energy drinks: {sum} this period. Your energy is up, your balance is down.',
      '«{desc}» for {amount}. Caffeine is a loan against tomorrow, with interest.',
      { when: 'monday', text: 'Monday energy drink, {amount}. The week hasn\'t started and you\'re already on credit.' }
    ],
    junk_taxi: [
      'Taxi for {amount}. Legs are apparently just for show.',
      'Taxi number {count} this period, {sum} total. A bit more and buying a car would\'ve been cheaper.',
      'Taxi, {amount}. The bus called, it misses you.',
      '{sum} on taxis this period. You\'re basically leasing a car one ride at a time.',
      '«{desc}» — {amount}. Walking is free and good for you, but sure.',
      { when: 'night', text: 'Night taxi for {amount}. Surge pricing thanks you for your loyalty.' }
    ],
    junk_coffee: [
      '«{desc}» for {amount}. A coffee machine would have paid for itself by now.',
      'Coffee number {count} this period, {sum} total. Barista knows your name, the bank knows your balance.',
      '{amount} for hot milk with a hint of coffee. Premium hydration.',
      '«{desc}» again. {sum} this period — that\'s a whole espresso machine in paper cups.',
      'Another {amount} latte. The foam art is nice; the price art is nicer.',
      { when: 'monday', text: 'Monday coffee for {amount}. Understandable. Still {amount}.' }
    ],
    junk_marketplace: [
      'Another parcel: «{desc}» for {amount}. Your hallway is becoming a warehouse.',
      'Marketplace order number {count} this period, {sum} total. The delivery guy is basically family.',
      '«{desc}» for {amount}. Something you\'ll unpack, admire for a day and forget forever.',
      '{amount} on «{desc}». The algorithm knew you\'d crack, and you did.',
      'Parcels this period: {sum}. Useful items among them: we\'ll never know.',
      { when: 'night', text: 'Marketplace scrolling at night ended with «{desc}» for {amount}. Of course it did.' }
    ],
    junk_games: [
      '«{desc}» for {amount}. Your backlog of unplayed games just grew again.',
      '{amount} on in-game stuff. Virtual items, very real money.',
      'Games this period: {sum}. Your Steam library is bigger than your savings.',
      '«{desc}» — {amount}. A sale is not a reason, it\'s a trap.',
      'Donation number {count} this period. The streamer thanks you; your wallet doesn\'t.',
      { when: 'weekend', text: 'Weekend gaming budget: {amount} on «{desc}». Achievement unlocked: broke.' }
    ],
    junk_subscription: [
      'Another subscription: «{desc}» for {amount}. You\'re subscribed to more things than you use.',
      '{amount} a month for «{desc}». Do you even remember the last time you opened it?',
      'Subscriptions this period: {sum}. That\'s a small salary for services you forget exist.',
      '«{desc}» renewed for {amount}. Autopay never sleeps.',
      'Subscription number {count}. Streaming everything, saving nothing.',
      { when: 'payday', text: 'Salary arrived, «{desc}» grabbed {amount} first. Subscriptions always get paid before you do.' }
    ],
    // {total} {percent} {amount}
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
    // {spent} {count} {days}
    month_open: [
      '{spent} in {days} {days#day|days}, {count} {count#expense|expenses}. Let\'s take a look.',
      '{count} {count#expense|expenses} worth {spent} — in just {days} {days#day|days}. Impressive. Not in a good way.',
      'Total: {spent} in {days} {days#day|days}. Get comfortable, this will sting.'
    ],
    // {category} {sum} {share}
    month_top: [
      'True love of the period: «{category}» — {sum}, {share}% of everything.',
      '«{category}» ate {share}% of the money — {sum}. The other categories got leftovers.',
      'Leading the race: «{category}» with {sum}. No contest.'
    ],
    // {amount} {desc}
    month_biggest: [
      'Biggest purchase: «{desc}» for {amount}. Hope it was worth it.',
      'Record of the period: «{desc}», {amount}. Frame it.',
      '«{desc}» for {amount} — the heaviest blow to your wallet.'
    ],
    // {percent} {amount}
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
    // {over} {limit} {percent}
    month_budget_over: [
      'Your {limit} total budget is blown by {over}. The budget cried; nobody listened.',
      'Budget: {percent}%. The {limit} limit is history.'
    ],
    // {left} {limit} {percent}
    month_budget_ok: [
      '{left} left of your {limit} budget. Holding on. For now.',
      '{percent}% of the budget spent, {left} to spare. Don\'t jinx it.'
    ],
    // {count} {sum}
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
    // {budget} {limit} {spent} {over} {percent} {amount} {desc} {days_left}
    budget_over: [
      'Well done, genius — {budget} is fucked: {spent} against {limit}. {over} over. Happy now?',
      '«{desc}» for {amount}, and {budget} just went to shit. {over} over. Slow clap, motherfucker.',
      'You set the limit yourself and then fucked it yourself: {percent}%. What a goddamn circus.',
      '{days_left} {days_left#day|days} to go and {budget} is already {over} deep in the shit. Plan: crap. Execution: worse.',
      'The limit was {limit}. Now it\'s {spent}. That\'s not overspending, that\'s a fucking catastrophe at {percent}%.',
      'You blew {budget} by {over}. Fantastic fucking work. Truly.',
      'Boom — {budget} is done, {over} over. Ramen until payday, I guess.',
      '{spent} on a {limit} budget. Who the fuck taught you maths?',
      'Over by {over} with {days_left} {days_left#day|days} left. Good fucking luck with that.',
      '«{desc}» for {amount} and {budget} is fucked. Worth it? Don\'t answer.',
      '{percent}% of the budget. The limit was {limit}, not a fucking starting point.',
      'You blew past {limit} like it owed you money. Over by {over}, genius.',
      { when: 'night', text: 'Fucking up {budget} after midnight with «{desc}». Go to sleep and put the card down.' },
      { when: 'night', text: 'Night shift of bullshit spending: {budget} is {over} over and it\'s not even morning.' },
      { when: 'weekend', text: 'Weekend, and {budget} is already blown by {over}. Party hard, go broke harder.' },
      { when: 'monday', text: 'Monday and {budget} is already fucked by {over}. Hell of a way to start the week.' },
      { when: 'payday', text: 'Salary barely landed and {budget} is {over} over. What the actual fuck.' }
    ],
    // {budget} {limit} {spent} {left} {percent} {amount} {desc} {days_left}
    budget_80: [
      '{budget} is at {percent}%. {left} left for {days_left} {days_left#day|days}. Good fucking luck.',
      '«{desc}» for {amount}, and only {left} left. Hit the damn brakes before it\'s too late.',
      '{percent}% of the budget gone and the period isn\'t even over. Are you fucking kidding me?',
      'Two more «{desc}» and {budget} is screwed. {left} left.',
      '{left} for the rest of the period. That\'s not a budget, that\'s a goddamn survival game.',
      '{percent}% of the budget gone already. Brakes exist for a fucking reason.',
      '{percent}% gone and {days_left} {days_left#day|days} to go. Shit\'s getting tight.',
      '{left} left. Stop buying crap now, not tomorrow.',
      '«{desc}» for {amount} pushed you to {percent}%. One more dumb buy and it\'s over.',
      '{spent} of {limit} gone. Put the damn card away.',
      'Only {left} left of {budget}. Spending like this, you\'ll be broke as hell by the weekend.',
      'Red zone is right there. {left} left, so maybe don\'t be a dumbass about it.'
    ],
    // {daily} {spent} {over} {amount} {desc} {times}
    allowance: [
      'You could spend {daily} today and you blew {spent}. Air for lunch tomorrow.',
      '«{desc}» for {amount} — and the {daily} daily limit went to shit. {over} over.',
      'Daily limit: {daily}. Spent: {spent}. Math is clearly not your fucking strength.',
      'You ate {times} days\' worth of allowance in one day. Hell of an appetite.',
      'The plan was {daily} a day. You said «fuck the plan» and tossed in {over} extra.',
      'Today\'s allowance died on «{desc}». Rest in peace, you reckless bastard.',
      '{spent} in a day against a {daily} allowance. Olympic-level fucking spending.',
      'Limit {daily}, spent {spent}. Tomorrow\'s money is already fucking gone.',
      '«{desc}» for {amount} and the daily limit can kiss your ass goodbye.',
      'Over by {over} today. Future you is going to be pissed.',
      '{daily} a day, and you couldn\'t even manage that. Damn.',
      'Daily budget: {daily}. Daily bullshit: {spent}.',
      { when: 'night', text: 'Still spending at this hour? The {daily} limit is long dead, go the fuck to sleep.' },
      { when: 'weekend', text: 'Weekend, so the {daily} limit means fuck all apparently: {spent}.' },
      { when: 'monday', text: 'Monday and the daily limit is already fucked by {over}. Great start, champ.' },
      { when: 'payday', text: 'Payday, so fuck the {daily} limit, right? {spent} today. The salary is crying.' },
      { when: 'payday', text: 'Salary just landed and you\'re already {over} over the daily limit. Holy shit, slow down.' }
    ],
    // {category} {days} {amount} {desc}
    challenge: [
      'Your week without «{category}» lasted {days} {days#day|days}. Willpower level: «fuck it».',
      'You promised a week without «{category}». That promise cost {amount}. Bullshitter.',
      '«{desc}» for {amount}, and the «{category}» challenge is fucked. Not even surprised.',
      'Caved on «{desc}». A week without «{category}» was just too damn long, huh?',
      'Willpower: {days} {days#day|days}. Price of surrender: {amount}. Pathetic as hell.',
      'The «{category}» challenge is dead. Hope «{desc}» was fucking amazing at least.',
      'The «{category}» challenge died on «{desc}». Shit discipline, expensive result.',
      '{days} {days#day|days} without «{category}». That\'s not willpower, that\'s a fucking warm-up.',
      'You caved for {amount}. Weak as hell.',
      '«{desc}» for {amount} during a no-«{category}» week. Rules? Never heard of the fuckers.',
      'Challenge over. «{category}» kicked your ass and charged {amount}.',
      'One week without «{category}». One week. And you still screwed it up.'
    ],
    // {amount} {desc} {median} {times} {category} {cat_times}
    impulse: [
      '«{desc}» for {amount} — {times}× your usual spend. Who the fuck do you think you are, a millionaire?',
      'You usually spend about {median}, then bam — {amount} on «{desc}». Who the hell let you near money?',
      'Nice one, dumbass. «{desc}» for {amount}. Happy now?',
      'That\'s {cat_times} of your usual «{category}» purchases at once. Big fucking spender.',
      '{amount} in one shot on «{desc}». Impulse: yes. Brain: no.',
      '«{desc}», {amount}. Next week you\'ll look at this and go «why the fuck?». I already am.',
      '{times}× your usual purchase. You\'ve completely lost it.',
      'Usual spend {median}, now {amount} on «{desc}». What the hell happened?',
      '«{desc}» for {amount}. Brain off, card out. Classic.',
      '{times}× your normal purchase. Did the card get stolen or are you just like this?',
      '{amount} on a whim. Fuck planning, right?',
      'That «{category}» buy was worth {cat_times} normal ones. Holy shit.',
      { when: 'night', text: '«{desc}» for {amount} at night. Nothing smart gets bought at this fucking hour.' },
      { when: 'night', text: 'Night-time impulse, {amount}. Put the phone down and sleep, damn it.' },
      { when: 'weekend', text: 'Weekend splurge: «{desc}» for {amount}. Normally you spend {median}, you lunatic.' },
      { when: 'monday', text: 'Monday sucks, so you dropped {amount} on «{desc}»? Cheaper to just scream into a pillow.' },
      { when: 'payday', text: 'Salary landed and you instantly dropped {amount} on «{desc}». Money burns a hole in your damn pocket.' }
    ],
    // {amount} {desc} {count} {sum} — общие для любой вредной траты; junk_<вид> — свои для вида
    junk: [
      'Nice one, dumbass: «{desc}» for {amount} instead of something useful. Happy now?',
      '«{desc}» — number {count} this period, {sum} total. Consistently shit. Respect.',
      'Another {amount} on «{desc}». At this rate you\'ll need a mortgage for this crap.',
      '{sum} this period on «{desc}» and similar crap. Then «where does my money go», right.',
      '«{desc}» again? Number {count}, for fuck\'s sake. It\'s not a purchase anymore, it\'s a tradition.',
      'You blew {amount} on «{desc}» again. Your wallet is filing for asylum.',
      '{sum} this period on «{desc}». That\'s a lot of money for fuck all.',
      '«{desc}» again for {amount}. Same shit, different day.',
      'Purchase number {count}. This crap is basically rent now.',
      '{amount} on «{desc}». Your wallet is begging you to fucking stop.',
      '«{desc}» — {amount}. Tiny purchase, massive dumbass energy.',
      'Small crap adds up, and yours added up to {sum}. Congrats.',
      { when: 'night', text: '«{desc}» at this hour for {amount}. Nothing good happens at night, especially to your money.' },
      { when: 'weekend', text: 'Weekend bullshit: «{desc}» for {amount}. Monday-you will be pissed.' },
      { when: 'weekend', text: 'Friday-to-Sunday crap tax: {amount} on «{desc}».' },
      { when: 'monday', text: 'Monday, «{desc}», {amount}. The week just started and you\'re already wasting shit.' },
      { when: 'monday', text: 'Coping with Monday via «{desc}» for {amount}. Expensive fucking therapy.' },
      { when: 'payday', text: 'Salary landed and the first thing you buy is «{desc}»? For fuck\'s sake.' }
    ],
    junk_fastfood: [
      'Well done, dumbass — «{desc}» for {amount} instead of a bag of groceries. Happy now?',
      'Fast food number {count} this period, {sum} total. Is your stove just fucking decor?',
      '«{desc}» for {amount}. Could\'ve eaten properly three times, but no, fuck that.',
      '«{desc}» for {amount}. Greasy crap at premium prices.',
      'Fast food this period: {sum}. Learn to cook, damn it.',
      '{amount} on «{desc}». Groceries exist, you lazy bastard.',
      { when: 'night', text: 'Night fast food for {amount}. Of course. Fucking of course.' }
    ],
    junk_delivery: [
      'Delivery for {amount}. The courier knows your name, and your wallet wants to tell you to fuck off.',
      'Delivery number {count} this period, {sum} total. The kitchen is five fucking meters away.',
      'Delivery again, {amount}. Your legs work, use the damn things.',
      '{sum} on delivery this period. The couriers should send you a fucking thank-you card.',
      '«{desc}» delivered for {amount}. Paying extra to not get off your ass.',
      { when: 'weekend', text: 'Weekend delivery for {amount}. Lazy as hell and paying for it.' }
    ],
    junk_alcohol: [
      '«{desc}» for {amount}. Number {count} this period — not a party, a goddamn membership.',
      '«{desc}» — {amount}. {sum} drunk away this period. Living the high life, huh.',
      '«{desc}» for {amount}. Drinking your damn money away.',
      'Booze this period: {sum}. That\'s one hell of an expensive bar tab.',
      '{amount} on «{desc}». Tomorrow\'s regret, prepaid like an idiot.',
      { when: 'weekend', text: 'Weekend booze, {amount}. Fuck saving, apparently.' }
    ],
    junk_smoking: [
      '«{desc}» — {amount}. {sum} this period, literally up in smoke. Fucking brilliant.',
      '{amount} on «{desc}». You\'re literally setting money on fire.',
      '{amount} on «{desc}». Literally setting money on fucking fire.',
      'Smokes this period: {sum}. Burning cash like a damn idiot.',
      '«{desc}» — {amount}. Shit gets pricier and you keep buying it anyway.'
    ],
    junk_energy: [
      'Energy drink for {amount}. Energy: shitloads. Money: fuck all.',
      'Can number {count} this period, {sum} total. Being awake at the price of a damn dinner.',
      '{amount} for «{desc}». Sleep is free, dumbass.',
      'Energy drinks: {sum} this period. Your wallet is fucking drained.',
      '«{desc}» again, {amount}. Liquid bullshit with a price tag.',
      { when: 'monday', text: 'Monday energy drink, {amount}. The week already kicked your ass.' }
    ],
    junk_taxi: [
      'Taxi for {amount}. Are your legs just for fucking decoration?',
      'Taxi number {count} this period, {sum} total. Should\'ve just bought a damn car.',
      'Taxi, {amount}. Walk, damn it.',
      '{sum} on taxis this period. Could\'ve bought a fucking bike.',
      '«{desc}» for {amount}. Buses exist, you lazy shit.',
      { when: 'night', text: 'Night taxi for {amount}. Surge pricing is fucking you and you\'re letting it.' }
    ],
    junk_coffee: [
      '«{desc}» for {amount}. Overpriced bean water, damn.',
      'Coffee number {count} this period, {sum} total. Buy a fucking coffee machine.',
      '{amount} for a latte. The milk better be made of gold.',
      'Coffee crap this period: {sum}. That\'s a lot of cash for hot milk.',
      '«{desc}» again for {amount}. The barista is getting rich off your dumb ass.',
      { when: 'monday', text: 'Monday coffee for {amount}. Fine, Mondays suck. Still overpriced as hell.' }
    ],
    junk_marketplace: [
      'Another fucking parcel: «{desc}» for {amount}. More junk for the pile.',
      'Marketplace order number {count}, {sum} total. Your flat is turning into a damn warehouse.',
      '«{desc}» for {amount}. You\'ll use it once, then it\'s shit in a drawer.',
      '{amount} on «{desc}». The algorithm played you like a fucking fiddle.',
      'Parcels this period: {sum}. Useful crap: approximately none.',
      { when: 'night', text: 'Night scrolling ended with «{desc}» for {amount}. Delete the damn app.' }
    ],
    junk_games: [
      '«{desc}» for {amount}. Another game you won\'t fucking finish.',
      '{amount} on in-game shit. Pixels cost real money, genius.',
      'Games this period: {sum}. Your library is huge, your savings are shit.',
      '«{desc}» — {amount}. A sale isn\'t a fucking reason.',
      'Donation number {count}. The streamer\'s living large off your dumb ass.',
      { when: 'weekend', text: 'Weekend gaming spree: {amount} on «{desc}». Game over for your wallet, damn it.' }
    ],
    junk_subscription: [
      'Another fucking subscription: «{desc}», {amount}. Do you even use half of them?',
      '{amount} for «{desc}». Paying for shit you forgot you had.',
      'Subscriptions this period: {sum}. Cancel some of this crap.',
      '«{desc}» auto-renewed for {amount}. Autopay is fucking you quietly.',
      'Subscription number {count}. Streaming everything, saving fuck all.',
      { when: 'payday', text: 'Salary hit and «{desc}» grabbed {amount} first. Subscriptions eat before you do, damn it.' }
    ],
    // {total} {percent} {amount}
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
    // {spent} {count} {days}
    month_open: [
      '{spent} in {days} {days#day|days}, {count} {count#expense|expenses}. Let\'s dig through this shitshow.',
      '{count} {count#expense|expenses} worth {spent} — in just {days} {days#day|days}. Holy hell.',
      'Total: {spent} in {days} {days#day|days}. Brace yourself, this is gonna hurt.'
    ],
    // {category} {sum} {share}
    month_top: [
      'True love of the period: «{category}» — {sum}, {share}% of everything. Damn, you\'re a fan.',
      '«{category}» devoured {share}% of the money — {sum}. Everything else got fuck all.',
      'Leading the race: «{category}» with {sum}. Nobody else stood a fucking chance.'
    ],
    // {amount} {desc}
    month_biggest: [
      'Most expensive crap of the period: «{desc}» for {amount}. Hope it was worth it.',
      'Record of the period: «{desc}», {amount}. Frame that shit.',
      '«{desc}» for {amount} — the heaviest hit to your wallet. Bam, money gone.'
    ],
    // {percent} {amount}
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
    // {over} {limit} {percent}
    month_budget_over: [
      'Your {limit} total budget is blown by {over}. The budget screamed and nobody gave a shit.',
      'Budget: {percent}%. The {limit} limit can go fuck itself.'
    ],
    // {left} {limit} {percent}
    month_budget_ok: [
      '{left} left of your {limit} budget. Holding on, but I\'m fucking watching.',
      '{percent}% of the budget spent, {left} to spare. Don\'t screw it up.'
    ],
    // {count} {sum}
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
