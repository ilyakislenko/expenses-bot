// Общее для экранов расходов (today, add, record): стили раздела, подписи, выбор дня и категории, строки после записи,
// фото чека, голос и несколько записей одной строкой.
import { h, icon, row, avatar, sheet, toast, errorText, act } from '../core/ui.js';
import { t, me, money, dayLabel, addDays, today } from '../core/i18n.js';
import { api, ApiError } from '../core/api.js';
import { haptic } from '../core/tg.js';
import { navigate, changed } from '../core/router.js';

// «3 записи», «1 запись» — правила множественного числа языка пользователя
let plural = null;
export function countLabel(n) {
  if (!plural) {
    try { plural = new Intl.PluralRules(me().locale); } catch (e) { plural = new Intl.PluralRules('ru'); }
  }
  return t(`ex_count_${plural.select(n)}`, { n });
}

// Строки после записи (достижения, монеты, бюджеты) одним тостом под основным текстом
export function resultToast(text, notes = [], action = null) {
  const lines = [text, ...notes].filter(Boolean);
  toast(lines.join('\n'), { action, duration: notes.length ? 6500 : 4000 });
}

// Ошибка лимита распознаваний (чеки, голос): цифры и — бесплатным — переход к премиуму
export function limitToast(error, key) {
  const data = error.data || {};
  toast(t(key, { used: data.used, limit: data.limit, premium: data.premium }), {
    duration: 6000,
    action: data.isPremium ? null : { text: t('core_premium_button'), onClick: () => navigate('/premium') }
  });
}

// Выбор дня: сегодня, вчера, позавчера и ещё неделя, затем «Другой день» (не в будущем; запись — не старше года, oldest: null — без предела)
export function pickDay({ title = t('ex_date'), current = null, oldest = 365 } = {}) {
  return new Promise((resolve) => {
    let chosen = null;
    const now = today();
    const days = Array.from({ length: 10 }, (_, i) => addDays(now, -i));
    const label = (d, i) => (i === 2 ? t('ex_day_before') : dayLabel(d));
    const dateInput = h('input', {
      type: 'date', class: 'ex-date-input', max: now, min: oldest ? addDays(now, -oldest) : null, value: current || now,
      onchange: (e) => { if (e.target.value && e.target.value <= now) { chosen = e.target.value; s.close(); } }
    });
    const s = sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => h('div', { class: 'section-body' },
        days.map((d, i) => row({
          title: label(d, i),
          trailing: d === current ? icon('check', { cls: 'row-chevron' }) : null,
          chevron: false,
          onClick: () => { chosen = d; close(); }
        })),
        h('label', { class: 'row ex-date-row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, t('ex_other_day'))), dateInput))
    });
  });
}

// Выбор категории сеткой в шторке → id или null
export function pickCategory({ categories, value = null, title = t('ex_category') }) {
  return new Promise((resolve) => {
    let chosen = null;
    sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => h('div', { class: 'section-body' }, h('div', { class: 'grid' }, categories.map(c => h('button', {
        class: `tile${c.id === value ? ' on' : ''}`,
        onclick: () => { haptic.tap(); chosen = c.id; close(); }
      }, avatar(c.icon), h('span', null, c.label)))))
    });
  });
}

// ---------- Фото чека ----------

// Фото → JPEG не больше 3000 px по длинной стороне (поворот из EXIF браузер уже применил); не вышло — как есть
async function toJpeg(file) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, 3000 / Math.max(img.naturalWidth, img.naturalHeight));
    if (file.type === 'image/jpeg' && scale === 1 && file.size <= 12 * 1024 * 1024) return file;
    const canvas = h('canvas', { width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', 0.9));
    return blob || file;
  } catch (error) {
    return file;
  }
}

