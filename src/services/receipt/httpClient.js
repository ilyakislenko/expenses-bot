// POST JSON через node http/https: глобальный fetch не умеет привязывать исходящий адрес, а сервер
// отправляет в VPN-туннель только трафик с определённого IP (RECEIPT_AI_LOCAL_ADDRESS).
const http = require('http');
const https = require('https');
const { ReceiptError } = require('./errors');

const DEFAULT_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 20000;

// { status, headers, body (текст), json (или null) }; сетевые ошибки и таймаут — ReceiptError('network')
function postJson(url, body, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, localAddress, transport } = {}) {
  const target = new URL(url);
  const client = transport || (target.protocol === 'http:' ? http : https);
  const payload = Buffer.from(JSON.stringify(body));
  const options = {
    method: 'POST',
    hostname: target.hostname,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, ...headers }
  };
  if (localAddress) options.localAddress = localAddress;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const req = client.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (error) {
          json = null;
        }
        finish(resolve, { status: res.statusCode, headers: res.headers, body: text, json });
      });
      res.on('error', error => finish(reject, new ReceiptError('network', error.message)));
    });
    const timer = setTimeout(() => {
      req.destroy();
      finish(reject, new ReceiptError('network', 'timeout'));
    }, timeoutMs);
    req.on('error', error => finish(reject, new ReceiptError('network', error.message)));
    req.end(payload);
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Пауза перед повтором: Retry-After (с) или 2 с; null — повторять бессмысленно (дневной лимит: ждать дольше 20 с)
function retryDelay(response) {
  const retryAfter = Number(response.headers && response.headers['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000 > MAX_RETRY_DELAY_MS ? null : retryAfter * 1000;
  return RETRY_DELAY_MS;
}

// Один повтор при 429/5xx с паузой
async function postJsonWithRetry(url, body, options = {}) {
  const wait = options.sleep || sleep;
  const response = await postJson(url, body, options);
  if (response.status !== 429 && response.status < 500) return response;
  const delay = retryDelay(response);
  if (delay === null) return response;
  await wait(delay);
  return postJson(url, body, options);
}

module.exports = { postJson, postJsonWithRetry, DEFAULT_TIMEOUT_MS };
