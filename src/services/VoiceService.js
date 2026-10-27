const logger = require('../utils/logger');
const { USER_LIMITS } = require('../utils/constants');
const { localToday } = require('../utils/period');
const { WHISPER_LANGUAGES } = require('./voice/whisper');

// Фразы, которые whisper «слышит» в тишине и шуме (хвосты субтитров из обучающих данных), и пометки вроде [BLANK_AUDIO]
const HALLUCINATIONS = [
  /субтитр/i, /продолжение следует/i, /спасибо за просмотр/i, /подпис(ыва)?йтесь на (наш )?канал/i,
  /thanks? (you )?for watching/i, /subscribe to/i, /^\s*you\.?\s*$/i
];

// Расшифровка без пометок ([BLANK_AUDIO], (музыка), *шум*) и «галлюцинаций»; пустая строка — ничего не сказано
function cleanTranscript(text) {
  const withoutMarks = String(text || '')
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = withoutMarks.split(/(?<=[.!?…])\s+/).filter(sentence => !HALLUCINATIONS.some(re => re.test(sentence)));
  return sentences.join(' ').replace(/^[\s.,;:!?…-]+$/, '').trim();
}

// Голосовые сообщения → текст. Локальный STT (services/voice/whisper.js), дневной лимит по локальному дню
// пользователя (USER_LIMITS.*.MAX_VOICE_PER_DAY). Голос и расшифровка не хранятся — только счётчик voice_usage.
// languageMode: 'user' (по умолчанию) — речь на языке пользователя, а если расшифровка не разобралась —
// ещё раз с определением языка; 'auto' — всегда определять язык (на CPU это ещё ~5 с на каждое голосовое).
class VoiceService {
  constructor({ stt, entryBatchRepository, premiumService, languageMode = 'user' }) {
    this.stt = stt;
    this.entryBatchRepository = entryBatchRepository;
    this.premiumService = premiumService;
    this.languageMode = languageMode === 'auto' ? 'auto' : 'user';
  }

  get configured() {
    return !!(this.stt && this.stt.configured);
  }

  get premiumLimit() {
    return USER_LIMITS.premium.MAX_VOICE_PER_DAY;
  }

  async checkLimit(userId, timezone) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const limit = (isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_VOICE_PER_DAY;
    const used = await this.entryBatchRepository.getVoiceCount(userId, localToday(timezone));
    return { isPremium, limit, used, remaining: Math.max(0, limit - used) };
  }

  // Распознаёт и засчитывает в дневной лимит (ошибки STT не засчитываются). usable(text) — разобралась ли расшифровка:
  // если нет, а язык был задан, — повтор с определением языка (вдруг пользователь говорил на другом).
  // onQueued(position) — место в очереди, 0 — началось
  async transcribe(userId, audio, { lang, timezone, durationSec, onQueued, usable = () => true }) {
    const language = this.languageMode === 'auto' ? 'auto' : (WHISPER_LANGUAGES[lang] || 'auto');
    let text = cleanTranscript(await this.stt.transcribe(audio, { language, durationSec, onQueued }));
    await this.entryBatchRepository.incrementVoiceCount(userId, localToday(timezone));
    if (language !== 'auto' && text && !usable(text)) {
      try {
        const detected = cleanTranscript(await this.stt.transcribe(audio, { language: 'auto', durationSec, onQueued }));
        if (usable(detected)) text = detected;
      } catch (error) {
        logger.warn('Voice auto-language retry failed', { userId, error: error.message });
      }
    }
    return text;
  }
}

VoiceService.cleanTranscript = cleanTranscript;

module.exports = VoiceService;
