// Правки одного сообщения не чаще раза в intervalMs (Telegram ограничивает правки и сообщения в группе ~20 в минуту):
// первая — сразу, следующие за интервал сливаются в одну последнюю. task() может вернуть retry_after (секунды из
// ответа 429) — следующая правка подождёт столько. Состояние только в памяти: что не перерисовано до перезапуска,
// отмечено в БД (group_splits.dirty) и перерисовывается при запуске.
class EditThrottle {
  constructor({ intervalMs = 3000, maxKeys = 5000 } = {}) {
    this.intervalMs = intervalMs;
    this.maxKeys = maxKeys;
    this.entries = new Map(); // key → { last, timer, task, promise }
  }

  schedule(key, task) {
    let entry = this.entries.get(key);
    if (!entry) {
      this.sweep();
      entry = { last: 0, timer: null, task: null, promise: null };
      this.entries.set(key, entry);
    }
    entry.task = task;
    if (entry.timer) return entry.promise;
    const wait = Math.max(0, entry.last + this.intervalMs - Date.now());
    entry.promise = new Promise((resolve) => {
      entry.timer = setTimeout(async () => {
        entry.timer = null;
        const run = entry.task;
        entry.task = null;
        entry.last = Date.now();
        try {
          const retryAfter = await run();
          if (Number(retryAfter) > 0) entry.last = Date.now() + Number(retryAfter) * 1000 - this.intervalMs;
        } catch (error) {
          // правка не удалась — следующая попытка при следующем изменении
        }
        resolve();
      }, wait);
      if (entry.timer.unref) entry.timer.unref();
    });
    return entry.promise;
  }

  // Ключи без ожидающей правки и старше интервала больше не нужны
  sweep() {
    if (this.entries.size < this.maxKeys) return;
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (!entry.timer && now - entry.last > this.intervalMs) this.entries.delete(key);
    }
  }

  // Все запланированные правки выполнены (тесты и smoke)
  async idle() {
    while ([...this.entries.values()].some(entry => entry.timer)) {
      await Promise.all([...this.entries.values()].filter(entry => entry.timer).map(entry => entry.promise));
    }
  }
}

module.exports = EditThrottle;
