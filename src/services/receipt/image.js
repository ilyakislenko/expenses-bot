// Ориентация JPEG из EXIF (тег 0x0112) без библиотек. Фото, присланное файлом, хранит пиксели как сняла камера
// и поворот в EXIF; модели EXIF не учитывают и видят чек боком. Фото (не файлом) Telegram присылает уже повёрнутым.
// Возвращает 1–8 или null (не JPEG, нет EXIF или тега).
function jpegOrientation(buffer) {
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xda || marker === 0xd9) return null; // начало данных изображения — EXIF уже не будет
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker === 0xe1 && buffer.toString('ascii', offset + 4, offset + 10) === 'Exif\0\0') {
      return exifOrientation(buffer.subarray(offset + 10, offset + 2 + length));
    }
    offset += 2 + length;
  }
  return null;
}

function exifOrientation(tiff) {
  if (tiff.length < 8) return null;
  const order = tiff.toString('ascii', 0, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const little = order === 'II';
  const u16 = (at) => (little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
  const u32 = (at) => (little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at));
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return null;
  const entries = u16(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) return null;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

module.exports = { jpegOrientation };
