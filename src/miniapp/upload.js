const express = require('express');
const { HttpError, wrap } = require('./http');

// Загрузки файлов в Mini App (выписка, фото чека, голос): тело до 20 МБ читается в память процесса бота, поэтому всё,
// что можно проверить без тела, проверяется до его чтения:
// - размер по Content-Length (больше предела — 413 too_large, тело не читается);
// - общий предел одновременно читаемых загрузок на процесс и одна загрузка за раз на пользователя (503 uploads_busy):
//   сотни медленных загрузок не займут память;
// - проверки маршрута before(req, ctx) — настроено ли, занятость, лимиты, rateLimiter; их ошибка — ответ без чтения тела.
// before может занять ресурс (одно голосовое за раз…) и вернуть release(): он вызывается, когда запрос закончился,
// если обработчик не забрал ресурс себе — req.upload.take() отдаёт release обработчику (или задаче после ответа).
// Без Content-Length (chunked) предел держит express.raw — чтение обрывается на limit.
const MAX_CONCURRENT_UPLOADS = 4;
const readers = new Set(); // userId, у кого сейчас читается тело загрузки

function upload({ limit, type, before = null }) {
  const gate = wrap(async (req, res, next) => {
    const length = Number(req.get('content-length'));
    if (length > limit) throw new HttpError(413, 'too_large');
    if (readers.size >= MAX_CONCURRENT_UPLOADS || readers.has(req.userId)) throw new HttpError(503, 'uploads_busy');
    readers.add(req.userId);
    let reading = true;
    let closed = false;
    let release = null;
    let taken = false;
    const doneReading = () => {
      if (!reading) return;
      reading = false;
      readers.delete(req.userId);
    };
    res.once('close', () => {
      closed = true;
      doneReading();
      if (release && !taken) release();
    });
    try {
      release = before ? (await before(req, await req.ctx())) || null : null;
    } catch (error) {
      doneReading();
      throw error;
    }
    // Клиент ушёл, пока шли проверки: ресурс сразу свободен, тело не читаем
    if (closed) {
      if (release) release();
      return;
    }
    req.upload = {
      take: () => {
        taken = true;
        return release || (() => {});
      },
      doneReading
    };
    next();
  });
  const read = (req, res, next) => {
    req.upload.doneReading();
    next();
  };
  return [gate, express.raw({ type, limit }), read];
}

module.exports = { upload, MAX_CONCURRENT_UPLOADS };
