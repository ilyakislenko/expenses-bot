// Запросы к /api с подписью Telegram. Ошибка сервера → ApiError { status, code, data }; сеть недоступна → code 'network'.
import { tg } from './tg.js';

export class ApiError extends Error {
  constructor(status, code, data = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request(method, path, body, { raw = null, type = null } = {}) {
  const headers = { Authorization: `tma ${tg ? tg.initData : ''}` };
  let payload;
  if (raw) {
    payload = raw;
    headers['Content-Type'] = type || raw.type || 'application/octet-stream';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(`api${path}`, { method, headers, body: payload });
  } catch (error) {
    throw new ApiError(0, 'network');
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (error) { data = null; }
  if (!response.ok) throw new ApiError(response.status, (data && data.error) || 'server', data || {});
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  // Файл (фото чека, выписка, голос) телом запроса; type — MIME, по умолчанию из файла
  upload: (path, file, type) => request('POST', path, undefined, { raw: file, type })
};

// Строка в query: { offset: -1, scope: 'family' } → '?offset=-1&scope=family' (пустые — пропускаются)
export function qs(params) {
  const parts = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return parts.length ? `?${parts.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
}
