const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../../utils/logger');
const { Limiter } = require('../receipt/chain');

// Распознавание речи локально: whisper.cpp (whisper-cli) на сервере, OGG/Opus из Telegram → WAV 16 кГц через ffmpeg.
// Файлы — во временной папке процесса и удаляются сразу после распознавания. Один процесс за раз (CPU), остальные
// ждут в очереди (Limiter из receipt/chain).

const DEFAULT_TIMEOUT_MS = 90000; // 60 с речи на small — около 20–30 с, с запасом на очередь ffmpeg и загрузку модели
const DEFAULT_THREADS = 4;
const MAX_AUDIO_SECONDS = 61; // ffmpeg обрезает длиннее (Telegram и так присылает длительность — проверка в обработчике)

// Язык бота → код языка whisper
const WHISPER_LANGUAGES = { ru: 'ru', en: 'en', de: 'de', es: 'es', fr: 'fr', pt: 'pt', tr: 'tr', ka: 'ka', kz: 'kk', uz: 'uz', hi: 'hi', jp: 'ja', zh: 'zh' };

class SttError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // 'timeout' | 'failed'
  }
}

// Запуск процесса с общим дедлайном: по истечении — SIGKILL всей группе процесса и SttError('timeout')
function run(command, args, deadline) {
  return new Promise((resolve, reject) => {
    // Своя группа процессов: при таймауте убиваем и дочерние процессы, иначе они держали бы трубы открытыми
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let stderr = '';
    child.stdout.resume();
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        child.kill('SIGKILL');
      }
      reject(new SttError('timeout', `${path.basename(command)} timed out`));
    }, Math.max(1, deadline - Date.now()));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new SttError('failed', `${path.basename(command)}: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new SttError('failed', `${path.basename(command)} exited with ${code}: ${stderr.trim().split('\n').pop()}`));
    });
  });
}

// Окно энкодера (audio_ctx, 50 единиц на секунду) по длительности: короткая запись не считается как 30 с —
// small на CPU так быстрее в 3 раза. Не меньше 512 (меньше — whisper начинает путаться), без запаса — 0 (полное окно)
function audioContext(durationSec) {
  if (!durationSec || durationSec <= 0) return 0;
  const ctx = Math.max(512, Math.ceil(durationSec * 50) + 50);
  return ctx >= 1500 ? 0 : ctx;
}

class WhisperStt {
  constructor({ binary, model, threads = DEFAULT_THREADS, timeoutMs = DEFAULT_TIMEOUT_MS, ffmpeg = 'ffmpeg' }) {
    this.binary = binary;
    this.model = model;
    this.threads = threads;
    this.timeoutMs = timeoutMs;
    this.ffmpeg = ffmpeg;
    this.limiter = new Limiter(1);
  }

  get configured() {
    return true;
  }

  // audio — Buffer OGG/Opus. language — код whisper ('ru', 'en'…) или 'auto' (определение языка — ещё ~5 с на CPU).
  // durationSec — длительность из Telegram (для audio_ctx). onQueued(position) — место в очереди (0 — началось).
  // Возвращает текст (может быть пустым)
  async transcribe(audio, { language = 'auto', durationSec = 0, onQueued } = {}) {
    return this.limiter.run(() => this.runOnce(audio, { language, durationSec }), onQueued);
  }

  async runOnce(audio, { language, durationSec }) {
    const started = Date.now();
    const deadline = started + this.timeoutMs;
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voice-'));
    try {
      const input = path.join(dir, 'in.ogg');
      const wav = path.join(dir, 'in.wav');
      const out = path.join(dir, 'out');
      await fs.promises.writeFile(input, audio, { mode: 0o600 });
      await run(this.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-i', input,
        '-t', String(MAX_AUDIO_SECONDS), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], deadline);
      const args = ['-m', this.model, '-f', wav, '-t', String(this.threads), '-l', language, '-nt', '-np', '-otxt', '-of', out];
      const ctx = audioContext(durationSec);
      if (ctx) args.push('-ac', String(ctx));
      await run(this.binary, args, deadline);
      const text = (await fs.promises.readFile(`${out}.txt`, 'utf8')).replace(/\s+/g, ' ').trim();
      logger.info('Voice transcribed', { ms: Date.now() - started, chars: text.length, language, durationSec });
      return text;
    } finally {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// STT из env: VOICE_STT_BIN (whisper-cli), VOICE_STT_MODEL (ggml-*.bin), VOICE_STT_THREADS, VOICE_STT_TIMEOUT_MS,
// VOICE_STT_FFMPEG. null — не настроено (голосовой ввод скрыт). Язык — VoiceService (VOICE_STT_LANGUAGE)
function createSttFromEnv(env = process.env) {
  const binary = env.VOICE_STT_BIN;
  const model = env.VOICE_STT_MODEL;
  if (!binary || !model) return null;
  const missing = [binary, model].filter(file => !fs.existsSync(file));
  if (missing.length) {
    logger.warn('Voice input disabled: STT files not found', { missing });
    return null;
  }
  return new WhisperStt({
    binary,
    model,
    threads: parseInt(env.VOICE_STT_THREADS, 10) || DEFAULT_THREADS,
    timeoutMs: parseInt(env.VOICE_STT_TIMEOUT_MS, 10) || DEFAULT_TIMEOUT_MS,
    ffmpeg: env.VOICE_STT_FFMPEG || 'ffmpeg'
  });
}

module.exports = { WhisperStt, SttError, createSttFromEnv, audioContext, WHISPER_LANGUAGES };
