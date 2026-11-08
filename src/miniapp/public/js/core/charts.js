// Графики SVG с касанием: ведёшь пальцем — вертикальная линия, точки и подсказка со значениями (вибро на каждом шаге).
// Цвета серий — CSS-переменные палитры (--c1…--c7) или любые цвета.
import { h } from './ui.js';
import { haptic } from './tg.js';
import { compact } from './i18n.js';

export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];
const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  return el;
}
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * magnitude >= value) return step * magnitude;
  return 10 * magnitude;
}

// Подсказка поверх графика
function tooltip(wrap) {
  const tip = h('div', { class: 'chart-tip hidden' });
  wrap.appendChild(tip);
  return {
    show(x, title, lines, width) {
      tip.replaceChildren(h('b', null, title), ...lines.map(l => h('div', null, h('i', { style: { background: l.color } }), l.text)));
      tip.classList.remove('hidden');
      const half = tip.offsetWidth / 2;
      tip.style.left = `${Math.min(Math.max(x, half), width - half)}px`;
    },
    hide() { tip.classList.add('hidden'); }
  };
}

// Линии по дням/месяцам. series: [{ label, values: [..] (null — нет точки), start (индекс первого значения, по умолчанию
// 0), color, dash, width, area, steps: [..] (вертикальная ступенька перед точкой i — например, регулярный платёж) }].
// labels: подписи по индексам (ось — несколько, подсказка — все). marker: индекс «сегодня». format(value) для подсказки.
export function lineChart({ labels, series, height = 190, format = (v) => compact(v), marker = null, tickCount = 5 }) {
  const W = 360;
  const H = height;
  const left = 4;
  const right = W - 4;
  const top = 10;
  const bottom = H - 22;
  const n = labels.length;
  const values = series.flatMap(sr => sr.values.filter(v => v !== null && v !== undefined));
  const max = niceMax(Math.max(1, ...values) * 1.06);
  const x = (i) => left + (n <= 1 ? 0 : (i / (n - 1)) * (right - left));
  const y = (v) => bottom - (Math.max(0, v) / max) * (bottom - top);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  for (let k = 1; k <= 3; k++) svg.appendChild(s('line', { class: 'grid-line', x1: left, x2: right, y1: bottom - (k / 3) * (bottom - top), y2: bottom - (k / 3) * (bottom - top) }));
  svg.appendChild(s('line', { class: 'grid-line', x1: left, x2: right, y1: bottom, y2: bottom }));
  for (let k = 1; k <= 3; k++) {
    const label = s('text', { x: right, y: bottom - (k / 3) * (bottom - top) - 3, 'text-anchor': 'end' });
    label.textContent = compact((max * k) / 3);
    svg.appendChild(label);
  }
  // Подписи оси: каждые step точек; последняя — всегда (выровнена по правому краю), а последний обычный тик (по центру)
  // убирается, если подписи налезут: ширина ≈ 6 px на символ при шрифте 10 px
  const step = Math.max(1, Math.ceil((n - 1) / (tickCount - 1)));
  const ticks = [];
  for (let i = 0; i < n; i += step) ticks.push(i);
  const width = (i) => String(labels[i] || '').length * 6;
  if (n > 1 && ticks[ticks.length - 1] !== n - 1) {
    const prev = ticks[ticks.length - 1];
    if (ticks.length > 1 && x(n - 1) - x(prev) < width(n - 1) + width(prev) / 2 + 8) ticks.pop();
    ticks.push(n - 1);
  }
  for (const i of ticks) {
    const label = s('text', { x: x(i), y: H - 6, 'text-anchor': i === 0 ? 'start' : (i >= n - 1 ? 'end' : 'middle') });
    label.textContent = labels[i];
    svg.appendChild(label);
  }
  if (marker !== null && marker >= 0 && marker < n) svg.appendChild(s('line', { x1: x(marker), x2: x(marker), y1: top, y2: bottom, stroke: 'var(--hint)', 'stroke-dasharray': '2 4', 'stroke-width': 1 }));

  series.forEach((sr, si) => {
    const color = sr.color || COLORS[si % COLORS.length];
    const start = sr.start || 0;
    const points = [];
    sr.values.forEach((v, k) => {
      if (v === null || v === undefined) return;
      const i = start + k;
      const jump = sr.steps ? sr.steps[k] || 0 : 0;
      if (jump > 0) points.push([x(i), y(v - jump)]);
      points.push([x(i), y(v)]);
    });
    if (!points.length) return;
    const d = points.map(([px, py], k) => `${k ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
    if (sr.area) {
      svg.appendChild(s('path', { d: `${d}L${points[points.length - 1][0].toFixed(1)},${bottom}L${points[0][0].toFixed(1)},${bottom}Z`, fill: color, opacity: 0.14 }));
    }
    svg.appendChild(s('path', { d, fill: 'none', stroke: color, 'stroke-width': sr.width || 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': sr.dash || null }));
  });

  const wrap = h('div', { class: 'chart' });
  wrap.appendChild(svg);
  const cursor = s('line', { x1: 0, x2: 0, y1: top, y2: bottom, stroke: 'var(--text)', 'stroke-width': 1, opacity: 0 });
  svg.appendChild(cursor);
  const dots = series.map((sr, si) => { const c = s('circle', { r: 4, fill: sr.color || COLORS[si % COLORS.length], opacity: 0 }); svg.appendChild(c); return c; });
  const tip = tooltip(wrap);
  let last = -1;
  function at(clientX) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - left) / (right - left)) * (n - 1))));
    if (i === last) return;
    last = i;
    haptic.tap();
    cursor.setAttribute('x1', x(i)); cursor.setAttribute('x2', x(i)); cursor.setAttribute('opacity', 0.35);
    const lines = [];
    series.forEach((sr, si) => {
      const k = i - (sr.start || 0);
      const v = sr.values[k];
      if (v === null || v === undefined || k < 0) { dots[si].setAttribute('opacity', 0); return; }
      dots[si].setAttribute('cx', x(i)); dots[si].setAttribute('cy', y(v)); dots[si].setAttribute('opacity', 1);
      lines.push({ color: sr.color || COLORS[si % COLORS.length], text: `${sr.label ? `${sr.label}: ` : ''}${format(v)}` });
    });
    tip.show((x(i) / W) * rect.width, labels[i], lines, rect.width);
  }
  function end() {
    last = -1;
    cursor.setAttribute('opacity', 0);
    dots.forEach(d => d.setAttribute('opacity', 0));
    tip.hide();
  }
  wrap.addEventListener('pointerdown', (e) => at(e.clientX));
  wrap.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) at(e.clientX); });
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointerleave', end);
  wrap.addEventListener('pointercancel', end);
  return wrap;
}

// Столбики: values, labels, highlight (индекс выделенного), average (линия), onSelect(i) — тап по столбику
export function barChart({ labels, values, highlight = null, average = null, height = 170, format = (v) => compact(v), onSelect = null, color = 'var(--c1)' }) {
  const W = 360;
  const H = height;
  const top = 18;
  const bottom = H - 22;
  const n = values.length;
  const max = niceMax(Math.max(1, ...values, average || 0) * 1.08);
  const slot = W / n;
  const bw = Math.min(36, slot * 0.6);
  const y = (v) => bottom - (Math.max(0, v) / max) * (bottom - top);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  svg.appendChild(s('line', { class: 'grid-line', x1: 0, x2: W, y1: bottom, y2: bottom }));
  const wrap = h('div', { class: 'chart' });
  const tip = tooltip(wrap);
  const bars = values.map((v, i) => {
    const cx = slot * i + slot / 2;
    const bar = s('rect', { x: cx - bw / 2, y: y(v), width: bw, height: Math.max(2, bottom - y(v)), rx: 5, fill: color, opacity: highlight === null || highlight === i ? 1 : 0.45 });
    svg.appendChild(bar);
    const label = s('text', { x: cx, y: H - 6, 'text-anchor': 'middle' });
    label.textContent = labels[i];
    svg.appendChild(label);
    return { bar, cx, v };
  });
  if (average) svg.appendChild(s('line', { x1: 0, x2: W, y1: y(average), y2: y(average), stroke: 'var(--c2)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
  wrap.appendChild(svg);
  wrap.addEventListener('click', (e) => {
    const rect = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - rect.left) / rect.width) * n)));
    haptic.tap();
    bars.forEach((b, k) => b.bar.setAttribute('opacity', k === i ? 1 : 0.45));
    tip.show((bars[i].cx / W) * rect.width, labels[i], [{ color, text: format(bars[i].v) }], rect.width);
    if (onSelect) onSelect(i);
  });
  return wrap;
}

// Кольцо: items [{ label, value, color }], center — { title, value } в середине; onSelect(i) — тап по сектору/легенде
export function donut({ items, center = null, size = 200, onSelect = null }) {
  const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  const svg = s('svg', { viewBox: '0 0 200 200', role: 'img', style: `width:${size}px;max-width:100%;margin:0 auto` });
  let offset = 0;
  items.forEach((it, i) => {
    const len = (it.value / total) * c;
    const arc = s('circle', {
      cx: 100, cy: 100, r, fill: 'none', stroke: it.color || COLORS[i % COLORS.length], 'stroke-width': 26,
      'stroke-dasharray': `${Math.max(0, len - 2)} ${c}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 100 100)'
    });
    arc.style.cursor = 'pointer';
    arc.addEventListener('click', () => { haptic.tap(); if (onSelect) onSelect(i); });
    svg.appendChild(arc);
    offset += len;
  });
  if (center) {
    const title = s('text', { x: 100, y: 94, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--hint)' });
    title.textContent = center.title;
    const value = s('text', { x: 100, y: 116, 'text-anchor': 'middle', style: 'font-size:19px;font-weight:700;fill:var(--text)' });
    value.textContent = center.value;
    svg.append(title, value);
  }
  return h('div', { class: 'chart center' }, svg);
}

// Легенда: [{ label, color, dash }]
export function legend(items) {
  return h('div', { class: 'legend' }, items.map(it => {
    const el = h('span', { class: it.dash ? 'dash' : '' }, it.label);
    el.style.setProperty('--c', it.color);
    return el;
  }));
}
