// Подготовка фото чека для модели (чистый JS, jpeg-js): поворот по EXIF → поиск чека в кадре → поворот строк
// горизонтально (0/90°) → кадр не больше 1280 px (мелкий чек увеличивается) → JPEG q85.
// Чек ищется по тексту: тёмные пиксели на светлом локальном фоне (бумага), плотная связная область таких пикселей —
// это чек; яркость бумаги не годится — тень делает её темнее светлого стола. Направление строк — по длине
// горизонтальных и вертикальных отрезков текста (буквы слова склеиваются вдоль строки).
// Пиксели считаются одним проходом по выходному кадру с обратным отображением координат: 12 Мп файл не копируется
// и не поворачивается целиком. Любая ошибка — возвращаются исходные байты.
const jpeg = require('jpeg-js');
const { jpegOrientation } = require('./image');

const MAX_SIDE = 1280; // больше — медленнее на слабой видеокарте без пользы
const MIN_SIDE = 1024; // мелкий чек (снят издалека) увеличиваем: модели нужны пиксели на букву
// Чек меньше этого (в пикселях исходника по длинной стороне) — мелкий: маленькая модель путает цифры и может выдумать
// одну позицию на весь итог. Telegram-фото (≤ 1280) с мелким чеком лучше прислать файлом в полном разрешении
const SMALL_RECEIPT_SIDE = 760;
const DETECT_SIDE = 1280; // копия исходника для поиска
const BLOCK_GRID = 640; // сетка поиска текста по всему кадру
const TEXT_GRID = 960; // сетка внутри найденного чека (строки и уточнение рамки)
const CROP_PADDING = 0.03;
const MAX_CROP_SHARE = 0.85; // рамка почти во весь кадр — не обрезаем
const ORIENTATION_RATIO = 1.15; // во сколько раз отрезки вдоль одной оси длиннее, чтобы поверить направлению
const JPEG_QUALITY = 85;
const MAX_DECODE_MP = 50;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

// Логическое изображение (как его видит человек) поверх сохранённого с EXIF-ориентацией 1–8.
// map(x, y) — непрерывные логические координаты → координаты в сохранённых пикселях
function orientedView(width, height, orientation) {
  const swap = orientation >= 5 && orientation <= 8;
  const W = width;
  const H = height;
  const maps = {
    1: (x, y) => [x, y],
    2: (x, y) => [W - x, y],
    3: (x, y) => [W - x, H - y],
    4: (x, y) => [x, H - y],
    5: (x, y) => [y, x],
    6: (x, y) => [y, H - x],
    7: (x, y) => [W - y, H - x],
    8: (x, y) => [W - y, x]
  };
  return { width: swap ? H : W, height: swap ? W : H, map: maps[orientation] || maps[1] };
}

// Уменьшение в целое число раз усреднением (быстро, без наложения частот)
function boxDown(image, factor) {
  if (factor <= 1) return image;
  const { data, width } = image;
  const w = Math.floor(image.width / factor);
  const h = Math.floor(image.height / factor);
  const out = new Uint8Array(w * h * 3);
  const sums = new Uint32Array(w * 3);
  const area = factor * factor;
  for (let y = 0; y < h; y++) {
    sums.fill(0);
    for (let dy = 0; dy < factor; dy++) {
      let src = ((y * factor + dy) * width) * 3;
      for (let x = 0; x < w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let dx = 0; dx < factor; dx++) {
          r += data[src];
          g += data[src + 1];
          b += data[src + 2];
          src += 3;
        }
        sums[x * 3] += r;
        sums[x * 3 + 1] += g;
        sums[x * 3 + 2] += b;
      }
    }
    const row = y * w * 3;
    for (let i = 0; i < w * 3; i++) out[row + i] = (sums[i] / area) | 0;
  }
  return { data: out, width: w, height: h, factor: (image.factor || 1) * factor };
}

