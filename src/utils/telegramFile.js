// Скачивание файла из Telegram (чеки, выписки, голосовые) с таймаутом и пределом размера: зависшее соединение
// или поток больше лимита не держат обработчик и память.
const DOWNLOAD_TIMEOUT_MS = 30000;
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024; // больше Bot API ботам не отдаёт

class DownloadTooLargeError extends Error {
  constructor(maxBytes) {
    super(`File is larger than ${maxBytes} bytes`);
    this.code = 'too_large';
  }
}

async function downloadTelegramFile(telegram, fileId, { maxBytes = MAX_DOWNLOAD_BYTES, timeoutMs = DOWNLOAD_TIMEOUT_MS } = {}) {
  const link = await telegram.getFileLink(fileId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Download timeout after ${timeoutMs} ms`)), timeoutMs);
  try {
    const response = await fetch(link.href || String(link), { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers?.get('content-length'));
    if (declared > maxBytes) throw new DownloadTooLargeError(maxBytes);
    if (!response.body) return Buffer.from(await response.arrayBuffer());
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > maxBytes) throw new DownloadTooLargeError(maxBytes);
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, total);
  } finally {
    clearTimeout(timer);
    // Прерываем недочитанный поток (лимит, ошибка); после полного чтения abort ничего не делает
    controller.abort();
  }
}

module.exports = { downloadTelegramFile, DownloadTooLargeError, DOWNLOAD_TIMEOUT_MS, MAX_DOWNLOAD_BYTES };
