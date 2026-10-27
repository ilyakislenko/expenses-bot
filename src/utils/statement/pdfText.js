// Текст PDF-выписки. pdf-parse подключается напрямую (lib/pdf-parse.js): его index.js в отладочном режиме
// читает тестовый файл с диска. Строки собираются по координатам: фрагменты на одной высоте — одна строка
// (слева направо, с пробелом при разрыве), строки — сверху вниз, чтобы колонки таблицы не слипались.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const { ImportError } = require('./common');

const MAX_PAGES = 200;
const LINE_TOLERANCE = 2; // pt: фрагменты, чьи базовые линии ближе, — одна строка
const GAP_FOR_SPACE = 1; // pt: разрыв между фрагментами, при котором вставляется пробел

async function renderPage(pageData) {
  const content = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
  const items = content.items
    .filter(item => item.str && item.str.trim())
    .map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width || 0 }));
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const item of items) {
    const line = lines.length ? lines[lines.length - 1] : null;
    if (line && Math.abs(line.y - item.y) <= LINE_TOLERANCE) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map(({ items: lineItems }) => {
    lineItems.sort((a, b) => a.x - b.x);
    let text = '';
    let end = null;
    for (const item of lineItems) {
      if (end !== null && item.x - end > GAP_FOR_SPACE && !text.endsWith(' ') && !item.str.startsWith(' ')) text += ' ';
      text += item.str;
      end = item.x + item.width;
    }
    return text;
  }).join('\n');
}

async function extractPdfText(buffer) {
  try {
    const result = await pdfParse(buffer, { pagerender: renderPage, max: MAX_PAGES });
    return result.text || '';
  } catch (error) {
    // Защищён паролем, повреждён или не PDF
    throw new ImportError('pdf');
  }
}

module.exports = { extractPdfText };
