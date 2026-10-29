// QR-код российского кассового чека: t=20261029T1842&s=1042.92&fn=7281440500123456&i=12345&fp=3456789012&n=1.
// В нём точные дата, время и итог (s), но не строки — их даёт только ФНС после входа по телефону. Бот читает QR с
// того же фото сам (jsQR, без сети) и подставляет итог, дату и время вместо прочитанных моделью: проверка строк против
// итога (normalize.js) тогда сравнивает с настоящей суммой. Запускается в потоке картинок (imageWorker).
const jpeg = require('jpeg-js');
const jsQR = require('jsqr');

// QR на фото чека: сначала сильно уменьшенный кадр (усреднение сглаживает зерно фото — на шуме jsQR QR не находит;
// крупный QR в кадре так находится всегда), не нашли — крупнее (мелкий QR на большом фото), до исходного размера
const SCAN_SIDES = [700, 1200, 2000];
const MAX_DECODE_MP = 50;
const MAX_TOTAL = 100000000; // больше — не итог чека, а ошибка чтения
const OPERATION_INCOME = '1'; // n=1 — приход (покупка); 2 — возврат прихода, 3/4 — расход: не трата

// Разбор строки QR: { total, date: 'YYYY-MM-DD', time: 'HH:MM', fn, fd, fp } | null (не фискальный QR, возврат,
// неправдоподобные числа). Только цифры из полей — текст QR не попадает ни в запрос к модели, ни в запись
function parseFiscalQr(text) {
  if (typeof text !== 'string' || text.length > 300) return null;
  const fields = {};
  for (const part of text.trim().split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0) fields[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  const when = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/.exec(fields.t || '');
  const total = /^\d{1,9}(?:[.,]\d{1,2})?$/.test(fields.s || '') ? Number(fields.s.replace(',', '.')) : NaN;
  if (!when || !(total > 0) || total > MAX_TOTAL || !/^\d{1,20}$/.test(fields.fn || '')) return null;
  if (fields.n !== undefined && fields.n !== OPERATION_INCOME) return null;
  const [, y, mo, d, h, mi] = when;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31 || Number(h) > 23 || Number(mi) > 59) return null;
  return {
    total: Math.round(total * 100) / 100,
    date: `${y}-${mo}-${d}`,
    time: `${h}:${mi}`,
    fn: fields.fn,
    fd: /^\d{1,20}$/.test(fields.i || '') ? fields.i : null,
    fp: /^\d{1,20}$/.test(fields.fp || '') ? fields.fp : null
  };
}

// Уменьшенная серая копия RGBA: каждый пиксель — среднее яркости своего блока исходника (сглаживает шум; jsQR на 12 Мп
// ещё и медленный). Кадр не больше maxSide — как есть
function scaled(decoded, maxSide) {
  const { width, height, data } = decoded;
  const factor = Math.max(width, height) / maxSide;
  if (factor <= 1) return { width, height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
  const w = Math.max(1, Math.floor(width / factor));
  const h = Math.max(1, Math.floor(height / factor));
  const sums = new Float64Array(w * h);
  const counts = new Uint32Array(w * h);
  for (let y = 0; y < height; y++) {
    const oy = Math.min(h - 1, Math.floor(y / factor)) * w;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const cell = oy + Math.min(w - 1, Math.floor(x / factor));
      sums[cell] += data[src] * 0.299 + data[src + 1] * 0.587 + data[src + 2] * 0.114;
      counts[cell]++;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const luma = sums[i] / counts[i];
    out[i * 4] = luma;
    out[i * 4 + 1] = luma;
    out[i * 4 + 2] = luma;
    out[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data: out };
}

// JPEG → данные фискального QR или null (нет QR, не JPEG, не фискальный). Ошибки чтения — тоже null:
// QR только уточняет чек, без него распознавание идёт как раньше
function readFiscalQr(buffer) {
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let decoded;
  try {
    decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: MAX_DECODE_MP, maxMemoryUsageInMB: 1024 });
  } catch (error) {
    return null;
  }
  const largest = Math.max(decoded.width, decoded.height);
  for (const side of SCAN_SIDES) {
    const frame = scaled(decoded, side);
    const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
    if (found) return parseFiscalQr(found.data);
    if (side >= largest) break;
  }
  return null;
}

module.exports = { parseFiscalQr, readFiscalQr };
