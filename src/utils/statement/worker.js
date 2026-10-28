// Разбор выписки в отдельном потоке: файл присылает любой пользователь, и разбор (регулярки по тексту, pdf.js)
// не должен останавливать бота для всех. Поток ограничен по времени и памяти; при превышении —
// ImportError('too_complex'). Если поток не запустился — тот же разбор в основном потоке.
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const PARSE_TIMEOUT_MS = 20000;
const RESOURCE_LIMITS = { maxOldGenerationSizeMb: 512, maxYoungGenerationSizeMb: 64, stackSizeMb: 4 };

// buffer → результат parseStatement; ошибки разбора — ImportError с тем же кодом
function parseStatementIsolated(buffer, options = {}, { timeoutMs = PARSE_TIMEOUT_MS } = {}) {
  const statement = require('./index');
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: { statementTask: true, buffer, options },
        resourceLimits: RESOURCE_LIMITS
      });
    } catch (error) {
      statement.parseStatement(buffer, options).then(resolve, reject);
      return;
    }
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const tooComplex = () => new statement.ImportError('too_complex');
    const timer = setTimeout(() => {
      finish(reject, tooComplex());
      worker.terminate().catch(() => {});
    }, timeoutMs);
    worker.once('message', (message) => {
      if (message.result) finish(resolve, message.result);
      else if (message.importCode) finish(reject, new statement.ImportError(message.importCode, message.params));
      else finish(reject, new Error(message.error));
    });
    // Нехватка памяти (ERR_WORKER_OUT_OF_MEMORY) и прочие падения потока — файл не разобрать
    worker.once('error', (error) => {
      require('../logger').warn('Statement worker failed', { error: error.message, code: error.code });
      finish(reject, tooComplex());
    });
    worker.once('exit', () => finish(reject, tooComplex()));
  });
}

if (!isMainThread && workerData && workerData.statementTask) {
  const { parseStatement, ImportError } = require('./index');
  parseStatement(Buffer.from(workerData.buffer), workerData.options)
    .then(result => parentPort.postMessage({ result }))
    .catch(error => parentPort.postMessage(error instanceof ImportError
      ? { importCode: error.code, params: error.params }
      : { error: error.message }));
}

module.exports = { parseStatementIsolated, PARSE_TIMEOUT_MS };
