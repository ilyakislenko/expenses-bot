// Провайдеры распознавания: Google Gemini (бесплатный тариф) и любой OpenAI-совместимый chat/completions
// (Ollama, Mistral, OpenRouter). Оба возвращают сырой JSON модели — проверяет normalize.js.
// Цепочка провайдеров из переменных окружения — chain.js.
const { ReceiptError } = require('./errors');
const { RESPONSE_SCHEMA } = require('./prompt');
const { postJsonWithRetry } = require('./httpClient');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

// Текст ответа модели → объект. Модели иногда оборачивают JSON в ```json … ```
function parseModelJson(text) {
  const source = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new ReceiptError('unreadable', 'no JSON in model response');
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch (error) {
    throw new ReceiptError('unreadable', 'invalid JSON in model response');
  }
}

function errorMessage(response) {
  const json = response.json || {};
  const error = Array.isArray(json) ? json[0] && json[0].error : json.error;
  if (error && typeof error === 'object') return String(error.message || error.status || '');
  if (typeof error === 'string') return error;
  return String(response.body || '').slice(0, 200);
}

// HTTP-ответ с ошибкой → ReceiptError
function mapHttpError(response) {
  const message = errorMessage(response);
  if (response.status === 429) return new ReceiptError('quota', message);
  if (response.status === 401 || response.status === 403) return new ReceiptError('auth', message);
  if (response.status === 400 && /api key|api_key|apikey/i.test(message)) return new ReceiptError('auth', message);
  return new ReceiptError('unavailable', `HTTP ${response.status}: ${message}`);
}

const unexpected = (response) => new ReceiptError('unavailable', `unexpected response: ${String(response.body).slice(0, 100)}`);

class GeminiProvider {
  constructor({ apiKey, model, localAddress, timeoutMs, connectTimeoutMs, baseUrl = GEMINI_BASE_URL, post = postJsonWithRetry }) {
    this.name = 'gemini';
    this.apiKey = apiKey || '';
    this.model = model || GEMINI_DEFAULT_MODEL;
    this.localAddress = localAddress || undefined;
    this.timeoutMs = timeoutMs;
    this.connectTimeoutMs = connectTimeoutMs;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.post = post;
    this.acceptsHeic = true;
  }

  get configured() {
    return !!this.apiKey;
  }

  buildRequest({ image, mimeType, prompt }) {
    return {
      url: `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      body: {
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: image.toString('base64') } },
            { text: prompt }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0 }
      }
    };
  }

  async recognize(input) {
    if (!this.configured) throw new ReceiptError('not_configured');
    const { url, body } = this.buildRequest(input);
    const response = await this.post(url, body, { localAddress: this.localAddress, timeoutMs: this.timeoutMs, connectTimeoutMs: this.connectTimeoutMs });
    if (response.status !== 200) throw mapHttpError(response);
    const json = response.json;
    // 200 без ожидаемого JSON (заглушка, прокси) — сбой сервиса, а не плохое фото
    if (!json || (!json.candidates && !json.promptFeedback)) throw unexpected(response);
    if (json.promptFeedback && json.promptFeedback.blockReason) throw new ReceiptError('unreadable', `blocked: ${json.promptFeedback.blockReason}`);
    const candidate = (json.candidates || [])[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map(part => part.text || '').join('');
    if (!text) throw new ReceiptError('unreadable', `empty response${candidate ? `: ${candidate.finishReason}` : ''}`);
    return parseModelJson(text);
  }
}

// OpenAI-совместимый /chat/completions. Ключ необязателен (локальная Ollama его не проверяет — не отправляем)
class OpenAiCompatibleProvider {
  constructor({ apiKey, model, baseUrl, localAddress, timeoutMs, connectTimeoutMs, post = postJsonWithRetry }) {
    this.name = 'openai';
    this.apiKey = apiKey || '';
    this.model = model;
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.localAddress = localAddress || undefined;
    this.timeoutMs = timeoutMs;
    this.connectTimeoutMs = connectTimeoutMs;
    this.post = post;
    this.acceptsHeic = false;
  }

  get configured() {
    return !!(this.baseUrl && this.model);
  }

  buildRequest({ image, mimeType, prompt }) {
    const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
    return {
      url: `${this.baseUrl}/chat/completions`,
      headers,
      body: {
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image.toString('base64')}` } }
          ]
        }]
      }
    };
  }

  async recognize(input) {
    if (!this.configured) throw new ReceiptError('not_configured');
    const { url, headers, body } = this.buildRequest(input);
    const response = await this.post(url, body, { headers, localAddress: this.localAddress, timeoutMs: this.timeoutMs, connectTimeoutMs: this.connectTimeoutMs });
    if (response.status !== 200) throw mapHttpError(response);
    if (!response.json || !Array.isArray(response.json.choices)) throw unexpected(response);
    const choice = response.json.choices[0];
    const content = choice && choice.message && choice.message.content;
    const text = Array.isArray(content) ? content.map(part => part.text || '').join('') : content;
    if (!text) throw new ReceiptError('unreadable', 'empty response');
    return parseModelJson(text);
  }
}

module.exports = { GeminiProvider, OpenAiCompatibleProvider, parseModelJson, mapHttpError, GEMINI_DEFAULT_MODEL };
