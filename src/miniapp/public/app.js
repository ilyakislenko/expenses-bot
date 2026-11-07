// Сценарии накоплений в Mini App: данные — /api/scenarios (вход по Telegram initData), кривые — тем же
// savingsForecast.simulate, что и в боте. Свой сценарий: база трат (в среднем / по плану / в этом месяце),
// доход и траты ползунками в процентах, срок 1–5 лет.
(function () {
  'use strict';
  var tg = window.Telegram && window.Telegram.WebApp;
  var app = document.getElementById('app');
  var COLORS = { average: '#ff8a5c', plan: '#b07cff', current: '#4f9dff' };
  var YEARS = [1, 2, 3, 5];
  var data = null;
  var state = { base: null, incomePct: 0, spendingPct: 0, years: 1 };

  function t(key, params) {
    var text = (data && data.strings[key]) || key;
    Object.keys(params || {}).forEach(function (name) { text = text.split('{' + name + '}').join(String(params[name])); });
    return text;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      if (name === 'text') node.textContent = attrs[name];
      else if (name.indexOf('on') === 0) node.addEventListener(name.slice(2), attrs[name]);
      else node.setAttribute(name, attrs[name]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function status(text) {
    app.innerHTML = '';
    app.appendChild(el('p', { class: 'status', text: text }));
  }

  // Как compactAmount в боте: «1,53 млн ₽», «241 тыс ₽», меньше — целые
  var NUMBER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  function compact(amount) {
    var value = Number(amount) || 0;
    var sign = value < 0 ? '−' : '';
    var abs = Math.abs(value);
    var units = data.units;
    var thousands = Math.round(abs / 1000);
    if (abs >= 1e6 || thousands >= 1000) {
      var millions = abs / 1e6;
      var parts = millions.toFixed(millions < 10 ? 2 : millions < 100 ? 1 : 0).split('.');
      var fraction = (parts[1] || '').replace(/0+$/, '');
      var number = NUMBER.format(Number(parts[0])) + (fraction ? (units.comma ? ',' : '.') + fraction : '');
      return sign + units.million.replace('{n}', number) + ' ' + units.symbol;
    }
    if (abs >= 10000) return sign + units.thousand.replace('{n}', NUMBER.format(thousands)) + ' ' + units.symbol;
    return sign + NUMBER.format(Math.round(abs)) + ' ' + units.symbol;
  }
  function signed(amount) { return (amount >= 0 ? '+' : '') + compact(amount); }

  function series(monthly, months) {
    return window.savingsForecast.simulate({
      parts: data.parts, monthly: monthly, months: months,
      yieldRate: data.rates.yieldRate, inflationRate: data.rates.inflationRate, contributionGrowth: data.rates.contributionGrowth
    }).points.map(function (p) { return p.nominal; });
  }

  // Подписи месяцев: «нояб.», год — у первого, последнего и января; при сроке больше года — у всех
  function monthLabels(months) {
    var start = new Date(data.today + 'T12:00:00Z');
    var month = new Intl.DateTimeFormat(data.locale, { month: 'short', timeZone: 'UTC' });
    var year = new Intl.DateTimeFormat(data.locale, { year: '2-digit', timeZone: 'UTC' });
    var labels = [];
    for (var k = 0; k <= months; k++) {
      var date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + k, 1, 12));
      // Срок больше года — год у каждой подписи (иначе «авг.» непонятно какого года)
      var withYear = months > 12 || k === 0 || k === months || date.getUTCMonth() === 0;
      labels.push(withYear ? month.format(date) + ' ' + year.format(date).replace(/\D/g, '') : month.format(date));
    }
    return labels;
  }

  function chart(lines, months) {
    var W = 360, H = 230, left = 8, right = W - 74, top = 12, bottom = H - 28;
    var max = 1;
    lines.forEach(function (line) { line.values.forEach(function (v) { if (v > max) max = v; }); });
    max *= 1.08;
    var x = function (i) { return left + (i / months) * (right - left); };
    var y = function (v) { return bottom - (Math.max(0, v) / max) * (bottom - top); };
    var svg = '';
    for (var g = 1; g <= 4; g++) {
      var gy = bottom - (g / 4) * (bottom - top);
      svg += '<line x1="' + left + '" x2="' + right + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--grid)" stroke-width="1"/>';
    }
    var labels = monthLabels(months);
    var step = Math.ceil(months / 4);
    for (var i = 0; i <= months; i += step) {
      svg += '<text x="' + x(i) + '" y="' + (H - 8) + '" font-size="10" fill="var(--muted)" text-anchor="' + (i === 0 ? 'start' : 'middle') + '">' + labels[i] + '</text>';
    }
    var ends = [];
    lines.forEach(function (line) {
      var points = line.values.map(function (v, k) { return x(k).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
      svg += '<polyline points="' + points + '" fill="none" stroke="' + line.color + '" stroke-width="' + (line.mine ? 3.5 : 1.8) + '"' +
        (line.dash ? ' stroke-dasharray="6 5"' : '') + (line.mine ? '' : ' opacity="0.75"') + ' stroke-linejoin="round" stroke-linecap="round"/>';
      ends.push({ y: y(line.values[months]) + 4, text: compact(line.values[months]), color: line.color, mine: line.mine });
    });
    ends.sort(function (a, b) { return b.y - a.y; });
    for (var e = 1; e < ends.length; e++) ends[e].y = Math.min(ends[e].y, ends[e - 1].y - 13);
    ends.forEach(function (end) {
      svg += '<text x="' + (right + 6) + '" y="' + end.y + '" font-size="' + (end.mine ? 12 : 10.5) + '" font-weight="' + (end.mine ? 700 : 500) + '" fill="' + end.color + '">' + end.text + '</text>';
    });
    svg += '<circle cx="' + x(0) + '" cy="' + y(data.total) + '" r="4" fill="var(--text)"/>';
    var wrap = el('div');
    wrap.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + svg + '</svg>';
    return wrap;
  }

  // Каркас экрана: заголовок, места под итог и график, управление. Чипы перестраивают экран (render),
  // ползунки во время движения обновляют только итог, график и свои подписи (update)
  var view = {};
  function render() {
    app.innerHTML = '';
    app.appendChild(el('h1', { text: t('miniapp_title') }));
    app.appendChild(el('div', { class: 'muted', text: t('miniapp_now', { amount: compact(data.total) }) + (data.family ? ' · ' + t('miniapp_family') : '') }));
    view.result = el('div', { class: 'card result' });
    view.chart = el('div', { class: 'card' });
    app.appendChild(view.result);
    app.appendChild(view.chart);

    var controls = el('div', { class: 'card' });
    controls.appendChild(el('div', { class: 'label' }, [el('b', { text: t('miniapp_spending_base') })]));
    var chips = el('div', { class: 'chips' });
    data.scenarios.forEach(function (s) {
      chips.appendChild(el('button', {
        class: 'chip' + (s.key === state.base ? ' on' : ''), text: t('savings_scen_leg_' + s.key) + ' · ' + compact(s.spending),
        onclick: function () { state.base = s.key; haptic(); render(); }
      }));
    });
    controls.appendChild(chips);
    view.spending = slider('miniapp_spending', -50, 50, 1, function () { return state.spendingPct; }, function (v) { state.spendingPct = v; });
    view.income = slider('miniapp_income', -50, 100, 5, function () { return state.incomePct; }, function (v) { state.incomePct = v; });
    controls.appendChild(view.spending.node);
    controls.appendChild(view.income.node);
    controls.appendChild(el('div', { class: 'label' }, [el('b', { text: t('miniapp_horizon') })]));
    var years = el('div', { class: 'chips' });
    YEARS.forEach(function (n) {
      years.appendChild(el('button', { class: 'chip' + (n === state.years ? ' on' : ''), text: t('miniapp_years_' + n), onclick: function () { state.years = n; haptic(); render(); } }));
    });
    controls.appendChild(years);
    view.reset = el('button', { class: 'reset', text: t('miniapp_reset'), onclick: function () { state.incomePct = 0; state.spendingPct = 0; haptic(); render(); } });
    controls.appendChild(view.reset);
    app.appendChild(controls);
    update();
  }

  function update() {
    var months = state.years * 12;
    var base = data.scenarios.filter(function (s) { return s.key === state.base; })[0];
    var income = data.income.amount * (1 + state.incomePct / 100);
    var spending = base.spending * (1 + state.spendingPct / 100);
    var monthly = income - spending;
    var lines = data.scenarios.map(function (s) {
      return { key: s.key, color: COLORS[s.key], dash: s.key === 'plan', values: series(data.income.amount - s.spending, months) };
    });
    var mine = series(monthly, months);
    var changed = state.incomePct !== 0 || state.spendingPct !== 0;
    if (changed) lines.push({ color: 'var(--mine)', mine: true, values: mine });
    var baseLine = lines.filter(function (l) { return l.key === state.base; })[0];

    view.result.innerHTML = '';
    view.result.appendChild(document.createTextNode(t('miniapp_result', { period: t('miniapp_years_' + state.years), amount: compact(mine[months]) })));
    view.result.appendChild(el('small', { text: monthly >= 0 ? t('miniapp_monthly', { amount: compact(monthly) }) : t('miniapp_monthly_negative', { amount: compact(-monthly) }) }));
    if (changed) {
      var delta = mine[months] - baseLine.values[months];
      view.result.appendChild(el('small', { class: delta >= 0 ? 'delta-up' : 'delta-down', text: t('miniapp_vs_base', { delta: signed(delta), base: t('savings_scen_leg_' + state.base) }) }));
    }

    view.chart.innerHTML = '';
    view.chart.appendChild(chart(lines, months));
    var legend = el('div', { class: 'legend' });
    data.scenarios.forEach(function (s) { var item = el('span', { text: t('savings_scen_leg_' + s.key) }); item.style.setProperty('--c', COLORS[s.key]); legend.appendChild(item); });
    if (changed) { var own = el('span', { text: t('miniapp_your') }); own.style.setProperty('--c', 'var(--mine)'); legend.appendChild(own); }
    view.chart.appendChild(legend);

    view.spending.label(spending);
    view.income.label(income);
    view.reset.style.display = changed ? '' : 'none';
  }

  // Ползунок в процентах: подпись «Траты: 160 тыс ₽ в месяц» и «−10%»
  function slider(key, min, max, step, get, set) {
    var title = el('b');
    var value = el('span', { class: 'muted' });
    var node = el('div', {}, [el('div', { class: 'label' }, [title, value])]);
    node.appendChild(el('input', {
      type: 'range', min: String(min), max: String(max), step: String(step), value: String(get()),
      oninput: function (event) {
        var v = Number(event.target.value);
        if (v === get()) return;
        set(v);
        haptic();
        update();
      }
    }));
    return {
      node: node,
      label: function (amount) {
        var pct = get();
        title.textContent = t(key, { amount: compact(amount) });
        value.textContent = (pct > 0 ? '+' : '') + pct + '%';
      }
    };
  }

  function haptic() {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
  }

  if (!tg || !tg.initData) {
    status('Открой приложение кнопкой в боте · Open it from the bot');
    return;
  }
  tg.ready();
  tg.expand();
  fetch('api/scenarios', { headers: { Authorization: 'tma ' + tg.initData } })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (reply) {
      if (!reply.ok) {
        data = null;
        status(reply.body.error === 'auth' ? 'Открой приложение кнопкой в боте · Open it from the bot' : 'Не получилось загрузить · Could not load');
        return;
      }
      data = reply.body;
      if (!data.income || !data.scenarios.length) {
        status(!data.income ? t('miniapp_no_income') : t('miniapp_error'));
        return;
      }
      var keys = data.scenarios.map(function (s) { return s.key; });
      state.base = keys.indexOf('current') >= 0 ? 'current' : keys[0];
      render();
    })
    .catch(function () { status('Не получилось загрузить · Could not load'); });
})();
