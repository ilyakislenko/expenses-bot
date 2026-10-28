const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { HALO_WIDTH, THEME } = require('../utils/charts');

// SVG → PNG без браузера и системных зависимостей:
// - текст раскладывает HarfBuzz (harfbuzzjs, WebAssembly): правильные слоги деванагари, грузинский, CJK, точная
//   ширина строк; глифы попадают в SVG контурами (<path> в <defs> + <use>), растеризатору шрифты не нужны;
// - растеризует @resvg/resvg-js (готовые бинарники); renderAsync считает картинку в пуле потоков libuv —
//   цикл событий бота не блокируется.
// Шрифты: свои из assets/fonts (Noto Sans: латиница и кириллица, грузинский, деванагари; OFL) + системный CJK, если
// есть (fonts-noto-cjk или Droid Sans Fallback). На диск ничего не пишется; в памяти — только контуры глифов.

const BUNDLED_FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const BUNDLED_FAMILIES = [
  { name: 'Noto Sans', regular: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf' },
  { name: 'Noto Sans Georgian', regular: 'NotoSansGeorgian-Regular.ttf', bold: 'NotoSansGeorgian-Bold.ttf' },
  { name: 'Noto Sans Devanagari', regular: 'NotoSansDevanagari-Regular.ttf', bold: 'NotoSansDevanagari-Bold.ttf' }
];
const FONT_SEARCH_DIRS = ['/usr/share/fonts', '/usr/local/share/fonts', '/System/Library/Fonts', '/Library/Fonts'];
// Системные шрифты с китайскими иероглифами и японской каной — по убыванию предпочтения
const CJK_FONT_PATTERNS = [/NotoSansCJK.*-Regular/i, /NotoSans(SC|JP|TC)-Regular/i, /SourceHanSans/i, /DroidSansFallback/i, /wqy-(zenhei|microhei)/i, /Hiragino Sans GB/i];
const MAX_SCAN_DEPTH = 4;
const MAX_GLYPH_CACHE = 20000;
// Не требуют шрифта: соединители, селекторы вариантов
const IGNORABLE = /[\u200b-\u200d\u2060\ufe00-\ufe0f]/u;
const SPACES = /[\s\u00a0\u2007\u202f]/gu;
const COMMON = /^[\p{Script=Common}\p{Script=Inherited}]+$/u;
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

function round(value) {
  return Math.round(value * 100) / 100;
}

function findFiles(dir, patterns, depth = 0, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && depth < MAX_SCAN_DEPTH) findFiles(full, patterns, depth + 1, found);
    else if (entry.isFile() && /\.(ttf|otf|ttc)$/i.test(entry.name) && patterns.some(p => p.test(entry.name))) found.push(full);
  }
  return found;
}

// Один системный файл CJK (самый предпочтительный); CHART_CJK_FONT в .env — свой путь
function findCjkFont() {
  if (process.env.CHART_CJK_FONT) return fs.existsSync(process.env.CHART_CJK_FONT) ? process.env.CHART_CJK_FONT : null;
  const files = [];
  for (const dir of FONT_SEARCH_DIRS) findFiles(dir, CJK_FONT_PATTERNS, 0, files);
  for (const pattern of CJK_FONT_PATTERNS) {
    const match = files.filter(file => pattern.test(path.basename(file))).sort()[0];
    if (match) return match;
  }
  return null;
}

class ChartRenderer {
  constructor({ resvg, fonts } = {}) {
    this.resvg = resvg === undefined ? ChartRenderer.loadResvg() : resvg;
    // [{ name, regular: file, bold: file|null }] — в порядке выбора шрифта для символа
    this.fontSources = fonts || ChartRenderer.defaultFonts();
    this.families = null; // после ready(): [{ name, regular: face, bold: face|null }]
    this.glyphs = new Map(); // `${face}-${glyph}` → контур (SVG path)
    this.readyPromise = null;
  }

  static loadResvg() {
    try {
      return require('@resvg/resvg-js');
    } catch (error) {
      logger.warn('Charts disabled: @resvg/resvg-js is not installed', { error: error.message });
      return null;
    }
  }

  static defaultFonts() {
    const fonts = BUNDLED_FAMILIES
      .map(f => ({ name: f.name, regular: path.join(BUNDLED_FONTS_DIR, f.regular), bold: path.join(BUNDLED_FONTS_DIR, f.bold) }))
      .filter(f => fs.existsSync(f.regular));
    if (!fonts.length) logger.warn('Chart fonts not found', { dir: BUNDLED_FONTS_DIR });
    const cjk = findCjkFont();
    if (cjk) fonts.push({ name: path.basename(cjk), regular: cjk, bold: null });
    return fonts;
  }

  get available() {
    return !!this.resvg && this.fontSources.length > 0;
  }

