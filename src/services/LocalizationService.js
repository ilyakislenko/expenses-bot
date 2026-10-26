const logger = require('../utils/logger');

// Импортируем все локализации
const ru = require('../locales/ru');
const en = require('../locales/en');
const es = require('../locales/es');
const fr = require('../locales/fr');
const de = require('../locales/de');
const pt = require('../locales/pt');
const tr = require('../locales/tr');
const hi = require('../locales/hi');
const ka = require('../locales/ka');
const kz = require('../locales/kz');
const uz = require('../locales/uz');
const jp = require('../locales/jp');
const zh = require('../locales/zh');

// Коды Telegram, не совпадающие с кодами языков бота
const TELEGRAM_LANGUAGE_ALIASES = { ja: 'jp', kk: 'kz' };

class LocalizationService {
  constructor() {
    // Поддерживаемые языки
    this.supportedLanguages = {
      'ru': {
        name: 'Русский',
        flag: '🇷🇺',
        locale: ru
      },
      'en': {
        name: 'English',
        flag: '🇺🇸',
        locale: en
      },
      'es': {
        name: 'Español',
        flag: '🇪🇸',
        locale: es
      },
      'fr': {
        name: 'Français',
        flag: '🇫🇷',
        locale: fr
      },
      'de': {
        name: 'Deutsch',
        flag: '🇩🇪',
        locale: de
      },
      'pt': {
        name: 'Português',
        flag: '🇵🇹',
        locale: pt
      },
      'tr': {
        name: 'Türkçe',
        flag: '🇹🇷',
        locale: tr
      },
      'hi': {
        name: 'हिन्दी',
        flag: '🇮🇳',
        locale: hi
      },
      'ka': {
        name: 'ქართული',
        flag: '🇬🇪',
        locale: ka
      },
      'kz': {
        name: 'Қазақша',
        flag: '🇰🇿',
        locale: kz
      },
      'uz': {
        name: 'O\'zbekcha',
        flag: '🇺🇿',
        locale: uz
      },
      'jp': {
        name: '日本語',
        flag: '🇯🇵',
        locale: jp
      },
      'zh': {
        name: '中文',
        flag: '🇨🇳',
        locale: zh
      }
    };
    
    // Язык по умолчанию
    this.defaultLanguage = 'ru';
  }

  /**
   * Получает текст на указанном языке
   */
  getText(language, key, params = {}) {
    try {
      const lang = this.supportedLanguages[language] || this.supportedLanguages[this.defaultLanguage];
      let text = lang.locale[key];
      
      if (!text) {
        logger.warn(`Translation key not found: ${key} for language: ${language}`);
        // Возвращаем ключ, если перевод не найден
        return key;
      }
      
      // Заменяем параметры в тексте буквально: в значениях $&, $' и т.п. не раскрываются
      if (params && typeof params === 'object' && typeof text === 'string') {
        Object.keys(params).forEach(param => {
          text = text.split(`{${param}}`).join(String(params[param]));
        });
      }
      
      return text;
    } catch (error) {
      logger.error('Error in getText:', error);
      return key;
    }
  }

  /**
   * Получает список поддерживаемых языков
   */
  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages).map(code => ({
      code,
      name: this.supportedLanguages[code].name,
      flag: this.supportedLanguages[code].flag
    }));
  }

  /**
   * Проверяет, поддерживается ли язык
   */
  isLanguageSupported(language) {
    return typeof language === 'string' && Object.prototype.hasOwnProperty.call(this.supportedLanguages, language);
  }

  /**
   * Код языка из Telegram (IETF: ja, kk, pt-br, zh-hans) → код языка бота или null, если язык не поддерживается
   */
  resolveTelegramLanguage(languageCode) {
    if (typeof languageCode !== 'string' || !languageCode) return null;
    const base = languageCode.toLowerCase().split(/[-_]/)[0];
    const code = TELEGRAM_LANGUAGE_ALIASES[base] || base;
    return this.isLanguageSupported(code) ? code : null;
  }

  /**
   * Получает язык по умолчанию
   */
  getDefaultLanguage() {
    return this.defaultLanguage;
  }

  /**
   * Получает информацию о языке
   */
  getLanguageInfo(language) {
    return this.supportedLanguages[language] || this.supportedLanguages[this.defaultLanguage];
  }

  /**
   * Форматирует сообщение с параметрами
   */
  formatMessage(language, key, params = {}) {
    return this.getText(language, key, params);
  }

  /**
   * Клавиатура выбора языка на указанном языке.
   * onboarding: кнопки несут признак шага онбординга (`|ob`), «Назад» в Настройки нет — это первый шаг.
   */
  getLanguageKeyboardLocalized(language, { onboarding = false } = {}) {
    const keyboard = this.getSupportedLanguages().map(lang => [{
      text: `${lang.flag} ${lang.name}`,
      callback_data: `set_language|${lang.code}${onboarding ? '|ob' : ''}`
    }]);
    if (!onboarding) {
      keyboard.push([{ text: this.getText(language, 'button_back'), callback_data: 'settings' }]);
    }
    return keyboard;
  }

  /**
   * Добавляет новый язык
   */
  addLanguage(code, name, flag, locale) {
    if (this.supportedLanguages[code]) {
      logger.warn(`Language ${code} already exists, overwriting...`);
    }
    
    this.supportedLanguages[code] = {
      name,
      flag,
      locale
    };
    
    logger.info(`Language ${code} (${name}) added successfully`);
  }

  /**
   * Удаляет язык
   */
  removeLanguage(code) {
    if (code === this.defaultLanguage) {
      throw new Error(`Cannot remove default language: ${code}`);
    }
    
    if (this.supportedLanguages[code]) {
      delete this.supportedLanguages[code];
      logger.info(`Language ${code} removed successfully`);
      return true;
    }
    
    return false;
  }

  /**
   * Устанавливает язык по умолчанию
   */
  setDefaultLanguage(code) {
    if (!this.supportedLanguages[code]) {
      throw new Error(`Language ${code} is not supported`);
    }
    
    this.defaultLanguage = code;
    logger.info(`Default language set to: ${code}`);
  }
}

module.exports = LocalizationService; 