// Билинейное значение в точке (x, y) изображения (центры пикселей в +0.5) → out[offset..offset+2]
function sample(img, x, y, out, offset) {
  const fx = clamp(x - 0.5, 0, img.width - 1);
  const fy = clamp(y - 0.5, 0, img.height - 1);
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = Math.min(x0 + 1, img.width - 1);
  const y1 = Math.min(y0 + 1, img.height - 1);
  const ax = fx - x0;
  const ay = fy - y0;
  const d = img.data;
  const i00 = (y0 * img.width + x0) * 3;
  const i10 = (y0 * img.width + x1) * 3;
  const i01 = (y1 * img.width + x0) * 3;
  const i11 = (y1 * img.width + x1) * 3;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] + (d[i10 + c] - d[i00 + c]) * ax;
    const bottom = d[i01 + c] + (d[i11 + c] - d[i01 + c]) * ax;
    out[offset + c] = top + (bottom - top) * ay;
  }
}

// Прямоугольник crop логического изображения, повёрнутый на rotation (0/90/180/270 по часовой) и смасштабированный
// в outW×outH, → RGB. source — исходник (возможно уменьшенный в source.factor раз), view — EXIF-ориентация
function render(source, view, crop, rotation, outW, outH) {
  const rotated = rotation === 90 || rotation === 270;
  const s = (rotated ? crop.height : crop.width) / outW;
  const factor = source.factor || 1;
  const out = new Uint8Array(outW * outH * 3);
  for (let v = 0; v < outH; v++) {
    for (let u = 0; u < outW; u++) {
      const a = (u + 0.5) * s;
      const b = (v + 0.5) * s;
      let cx = a;
      let cy = b;
      if (rotation === 90) {
        cx = b;
        cy = crop.height - a;
      } else if (rotation === 180) {
        cx = crop.width - a;
        cy = crop.height - b;
      } else if (rotation === 270) {
        cx = crop.width - b;
        cy = a;
      }
      const [sx, sy] = view.map(crop.x + cx, crop.y + cy);
      sample(source, sx / factor, sy / factor, out, (v * outW + u) * 3);
    }
  }
  return out;
}

// Яркость прямоугольника region на сетке с длинной стороной maxSide (не больше разрешения источника)
function lumaGrid(source, view, region, maxSide) {
  const native = Math.max(region.width, region.height) / (source.factor || 1);
  const side = Math.max(32, Math.min(maxSide, Math.round(native)));
  const longest = Math.max(region.width, region.height);
  const w = Math.max(8, Math.round(region.width / longest * side));
  const h = Math.max(8, Math.round(region.height / longest * side));
  const rgb = render(source, view, region, 0, w, h);
  const y = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) y[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  return { y, w, h, region };
}

// Пиксели текста: заметно темнее среднего по окну вокруг (бумага — светлый локальный фон, тень не мешает)
function textMask(grid) {
  const { y, w, h } = grid;
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let yy = 0; yy < h; yy++) {
    let row = 0;
    for (let xx = 0; xx < w; xx++) {
      row += y[yy * w + xx];
      integral[(yy + 1) * (w + 1) + xx + 1] = integral[yy * (w + 1) + xx + 1] + row;
    }
  }
  const r = Math.max(3, Math.round(Math.max(w, h) / 100));
  const mask = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) {
    const ya = Math.max(0, yy - r);
    const yb = Math.min(h, yy + r + 1);
    for (let xx = 0; xx < w; xx++) {
      const xa = Math.max(0, xx - r);
      const xb = Math.min(w, xx + r + 1);
      const mean = (integral[yb * (w + 1) + xb] - integral[ya * (w + 1) + xb] - integral[yb * (w + 1) + xa] + integral[ya * (w + 1) + xa])
        / ((xb - xa) * (yb - ya));
      if (mean - y[yy * w + xx] > Math.max(15, mean * 0.12)) mask[yy * w + xx] = 1;
    }
  }
  return mask;
}

// Расширение (keep = 1) или сужение (keep = 0) двоичной маски квадратом radius
function morph(mask, w, h, radius, keep) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = !keep;
      for (let dy = -radius; dy <= radius && hit !== keep; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (!!mask[yy * w + xx] === keep) {
            hit = keep;
            break;
          }
        }
      }
      out[y * w + x] = hit ? 1 : 0;
    }
  }
  return out;
}

// Самая большая связная область маски: { count, x0, y0, x1, y1 }
function largestComponent(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let best = null;
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const box = { count: 0, x0: w, y0: h, x1: 0, y1: 0 };
    while (top) {
      const i = stack[--top];
      const x = i % w;
      const y = (i / w) | 0;
      box.count++;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[top++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[top++] = i + 1; }
      if (y > 0 && mask[i - w] && !seen[i - w]) { seen[i - w] = 1; stack[top++] = i - w; }
      if (y < h - 1 && mask[i + w] && !seen[i + w]) { seen[i + w] = 1; stack[top++] = i + w; }
    }
    if (!best || box.count > best.count) best = box;
  }
  return best;
}

