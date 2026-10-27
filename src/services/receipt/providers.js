// Провайдеры распознавания: Google Gemini (бесплатный тариф) и любой OpenAI-совместимый chat/completions
// (OpenRouter, Mistral, локальная Ollama). Оба возвращают сырой JSON модели — проверяет normalize.js.
const { ReceiptError } = require('./errors');
const { RESPONSE_SCHEMA } = require('./prompt');
const { postJsonWithRetry } = require('./httpClient');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GITHUB_BASE_URL = 'https://models.github.ai/inference';
const GITHUB_DEFAULT_MODEL = 'openai/gpt-4o-mini';

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

class GeminiProvider {
  constructor({ apiKey, model, localAddress, timeoutMs, baseUrl = GEMINI_BASE_URL, post = postJsonWithRetry }) {
    this.name = 'gemini';
    this.apiKey = apiKey;
    this.model = model || GEMINI_DEFAULT_MODEL;
    this.localAddress = localAddress || undefined;
    this.timeoutMs = timeoutMs;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.post = post;
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
    const response = await this.post(url, body, { localAddress: this.localAddress, timeoutMs: this.timeoutMs });
    if (response.status !== 200) throw mapHttpError(response);
    const json = response.json;
    // 200 без ожидаемого JSON (заглушка, прокси) — сбой сервиса, а не плохое фото
    if (!json || (!json.candidates && !json.promptFeedback)) throw new ReceiptError('unavailable', `unexpected response: ${String(response.body).slice(0, 100)}`);
    if (json.promptFeedback && json.promptFeedback.blockReason) throw new ReceiptError('unreadable', `blocked: ${json.promptFeedback.blockReason}`);
    const candidate = (json.candidates || [])[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map(part => part.text || '').join('');
    if (!text) throw new ReceiptError('unreadable', `empty response${candidate ? `: ${candidate.finishReason}` : ''}`);
    return parseModelJson(text);
  }
}

class OpenAiCompatibleProvider {
  // name — 'openai' или пресет ('github'); requireKey — без ключа провайдер не настроен (облачные сервисы)
  constructor({ apiKey, model, baseUrl, localAddress, timeoutMs, post = postJsonWithRetry, name = 'openai', requireKey = false }) {
    this.name = name;
    this.apiKey = apiKey || '';
    this.model = model;
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.localAddress = localAddress || undefined;
    this.timeoutMs = timeoutMs;
    this.post = post;
    this.requireKey = requireKey;
  }

  // Адрес и модель обязательны; ключ — только если requireKey (локальной Ollama он не нужен)
  get configured() {
    return !!(this.baseUrl && this.model && (this.apiKey || !this.requireKey));
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
    const response = await this.post(url, body, { headers, localAddress: this.localAddress, timeoutMs: this.timeoutMs });
    if (response.status !== 200) throw mapHttpError(response);
    if (!response.json || !Array.isArray(response.json.choices)) {
      throw new ReceiptError('unavailable', `unexpected response: ${String(response.body).slice(0, 100)}`);
    }
    const choice = response.json.choices[0];
    const content = choice && choice.message && choice.message.content;
    const text = Array.isArray(content) ? content.map(part => part.text || '').join('') : content;
    if (!text) throw new ReceiptError('unreadable', 'empty response');
    return parseModelJson(text);
  }
}

// Провайдер из переменных окружения: RECEIPT_AI_PROVIDER (gemini|github|openai), RECEIPT_AI_API_KEY, RECEIPT_AI_MODEL,
// RECEIPT_AI_BASE_URL (openai; у github — свой адрес по умолчанию), RECEIPT_AI_LOCAL_ADDRESS (исходящий IP)
function createProviderFromEnv(env = process.env) {
  const common = {
    apiKey: env.RECEIPT_AI_API_KEY || '',
    model: env.RECEIPT_AI_MODEL || undefined,
    localAddress: env.RECEIPT_AI_LOCAL_ADDRESS || undefined
  };
  const kind = String(env.RECEIPT_AI_PROVIDER || 'gemini').toLowerCase();
  if (kind === 'github') {
    // GitHub Models: GitHub PAT, OpenAI-совместимый chat/completions. GitHub закрыл сервис 30.07.2026 (адрес отвечает
    // заглушкой «OK» — это «сервис недоступен»); пресет оставлен на случай возврата
    return new OpenAiCompatibleProvider({
      ...common,
      name: 'github',
      requireKey: true,
      model: common.model || GITHUB_DEFAULT_MODEL,
      baseUrl: env.RECEIPT_AI_BASE_URL || GITHUB_BASE_URL
    });
  }
  if (kind === 'openai') return new OpenAiCompatibleProvider({ ...common, baseUrl: env.RECEIPT_AI_BASE_URL });
  return new GeminiProvider(common);
}

module.exports = {
  GeminiProvider, OpenAiCompatibleProvider, createProviderFromEnv, parseModelJson, mapHttpError,
  GEMINI_DEFAULT_MODEL, GITHUB_BASE_URL, GITHUB_DEFAULT_MODEL
};