// Камера или галерея → загрузка → экран распознавания. replace — заменить текущий экран (повторное фото)
export function chooseReceiptPhoto({ replace = false } = {}) {
  const input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    toast(t('ex_receipt_uploading'), { duration: 15000 });
    try {
      const image = await toJpeg(file);
      const { jobId } = await api.upload('/receipts', image, image.type || 'image/jpeg');
      haptic.light();
      navigate(`/receipt/job/${jobId}`, { replace });
    } catch (error) {
      haptic.error();
      if (error instanceof ApiError && error.code === 'receipt_limit') limitToast(error, 'ex_receipt_limit');
      else toast(errorText(error));
    }
  });
  document.body.appendChild(input);
  input.click();
}

// ---------- Несколько записей одной строкой ----------

function entryRow(entry) {
  const isIncome = entry.kind === 'income';
  return row({
    avatar: isIncome ? avatar('income', { color: 'var(--good)' }) : avatar(entry.category.icon),
    title: entry.description || (isIncome ? t('ex_income_label') : entry.category.label),
    subtitle: isIncome ? t('ex_income_label') : entry.category.label,
    value: `${isIncome ? '+' : ''}${money(entry.amount, entry.currency)}`,
    valueTone: isIncome ? 'good' : null
  });
}

// Шторка: строка «кофе 250, такси 400, +50000 зарплата» с живым предпросмотром. Одна трата — в форму (там выбирается
// категория, как в боте), один доход и несколько записей — сразу записываются. voice — текст из голоса.
// onFill(entry) — перенести одну трату в форму
export function quickEntrySheet({ text = '', voice = false, heard = null, onFill = null } = {}) {
  let preview = { entries: [], error: null };
  let timer = null;
  let seq = 0;
  const list = h('div');
  const field = h('textarea', { class: 'ex-quick-input', rows: 3, placeholder: t('ex_quick_placeholder'), value: text, oninput: () => schedule() });
  let s = null;

  function action() {
    const n = preview.entries.length;
    if (preview.error || !n) return { text: t('ex_save'), enabled: false };
    if (n === 1 && preview.entries[0].kind === 'expense' && onFill) return { text: t('ex_quick_fill'), enabled: true };
    if (n === 1) return { text: t('ex_quick_save_one'), enabled: true };
    return { text: t('ex_quick_save', { n }), enabled: true };
  }

  function paint() {
    const guessed = preview.entries.filter(e => e.guessed);
    const parts = [];
    if (preview.error === 'too_many') parts.push(h('div', { class: 'ex-note tone-bad' }, t('ex_quick_too_many', { max: preview.max || 20 })));
    else if (preview.error === 'amount') parts.push(h('div', { class: 'ex-note tone-bad' }, t('ex_quick_bad_amount')));
    else if (!preview.entries.length && field.value.trim()) parts.push(h('div', { class: 'ex-note muted' }, t('ex_quick_nothing')));
    if (preview.entries.length && !preview.error) {
      parts.push(h('div', { class: 'section' }, h('div', { class: 'section-body' }, preview.entries.map(entryRow)),
        guessed.length && !(preview.entries.length === 1 && onFill)
          ? h('div', { class: 'section-footer' }, t('ex_quick_guessed', { category: guessed[0].category.label }))
          : null));
    }
    list.replaceChildren(...parts);
    if (s && s.button) s.button.update(action());
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++seq;
      const value = field.value.trim();
      if (!value) { preview = { entries: [], error: null }; return paint(); }
      try {
        const result = await api.post('/expenses/parse', { text: value, voice });
        if (mine === seq) { preview = result; paint(); }
      } catch (error) {
        if (mine === seq) toast(errorText(error));
      }
    }, 350);
  }

  async function submit() {
    const n = preview.entries.length;
    if (!n || preview.error) return;
    if (n === 1 && preview.entries[0].kind === 'expense' && onFill) {
      const [entry] = preview.entries;
      s.close();
      onFill({ ...entry, voice });
      return;
    }
    s.button.busy(true);
    const result = await act(() => api.post('/expenses/batch', { text: field.value.trim(), voice }));
    if (s.button) s.button.busy(false);
    if (!result) return;
    s.close();
    if (result.expenses.length) changed('expenses');
    if (result.incomes.length) changed('income');
    const count = result.expenses.length + result.incomes.length;
    const undo = result.batchId
      ? { text: t('ex_undo_all'), onClick: async () => { if (await act(() => api.post(`/expenses/batch/${result.batchId}/undo`))) { changed('expenses'); changed('income'); toast(t('ex_batch_undone')); } } }
      : null;
    resultToast(count === 1 && result.incomes.length ? t('ex_income_added', { amount: money(result.incomes[0].amount, result.incomes[0].currency) }) : t('ex_batch_done', { n: count }), result.notes, undo);
    navigate('/today', { replace: true });
  }

  s = sheet({
    title: t(voice ? 'ex_voice_title' : 'ex_quick_title'),
    mainButton: { ...action(), onClick: submit },
    content: h('div', null,
      heard ? h('div', { class: 'ex-note muted' }, t('ex_voice_heard', { text: heard })) : null,
      h('div', { class: 'section' }, h('div', { class: 'section-body ex-quick-box' }, field),
        h('div', { class: 'section-footer' }, t('ex_quick_hint'))),
      list)
  });
  setTimeout(() => field.focus(), 250);
  if (text) schedule();
  return s;
}