// Рамка чека внутри grid.region: клетки, где текста хотя бы 10%, склеенные в самую большую область.
// null — текста нет или он занимает почти весь кадр (обрезать нечего)
function findTextBlock(grid, mask) {
  const { w, h, region } = grid;
  const c = Math.max(4, Math.round(Math.max(w, h) / 80));
  const cw = Math.floor(w / c);
  const ch = Math.floor(h / c);
  if (cw < 4 || ch < 4) return null;
  const cells = new Uint8Array(cw * ch);
  const need = c * c * 0.1;
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let n = 0;
      for (let yy = 0; yy < c; yy++) {
        const row = (cy * c + yy) * w + cx * c;
        for (let xx = 0; xx < c; xx++) n += mask[row + xx];
      }
      cells[cy * cw + cx] = n >= need ? 1 : 0;
    }
  }
  const closed = morph(morph(cells, cw, ch, 1, true), cw, ch, 1, false);
  const block = largestComponent(closed, cw, ch);
  if (!block) return null;
  const bw = block.x1 - block.x0 + 1;
  const bh = block.y1 - block.y0 + 1;
  if (block.count < 12 || block.count / (bw * bh) < 0.35 || (bw * bh) / (cw * ch) > MAX_CROP_SHARE) return null;
  const sx = region.width / w * c;
  const sy = region.height / h * c;
  const pad = Math.max(region.width, region.height) * CROP_PADDING;
  const x0 = clamp(region.x + block.x0 * sx - pad, region.x, region.x + region.width);
  const y0 = clamp(region.y + block.y0 * sy - pad, region.y, region.y + region.height);
  const x1 = clamp(region.x + (block.x1 + 1) * sx + pad, region.x, region.x + region.width);
  const y1 = clamp(region.y + (block.y1 + 1) * sy + pad, region.y, region.y + region.height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

// Направление строк: средняя длина отрезков текста вдоль x и вдоль y (разрывы до gap склеиваются — буквы слова
// становятся одним отрезком вдоль строки). { rotation: 0 | 90, ratio: x/y }
function textRotation(grid, mask) {
  const { w, h } = grid;
  const gap = Math.max(2, Math.round(Math.max(w, h) / 320));
  const meanRun = (alongX) => {
    const lines = alongX ? h : w;
    const length = alongX ? w : h;
    let total = 0;
    let count = 0;
    for (let a = 0; a < lines; a++) {
      let run = 0;
      let holes = 0;
      for (let b = 0; b <= length; b++) {
        const on = b < length && (alongX ? mask[a * w + b] : mask[b * w + a]);
        if (on) {
          run += holes + 1;
          holes = 0;
        } else if (run) {
          holes++;
          if (holes > gap || b === length) {
            if (run >= 2) {
              total += run;
              count++;
            }
            run = 0;
            holes = 0;
          }
        }
      }
    }
    return count ? total / count : 0;
  };
  const x = meanRun(true);
  const y = meanRun(false);
  if (!x || !y) return { rotation: 0, ratio: 1 };
  const ratio = x / y;
  return { rotation: ratio < 1 / ORIENTATION_RATIO ? 90 : 0, ratio };
}

function outputSize(crop, rotation) {
  const rotated = rotation === 90 || rotation === 270;
  const w = rotated ? crop.height : crop.width;
  const h = rotated ? crop.width : crop.height;
  const longest = Math.max(w, h);
  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : longest < MIN_SIDE ? MIN_SIDE / longest : 1;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function encode(rgb, width, height) {
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    rgba[j] = rgb[i];
    rgba[j + 1] = rgb[i + 1];
    rgba[j + 2] = rgb[i + 2];
  }
  return jpeg.encode({ data: rgba, width, height }, JPEG_QUALITY).data;
}

function decode(buffer) {
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: false, maxResolutionInMP: MAX_DECODE_MP, maxMemoryUsageInMB: 1024 });
  return { data: decoded.data, width: decoded.width, height: decoded.height, factor: 1 };
}

