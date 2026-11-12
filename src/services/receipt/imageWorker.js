// Обработка картинок в отдельном потоке: jpeg-js на чистом JS декодирует 12 Мп ~1,5 с — в основном потоке это
// остановило бы бота для всех пользователей. Поток ограничен по памяти: фото присылает любой пользователь, и
// «бомба» (огромное разрешение) не должна съесть память процесса бота. Упавший поток (нехватка памяти и т. п.) —
// отказ ImageTaskError, работа в основном потоке не повторяется. Там она идёт, только если поток не создаётся вовсе.
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { prepareReceiptImage, rotateJpeg } = require('./imagePrep');
const { readFiscalQr } = require('./qr');

// Как у разбора выписок (utils/statement/worker.js): декодирование до 24 Мп (imagePrep/qr) укладывается с запасом
const RESOURCE_LIMITS = { maxOldGenerationSizeMb: 512, maxYoungGenerationSizeMb: 64, stackSizeMb: 4 };

const TASKS = {
  prepare: (buffer, options) => prepareReceiptImage(buffer, options),
  rotate: (buffer, options) => ({ image: rotateJpeg(buffer, options.degrees) }),
  qr: (buffer) => ({ qr: readFiscalQr(buffer) })
};

class ImageTaskError extends Error {
  constructor(message) {
    super(message);
    this.code = 'image_worker_failed';
  }
}

function runInline(task, buffer, options) {
  return TASKS[task](buffer, options);
}

// task: 'prepare' → { image, mimeType, info }; 'rotate' ({ degrees }) → { image }; 'qr' → { qr } (receipt/qr.js)
function runImageTask(task, buffer, options = {}) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(path.join(__dirname, 'imageWorker.js'), { workerData: { task, buffer, options }, resourceLimits: RESOURCE_LIMITS });
    } catch (error) {
      try {
        resolve(runInline(task, buffer, options));
      } catch (inlineError) {
        reject(inlineError);
      }
      return;
    }
    let settled = false;
    worker.once('message', (message) => {
      settled = true;
      if (message.error) reject(new Error(message.error));
      else resolve(message.result.image ? { ...message.result, image: Buffer.from(message.result.image) } : message.result);
    });
    // Нехватка памяти (ERR_WORKER_OUT_OF_MEMORY) и прочие падения потока — картинку не обработать
    worker.once('error', (error) => {
      if (settled) return;
      settled = true;
      require('../../utils/logger').warn('Image worker failed', { task, error: error.message, code: error.code });
      reject(new ImageTaskError(error.message));
    });
    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      reject(new ImageTaskError(`image worker exited with ${code}`));
    });
  });
}

if (!isMainThread && workerData && workerData.task) {
  try {
    const result = runInline(workerData.task, Buffer.from(workerData.buffer), workerData.options);
    parentPort.postMessage({ result });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
}

module.exports = { runImageTask, ImageTaskError, RESOURCE_LIMITS };