  // HarfBuzz и шрифты загружаются один раз на процесс, при первой картинке
  ready() {
    if (!this.available) return Promise.resolve(false);
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        try {
          this.hb = await import('harfbuzzjs');
          let index = 0;
          const load = (file) => {
            const face = new this.hb.Face(new this.hb.Blob(fs.readFileSync(file)), 0);
            return { key: `f${index++}`, upem: face.upem, font: new this.hb.Font(face), cover: new Set(face.collectUnicodes()) };
          };
          this.families = this.fontSources.map(source => ({
            name: source.name,
            regular: load(source.regular),
            bold: source.bold && fs.existsSync(source.bold) ? load(source.bold) : null
          }));
          logger.info('Chart renderer ready', { fonts: this.families.map(f => f.name) });
          return true;
        } catch (error) {
          logger.warn('Charts disabled: text shaping unavailable', { error: error.message });
          this.resvg = null;
          return false;
        }
      })();
    }
    return this.readyPromise;
  }

  // Шрифт, в котором есть все символы графемы (после ready())
  familyFor(codepoints, preferred = null) {
    const covers = (family) => codepoints.every(cp => family.regular.cover.has(cp));
    if (preferred && covers(preferred)) return preferred;
    return this.families.find(covers) || null;
  }

  static codepoints(segment) {
    return [...segment].filter(ch => !IGNORABLE.test(ch)).map(ch => ch.codePointAt(0));
  }

  // Строку можно нарисовать целиком (вызывать после ready())
  textSupported(text) {
    for (const { segment } of graphemes.segment(String(text).replace(SPACES, ' '))) {
      if (!this.familyFor(ChartRenderer.codepoints(segment))) return false;
    }
    return true;
  }

  // Пользовательская подпись: графемы без шрифта выкидываются (лучше, чем квадраты)
  sanitize(text) {
    const kept = [...graphemes.segment(String(text).replace(SPACES, ' '))]
      .map(s => s.segment)
      .filter(segment => this.familyFor(ChartRenderer.codepoints(segment)))
      .join('').replace(/ +/g, ' ').trim();
    return kept || '…';
  }

  // Куски строки одним шрифтом. Пробелы, цифры и знаки остаются в шрифте предыдущего куска, если он их умеет, —
  // иначе слова деванагари резались бы на отдельные куски и теряли сочетания
  runs(text) {
    const runs = [];
    for (const { segment } of graphemes.segment(String(text).replace(SPACES, ' '))) {
      const last = runs[runs.length - 1];
      const codepoints = ChartRenderer.codepoints(segment);
      const family = this.familyFor(codepoints, last && COMMON.test(segment) ? last.family : null);
      if (!family) continue;
      if (last && last.family === family) last.text += segment;
      else runs.push({ family, text: segment });
    }
    return runs;
  }

  // HarfBuzz: глифы строки с позициями в долях кегля (em) и общая ширина в em
  shape(text, bold) {
    const glyphs = [];
    let pen = 0;
    for (const run of this.runs(text)) {
      const face = bold && run.family.bold ? run.family.bold : run.family.regular;
      const buffer = new this.hb.Buffer();
      try {
        buffer.addText(run.text);
        buffer.guessSegmentProperties();
        this.hb.shape(face.font, buffer);
        const infos = buffer.getGlyphInfos();
        const positions = buffer.getGlyphPositions();
        infos.forEach((info, i) => {
          const pos = positions[i];
          glyphs.push({ face, gid: info.codepoint, x: pen + pos.xOffset / face.upem, y: pos.yOffset / face.upem });
          pen += pos.xAdvance / face.upem;
        });
      } finally {
        if (typeof buffer.destroy === 'function') buffer.destroy();
      }
    }
    return { glyphs, width: pen };
  }

  glyphPath(face, gid) {
    const id = `${face.key}-${gid}`;
    if (!this.glyphs.has(id)) {
      if (this.glyphs.size >= MAX_GLYPH_CACHE) this.glyphs.clear();
      this.glyphs.set(id, face.font.glyphToPath(gid));
    }
    return { id, d: this.glyphs.get(id) };
  }

  // Движок текста для utils/charts.js — один на картинку (собирает <defs> с нужными глифами)
  createText() {
    const used = new Map();
    return {
      width: (text, size, bold = false) => this.shape(text, bold).width * size,
      draw: (x, y, text, { size, color = THEME.text, bold = false, anchor = 'start', halo = false }) => {
        const shaped = this.shape(text, bold);
        const width = shaped.width * size;
        const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
        const uses = [];
        for (const glyph of shaped.glyphs) {
          const { id, d } = this.glyphPath(glyph.face, glyph.gid);
          if (!d) continue; // пробел
          used.set(id, d);
          const scale = size / glyph.face.upem;
          const outline = halo ? ` stroke-width="${round(HALO_WIDTH / scale)}"` : '';
          uses.push(`<use xlink:href="#${id}" transform="translate(${round(x0 + glyph.x * size)} ${round(y - glyph.y * size)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})"${outline}/>`);
        }
        if (!uses.length) return '';
        const haloStyle = halo ? ` stroke="${THEME.bg}" stroke-linejoin="round" paint-order="stroke"` : '';
        return `<g fill="${color}"${haloStyle}>${uses.join('')}</g>`;
      },
      defs: () => [...used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('')
    };
  }

  // SVG → PNG (Buffer). width — ширина картинки в px (по умолчанию как в SVG)
  async render(svg, width) {
    if (!(await this.ready())) throw new Error('Chart renderer unavailable');
    const started = process.hrtime.bigint();
    const image = await this.resvg.renderAsync(svg, {
      font: { loadSystemFonts: false },
      fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
      logLevel: 'off'
    });
    const png = image.asPng();
    logger.debug('Chart rendered', { ms: Number(process.hrtime.bigint() - started) / 1e6, bytes: png.length });
    return png;
  }
}

ChartRenderer.findCjkFont = findCjkFont;

module.exports = ChartRenderer;