// buffer — фото (JPEG). extraRotation — дополнительный поворот по часовой (повторная попытка: 180, «повернуть на 90°»).
// Возвращает { image, mimeType, info }; info.prepared = false — отданы исходные байты (не JPEG или ошибка)
function prepareReceiptImage(buffer, { mimeType = 'image/jpeg', extraRotation = 0 } = {}) {
  const started = Date.now();
  const isJpeg = buffer && buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  if (!isJpeg) return { image: buffer, mimeType, info: { prepared: false, reason: 'not jpeg' } };
  try {
    const timings = {};
    let mark = Date.now();
    const lap = (name) => {
      const now = Date.now();
      timings[name] = now - mark;
      mark = now;
    };
    const original = decode(buffer);
    lap('decode');
    const orientation = jpegOrientation(buffer) || 1;
    const view = orientedView(original.width, original.height, orientation);
    const full = { x: 0, y: 0, width: view.width, height: view.height };
    const small = boxDown(original, Math.max(1, Math.floor(Math.max(original.width, original.height) / DETECT_SIDE)));
    lap('shrink');

    // Чек в кадре: сначала по всему кадру, затем уточнение внутри найденного
    let crop = full;
    const overview = lumaGrid(small, view, full, BLOCK_GRID);
    const found = findTextBlock(overview, textMask(overview));
    if (found) crop = found;
    let detail = lumaGrid(small, view, crop, TEXT_GRID);
    let detailMask = textMask(detail);
    const tighter = findTextBlock(detail, detailMask);
    if (tighter) {
      crop = tighter;
      detail = lumaGrid(small, view, crop, TEXT_GRID);
      detailMask = textMask(detail);
    }
    const text = textRotation(detail, detailMask);
    const rotation = (text.rotation + extraRotation) % 360;
    lap('detect');

    // Итоговый кадр: из уменьшенной копии, если её разрешения хватает, иначе исходник усредняется в целое число раз
    // так, чтобы билинейно уменьшать не больше чем в 1,5 раза
    const out = outputSize(crop, rotation);
    // Ни обрезки, ни поворота, размер тот же — перекодирование только потеряет качество: отдаём исходные байты
    const unchanged = crop === full && rotation === 0 && orientation === 1 && out.width === view.width && out.height === view.height;
    let image = buffer;
    if (!unchanged) {
      const pixelsPerOut = Math.max(crop.width, crop.height) / Math.max(out.width, out.height);
      const renderFactor = Math.max(1, Math.floor(pixelsPerOut / 1.5));
      const renderSource = (small.factor || 1) <= pixelsPerOut ? small : boxDown(original, renderFactor);
      const rgb = render(renderSource, view, crop, rotation, out.width, out.height);
      lap('render');
      image = encode(rgb, out.width, out.height);
      lap('encode');
    }
    return {
      image,
      mimeType: 'image/jpeg',
      info: {
        prepared: true,
        reencoded: !unchanged,
        source: { width: original.width, height: original.height, orientation },
        crop: { x: Math.round(crop.x), y: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height), cropped: crop !== full },
        small: Math.max(crop.width, crop.height) < SMALL_RECEIPT_SIDE,
        lowResolution: Math.max(crop.width, crop.height) < SMALL_RECEIPT_SIDE && Math.max(view.width, view.height) <= MAX_SIDE,
        rotation,
        textRatio: Math.round(text.ratio * 100) / 100,
        width: out.width,
        height: out.height,
        timings,
        ms: Date.now() - started
      }
    };
  } catch (error) {
    return { image: buffer, mimeType, info: { prepared: false, reason: error.message, ms: Date.now() - started } };
  }
}

// Поворот уже подготовленного JPEG на degrees по часовой (повторные попытки распознавания)
function rotateJpeg(buffer, degrees) {
  const image = decode(buffer);
  const view = orientedView(image.width, image.height, 1);
  const crop = { x: 0, y: 0, width: image.width, height: image.height };
  const rotated = degrees === 90 || degrees === 270;
  const outW = rotated ? image.height : image.width;
  const outH = rotated ? image.width : image.height;
  return encode(render(image, view, crop, degrees, outW, outH), outW, outH);
}

module.exports = { prepareReceiptImage, rotateJpeg, orientedView, lumaGrid, textMask, findTextBlock, textRotation, MAX_SIDE };
