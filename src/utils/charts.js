// Графики картинками: чистые функции «данные → SVG». Растеризация — services/ChartRenderer.js.
// Тексты приходят готовыми (суммы уже отформатированы); здесь — раскладка, «другое», проценты, обрезка подписей.
//
// Текст рисует «движок текста» — объект { width(text, size, bold), draw(x, y, text, opts), defs() }, один на картинку:
// - estimateText() — ширина по оценке, обычный <text> (тесты, отладка; без шрифтов);
// - ChartRenderer.createText() — точная ширина и глифы контурами (HarfBuzz): деванагари, грузинский, CJK
//   рисуются правильно независимо от того, как растеризатор подбирает шрифты.

const THEME = {
  bg: '#0f1420',
  text: '#eef2f8',
  muted: '#8f9aad',
  grid: '#2a3347',
  bar: '#3b4a68',
  current: '#4f9dff',
  average: '#ff8a5c',
  empty: '#2f3a50'
};
// 7 различимых на тёмном фоне цветов + серый для «другого»
const PALETTE = ['#4f9dff', '#ff8a5c', '#3ecf8e', '#ffc145', '#b07cff', '#2ec5d3', '#ff5fa2'];
const OTHER_COLOR = '#6b7486';
const MAX_SLICES = 7;
const HALO_WIDTH = 6;

// ---------- Текст ----------

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u200d\ufe0e\ufe0f\u20e3]/gu;
// Символы, которые XML не принимает, и одиночные суррогаты — ломают разбор SVG
const XML_INVALID = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

// Подпись для картинки: без emoji (шрифтов с ними нет), управляющих символов и лишних пробелов
function cleanLabel(text) {
  return String(text ?? '').replace(EMOJI, '').replace(XML_INVALID, '').replace(/\s+/g, ' ').trim();
}

