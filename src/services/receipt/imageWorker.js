// Обработка картинок в отдельном потоке: jpeg-js на чистом JS декодирует 12 Мп ~1,5 с — в основном потоке это
// остановило бы бота для всех пользователей. Если поток не запустился — та же работа в основном потоке.
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { prepareReceiptImage, rotateJpeg } = require('./imagePrep');

const TASKS = {
  prepare: (buffer, options) => prepareReceiptImage(buffer, options),
  rotate: (buffer, options) => ({ image: rotateJpeg(buffer, options.degrees) })
};

function runInline(task, buffer, options) {
  return TASKS[task](buffer, options);
}

// task: 'prepare' → { image, mimeType, info }; 'rotate' ({ degrees }) → { image }
function runImageTask(task, buffer, options = {}) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(path.join(__dirname, 'imageWorker.js'), { workerData: { task, buffer, options } });
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
      else resolve({ ...message.result, image: Buffer.from(message.result.image) });
    });
    worker.once('error', (error) => {
      if (settled) return;
      settled = true;
      try {
        resolve(runInline(task, buffer, options));
      } catch (inlineError) {
        reject(inlineError || error);
      }
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

module.exports = { runImageTask };
