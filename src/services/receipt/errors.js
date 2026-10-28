// Ошибки распознавания чека. code:
//   not_configured — нет ключа/адреса провайдера
//   auth           — провайдер отклонил ключ (неверный, нет доступа)
//   quota          — лимит бесплатного тарифа (429)
//   unavailable    — провайдер недоступен или отказал (5xx, гео-ограничение, неожиданный ответ)
//   network        — сеть/таймаут
//   busy           — у пользователя уже есть задача этого вида в очереди модели (receipt/chain.js Limiter)
//   unreadable     — на фото не удалось разобрать позиции
//   not_receipt    — на фото не чек
//   currency       — валюта чека не поддерживается ботом (params.currency)
class ReceiptError extends Error {
  constructor(code, message = code, params = {}) {
    super(`Receipt recognition error: ${message}`);
    this.code = code;
    this.params = params;
  }
}

module.exports = { ReceiptError };