// Только для подписей, уже прошедших cleanLabel
function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]/u;
const MARK = /\p{M}/u;
const NARROW = /[ilj.,:;'|!()[\]]/;
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

function charWidth(ch) {
  if (MARK.test(ch)) return 0;
  if (WIDE.test(ch)) return 1;
  if (ch === ' ' || ch === '\u00a0' || ch === '\u202f') return 0.27;
  if (/[0-9]/.test(ch)) return 0.58;
  if (NARROW.test(ch)) return 0.3;
  if (/[\p{Script=Georgian}\p{Script=Devanagari}]/u.test(ch)) return 0.64;
  if (/\p{Lu}/u.test(ch)) return 0.68;
  return 0.57;
}

// Оценка ширины строки в px (с запасом: метрик шрифта здесь нет)
function textWidth(text, size, bold = false) {
  let units = 0;
  for (const ch of String(text)) units += charWidth(ch);
  return units * size * (bold ? 1.07 : 1);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

// Движок текста «по оценке»: <text> со шрифтами растеризатора
function estimateText() {
  return {
    width: textWidth,
    draw(x, y, text, { size, color = THEME.text, bold = false, anchor = 'start', halo = false }) {
      const outline = halo ? ` stroke="${THEME.bg}" stroke-width="${HALO_WIDTH}" stroke-linejoin="round" paint-order="stroke"` : '';
      return `<text x="${round(x)}" y="${round(y)}" font-family="Noto Sans" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${color}"${outline}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}>${escapeXml(text)}</text>`;
    },
    defs: () => ''
  };
}

// Обрезка по ширине с «…» — по графемам (не рвёт слоги деванагари и составные символы)
function fitText(text, size, maxWidth, bold = false, measure = textWidth) {
  const str = String(text);
  if (measure(str, size, bold) <= maxWidth) return str;
  const parts = [...graphemes.segment(str)].map(s => s.segment);
  while (parts.length && measure(`${parts.join('').trimEnd()}…`, size, bold) > maxWidth) parts.pop();
  return `${parts.join('').trimEnd()}…`;
}

// Самый крупный кегль из [max..min] с шагом 2, при котором строка влезает
function fitSize(text, maxSize, minSize, maxWidth, bold = false, measure = textWidth) {
  let size = maxSize;
  while (size > minSize && measure(text, size, bold) > maxWidth) size -= 2;
  return size;
}

// Подпись, ужатая по ширине: (x, y, text, maxWidth, opts)
function fitted(engine) {
  return (x, y, text, maxWidth, opts) => engine.draw(x, y, fitText(text, opts.size, maxWidth, opts.bold, engine.width), opts);
}

function svgDoc(width, height, engine, body, background = `<rect width="${width}" height="${height}" fill="${THEME.bg}"/>`) {
  const defs = engine.defs();
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs ? `<defs>${defs}</defs>` : ''}${background}${body}</svg>`;
}

// ---------- Данные ----------

// Категории для кольца: больше MAX_SLICES + 1 — первые MAX_SLICES, остальное одним куском «другое».
// Своя категория «Другое» (isOther) при группировке уходит в этот же кусок, чтобы не было двух «других».
// items: [{ label, total, isOther }] → [{ label, total, other: false } | { other: true, total, count }]
function groupCategories(items, max = MAX_SLICES) {
  const positive = items.filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  if (positive.length <= max + 1) return positive.map(item => ({ ...item, other: false }));
  const top = positive.filter(item => !item.isOther).slice(0, max);
  const rest = positive.filter(item => !top.includes(item));
  return [
    ...top.map(item => ({ ...item, other: false })),
    { other: true, total: rest.reduce((sum, item) => sum + item.total, 0), count: rest.length }
  ];
}

// Целые проценты, в сумме ровно 100 (метод наибольших остатков); все нули — нули
function percentages(values) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!(total > 0)) return values.map(() => 0);
  const exact = values.map(value => Math.max(0, value) / total * 100);
  const result = exact.map(Math.floor);
  let left = 100 - result.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    result[index] += 1;
    left -= 1;
  }
  return result;
}

// Ненулевая доля, округлившаяся до 0, — «<1%»
function percentLabel(percent, value) {
  return percent === 0 && value > 0 ? '<1%' : `${percent}%`;
}

// Средняя для линии на столбиках: периоды начиная с первого с тратами. excludeLast — последний (текущий,
// ещё идущий) период в среднюю не входит. null — не из чего считать
function trendAverage(bars, { excludeLast = false } = {}) {
  const pool = excludeLast ? bars.slice(0, -1) : bars;
  const first = pool.findIndex(bar => bar.value > 0);
  if (first < 0) return null;
  const used = pool.slice(first);
  return used.reduce((sum, bar) => sum + bar.value, 0) / used.length;
}

// «Красивый» верх шкалы: 1; 1,2; 1,5; 2; 2,5; 3; 4; 5; 6; 8 × 10^n не меньше value
function niceMax(value) {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * power >= value * (1 - 1e-9)) return step * power;
  }
  return 10 * power;
}

// ---------- Кольцо по категориям ----------

function polar(cx, cy, radius, angle) {
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
}

function ringSegment(cx, cy, outer, inner, from, to) {
  const large = to - from > Math.PI ? 1 : 0;
  const [ox0, oy0] = polar(cx, cy, outer, from);
  const [ox1, oy1] = polar(cx, cy, outer, to);
  const [ix1, iy1] = polar(cx, cy, inner, to);
  const [ix0, iy0] = polar(cx, cy, inner, from);
  return `M${round(ox0)} ${round(oy0)}A${outer} ${outer} 0 ${large} 1 ${round(ox1)} ${round(oy1)}L${round(ix1)} ${round(iy1)}A${inner} ${inner} 0 ${large} 0 ${round(ix0)} ${round(iy0)}Z`;
}

// Углы кусков кольца (0 — сверху, по часовой) с зазором между кусками
function donutSlices(values, gap = 0.012) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return [];
  const slices = [];
  let angle = 0;
  for (const value of values) {
    const span = value / total * Math.PI * 2;
    const pad = values.length > 1 && span > gap * 3 ? gap : 0;
    slices.push({ from: angle + pad, to: angle + span - pad });
    angle += span;
  }
  return slices;
}

// data: { title, subtitle, total, totalLabel, emptyText, brand,
//         items: [{ label, amount, percent, value, other }] } — items уже сгруппированы и с процентами
function donutSvg(data, engine = estimateText()) {
  const label = fitted(engine);
  const W = 1000;
  const top = 150;
  const R = 200;
  const r = 128;
  const cx = 56 + R;
  const legendX = 540;
  const legendW = W - legendX - 48;
  const rowH = 56;
  const items = data.items || [];
  const legendH = items.length * rowH;
  const areaH = Math.max(2 * R + 20, legendH);
  const cy = top + areaH / 2;
  const H = top + areaH + 80;
  const parts = [];

  parts.push(label(48, 70, data.title, W - 96, { size: 34, bold: true }));
  if (data.subtitle) parts.push(label(48, 110, data.subtitle, W - 96, { size: 24, color: THEME.muted }));

  const colors = items.map((item, index) => item.other ? OTHER_COLOR : PALETTE[index % PALETTE.length]);
  const slices = donutSlices(items.map(item => item.value));
  if (slices.length <= 1) {
    parts.push(`<circle cx="${cx}" cy="${round(cy)}" r="${(R + r) / 2}" fill="none" stroke="${slices.length ? colors[0] : THEME.empty}" stroke-width="${R - r}"/>`);
  } else {
    slices.forEach((slice, index) => {
      if (slice.to > slice.from) parts.push(`<path d="${ringSegment(cx, cy, R, r, slice.from, slice.to)}" fill="${colors[index]}"/>`);
    });
  }

  // Итог в центре
  const inner = r * 2 * 0.86;
  const totalSize = fitSize(data.total, 46, 22, inner, true, engine.width);
  parts.push(engine.draw(cx, cy + 6, data.total, { size: totalSize, bold: true, anchor: 'middle' }));
  if (data.totalLabel) parts.push(label(cx, cy + 40, data.totalLabel, inner, { size: 22, color: THEME.muted, anchor: 'middle' }));

  if (!items.length) {
    parts.push(label(legendX, cy + 9, data.emptyText || '', legendW, { size: 26, color: THEME.muted }));
  } else {
    const y0 = cy - legendH / 2;
    items.forEach((item, index) => {
      const y = y0 + index * rowH;
      parts.push(`<circle cx="${legendX + 9}" cy="${round(y + 16)}" r="9" fill="${colors[index]}"/>`);
      parts.push(label(legendX + 30, y + 24, item.label, legendW - 30, { size: 23 }));
      parts.push(label(legendX + 30, y + 49, `${item.amount} · ${item.percent}`, legendW - 30, { size: 19, color: THEME.muted }));
    });
  }

  if (data.brand) parts.push(engine.draw(W - 48, H - 30, data.brand, { size: 18, color: THEME.muted, anchor: 'end' }));
  return svgDoc(W, H, engine, parts.join(''));
}

// ---------- Столбики по периодам ----------

// data: { title, subtitle, emptyText, brand, averageLabel,
//         bars: [{ label, amount, value, current }], average: number|null }
function trendSvg(data, engine = estimateText()) {
  const label = fitted(engine);
  const W = 1000;
  const H = 640;
  const left = 56;
  const right = W - 56;
  const chartTop = 210;
  const chartBottom = 530;
  const bars = data.bars || [];
  const parts = [];

  parts.push(label(48, 70, data.title, W - 96, { size: 34, bold: true }));
  if (data.subtitle) parts.push(label(48, 110, data.subtitle, W - 96, { size: 24, color: THEME.muted }));

  const maxValue = Math.max(0, ...bars.map(bar => bar.value), data.average || 0);
  const scaleMax = niceMax(maxValue * 1.08);
  const y = (value) => chartBottom - (value / scaleMax) * (chartBottom - chartTop);
  const slot = (right - left) / Math.max(1, bars.length);
  const barW = Math.min(96, slot * 0.6);

  parts.push(`<line x1="${left}" y1="${chartBottom}" x2="${right}" y2="${chartBottom}" stroke="${THEME.grid}" stroke-width="2"/>`);
  if (!(maxValue > 0)) {
    parts.push(label(W / 2, (chartTop + chartBottom) / 2, data.emptyText || '', W - 160, { size: 28, color: THEME.muted, anchor: 'middle' }));
  }
  const valueLabels = []; // рисуются поверх линии средней
  bars.forEach((bar, index) => {
    const cx = left + slot * index + slot / 2;
    const style = { bold: bar.current, color: bar.current ? THEME.text : THEME.muted, anchor: 'middle' };
    if (bar.value > 0) {
      const top = Math.min(y(bar.value), chartBottom - 4);
      const radius = Math.min(10, (chartBottom - top) / 2, barW / 2);
      const x0 = round(cx - barW / 2);
      const x1 = round(cx + barW / 2);
      parts.push(`<path d="M${x0} ${chartBottom}V${round(top + radius)}Q${x0} ${round(top)} ${round(x0 + radius)} ${round(top)}H${round(x1 - radius)}Q${x1} ${round(top)} ${x1} ${round(top + radius)}V${chartBottom}Z" fill="${bar.current ? THEME.current : THEME.bar}"/>`);
      valueLabels.push(label(cx, top - 12, bar.amount, slot - 6, { ...style, size: 19, halo: true }));
    }
    parts.push(label(cx, chartBottom + 36, bar.label, slot - 6, { ...style, size: 21 }));
  });

  if (data.average > 0) {
    const ay = round(y(data.average));
    parts.push(`<line x1="${left}" y1="${ay}" x2="${right}" y2="${ay}" stroke="${THEME.average}" stroke-width="3" stroke-dasharray="12 9"/>`);
    // Подпись линии — над графиком, с образцом пунктира
    parts.push(`<line x1="48" y1="156" x2="96" y2="156" stroke="${THEME.average}" stroke-width="3" stroke-dasharray="12 9"/>`);
    parts.push(label(108, 164, data.averageLabel || '', W - 160, { size: 22, color: THEME.average }));
  }
  parts.push(...valueLabels);

  if (data.brand) parts.push(engine.draw(W - 48, H - 24, data.brand, { size: 18, color: THEME.muted, anchor: 'end' }));
  return svgDoc(W, H, engine, parts.join(''));
}

// ---------- Карточка «Итоги месяца» ----------

// data: { title, subtitle, total, totalLabel, brand, footer,
//         tiles: [{ value, label }] (до 3), rows: [{ label, value, detail?, note?, percent? }] }
// Описаний трат здесь нет и быть не должно — карточку пересылают
function wrappedCardSvg(data, engine = estimateText()) {
  const label = fitted(engine);
  const W = 1080;
  const H = 1350;
  const pad = 72;
  const inner = W - pad * 2;
  const parts = [];
  const background = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16213a"/><stop offset="1" stop-color="#2a1747"/></linearGradient><rect width="${W}" height="${H}" fill="url(#bg)"/>`;

  parts.push(label(pad, 130, data.title, inner, { size: 52, bold: true }));
  if (data.subtitle) parts.push(label(pad, 182, data.subtitle, inner, { size: 30, color: THEME.muted }));

  const totalSize = fitSize(data.total, 110, 48, inner, true, engine.width);
  parts.push(engine.draw(pad, 340, data.total, { size: totalSize, bold: true }));
  if (data.totalLabel) parts.push(label(pad, 392, data.totalLabel, inner, { size: 30, color: THEME.muted }));

  const tiles = (data.tiles || []).slice(0, 3);
  if (tiles.length) {
    const gap = 24;
    const tileW = (inner - gap * (tiles.length - 1)) / tiles.length;
    tiles.forEach((tile, index) => {
      const x = pad + index * (tileW + gap);
      parts.push(`<rect x="${round(x)}" y="450" width="${round(tileW)}" height="170" rx="24" fill="#ffffff" fill-opacity="0.07"/>`);
      const size = fitSize(tile.value, 60, 30, tileW - 48, true, engine.width);
      parts.push(engine.draw(x + 28, 540, tile.value, { size, bold: true }));
      parts.push(label(x + 28, 590, tile.label, tileW - 48, { size: 24, color: THEME.muted }));
    });
  }

  let y = tiles.length ? 710 : 500;
  for (const row of data.rows || []) {
    const height = 50 + (row.detail ? 42 : 0) + (row.note ? 38 : 0) + (typeof row.percent === 'number' ? 36 : 0);
    if (y + height > H - 130) break;
    parts.push(label(pad, y, row.label, inner, { size: 26, color: THEME.muted }));
    parts.push(label(pad, y + 50, row.value, inner, { size: 40, bold: true }));
    let next = y + 50;
    if (row.detail) {
      next += 42;
      parts.push(label(pad, next, row.detail, inner, { size: 28 }));
    }
    if (row.note) {
      next += 38;
      parts.push(label(pad, next, row.note, inner, { size: 26, color: THEME.muted }));
    }
    if (typeof row.percent === 'number') {
      const barY = next + 24;
      parts.push(`<rect x="${pad}" y="${barY}" width="${inner}" height="12" rx="6" fill="#ffffff" fill-opacity="0.1"/>`);
      parts.push(`<rect x="${pad}" y="${barY}" width="${round(Math.max(12, inner * Math.min(1, row.percent / 100)))}" height="12" rx="6" fill="${PALETTE[0]}"/>`);
      next = barY + 12;
    }
    y = next + 78;
  }

  const brandWidth = data.brand ? engine.width(data.brand, 28, true) : 0;
  if (data.footer) parts.push(label(pad, H - 70, data.footer, inner - brandWidth - 32, { size: 26, color: THEME.muted }));
  if (data.brand) parts.push(engine.draw(W - pad, H - 70, data.brand, { size: 28, bold: true, color: PALETTE[0], anchor: 'end' }));
  return svgDoc(W, H, engine, parts.join(''), background);
}

module.exports = {
  THEME,
  PALETTE,
  OTHER_COLOR,
  MAX_SLICES,
  HALO_WIDTH,
  cleanLabel,
  escapeXml,
  textWidth,
  estimateText,
  fitText,
  fitSize,
  groupCategories,
  percentages,
  percentLabel,
  trendAverage,
  niceMax,
  donutSlices,
  donutSvg,
  trendSvg,
  wrappedCardSvg
};