// ---------- Голос ----------

const VOICE_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
const VOICE_MAX_SECONDS = 60;

// Запись голоса (MediaRecorder) → распознавание на сервере (whisper, как голосовые в боте) → шторка с записями
export async function recordVoice({ onFill }) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    toast(t('ex_voice_unsupported'), { duration: 5000 });
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    toast(t('ex_voice_no_mic'), { duration: 5000 });
    return;
  }
  const mimeType = VOICE_TYPES.find(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) || '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  const started = Date.now();
  let cancelled = true;
  let ticker = null;
  const clock = h('div', { class: 'ex-voice-clock' }, '0:00');
  const status = h('div', { class: 'muted center' }, t('ex_voice_listening'));
  const stopAll = () => { clearInterval(ticker); stream.getTracks().forEach(track => track.stop()); };

  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = async () => {
    stopAll();
    if (cancelled) return;
    const seconds = Math.min(VOICE_MAX_SECONDS, Math.round((Date.now() - started) / 1000));
    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
    status.textContent = t('ex_voice_recognizing');
    s.button.busy(true);
    try {
      const result = await api.upload(`/expenses/voice?duration=${seconds}`, blob, blob.type.split(';')[0]);
      haptic.success();
      closeQuietly();
      if (!result.transcript) { toast(t('ex_voice_empty')); return; }
      quickEntrySheet({ text: result.transcript, voice: true, heard: result.transcript, onFill });
    } catch (error) {
      haptic.error();
      closeQuietly();
      if (error instanceof ApiError && error.code === 'voice_limit') limitToast(error, 'ex_voice_limit');
      else toast(errorText(error));
    }
  };

  let quiet = false;
  function closeQuietly() { quiet = true; s.close(); }
  const s = sheet({
    title: t('ex_voice_title'),
    mainButton: { text: t('ex_voice_stop'), onClick: () => { if (recorder.state === 'recording') { cancelled = false; recorder.stop(); } } },
    onClose: () => { if (!quiet && recorder.state === 'recording') recorder.stop(); else if (!quiet) stopAll(); },
    content: h('div', { class: 'ex-voice' }, h('div', { class: 'ex-voice-mic' }, icon('mic')), clock, status)
  });
  recorder.start();
  ticker = setInterval(() => {
    const sec = Math.round((Date.now() - started) / 1000);
    clock.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (sec >= VOICE_MAX_SECONDS && recorder.state === 'recording') { cancelled = false; recorder.stop(); }
  }, 250);
}
