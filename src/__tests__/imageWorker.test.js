// Поток обработки картинок чека: ограничен по памяти, упавший поток — отказ без повтора в основном потоке бота
// (повтор там съел бы память всего процесса), в основном потоке — только если поток не создаётся вовсе.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));
const EventEmitter = require('events');

function loadWith(WorkerImpl) {
  const prep = {
    prepareReceiptImage: jest.fn(() => ({ image: Buffer.from('prepared'), mimeType: 'image/jpeg', info: { prepared: true } })),
    rotateJpeg: jest.fn(() => Buffer.from('rotated'))
  };
  let mod;
  jest.isolateModules(() => {
    jest.doMock('worker_threads', () => ({ Worker: WorkerImpl, isMainThread: true, parentPort: null, workerData: null }));
    jest.doMock('../services/receipt/imagePrep', () => prep);
    mod = require('../services/receipt/imageWorker');
  });
  return { mod, prep };
}

afterEach(() => {
  jest.dontMock('worker_threads');
  jest.dontMock('../services/receipt/imagePrep');
});

describe('image worker isolation', () => {
  test('a crashed worker (out of memory) is a refusal, not a retry in the main thread; the worker has memory limits', async () => {
    const created = [];
    class CrashingWorker extends EventEmitter {
      constructor(file, options) {
        super();
        created.push(options);
        setImmediate(() => this.emit('error', Object.assign(new Error('Worker terminated due to reaching memory limit: JS heap out of memory'), { code: 'ERR_WORKER_OUT_OF_MEMORY' })));
      }
    }
    const { mod, prep } = loadWith(CrashingWorker);
    await expect(mod.runImageTask('prepare', Buffer.from([0xff, 0xd8, 0xff]), {})).rejects.toMatchObject({ code: 'image_worker_failed' });
    await expect(mod.runImageTask('rotate', Buffer.from([0xff, 0xd8, 0xff]), { degrees: 90 })).rejects.toBeInstanceOf(mod.ImageTaskError);
    expect(prep.prepareReceiptImage).not.toHaveBeenCalled();
    expect(prep.rotateJpeg).not.toHaveBeenCalled();
    expect(created[0].resourceLimits).toEqual({ maxOldGenerationSizeMb: 512, maxYoungGenerationSizeMb: 64, stackSizeMb: 4 });
  });

  test('a worker that exits without an answer is also a refusal', async () => {
    class SilentWorker extends EventEmitter {
      constructor() {
        super();
        setImmediate(() => this.emit('exit', 1));
      }
    }
    const { mod, prep } = loadWith(SilentWorker);
    await expect(mod.runImageTask('qr', Buffer.from('x'))).rejects.toMatchObject({ code: 'image_worker_failed' });
    expect(prep.prepareReceiptImage).not.toHaveBeenCalled();
  });

  test('only when a worker cannot be created at all does the task run in the main thread', async () => {
    function NoWorker() {
      throw new Error('worker threads unavailable');
    }
    const { mod, prep } = loadWith(NoWorker);
    await expect(mod.runImageTask('prepare', Buffer.from('x'), {})).resolves.toMatchObject({ mimeType: 'image/jpeg' });
    expect(prep.prepareReceiptImage).toHaveBeenCalledTimes(1);
  });
});

describe('ReceiptService: a photo that crashes the image worker', () => {
  test('is «unreadable» without a model request and without a frame to rotate', async () => {
    let ReceiptService;
    let ImageTaskError;
    jest.isolateModules(() => {
      ({ ImageTaskError } = jest.requireActual('../services/receipt/imageWorker'));
      jest.doMock('../services/receipt/imageWorker', () => ({
        runImageTask: jest.fn(async () => { throw new ImageTaskError('Worker terminated due to reaching memory limit'); })
      }));
      ReceiptService = require('../services/ReceiptService');
    });
    const provider = { configured: true, recognize: jest.fn() };
    const service = new ReceiptService({ provider, localizationService: { getText: (lang, key) => key } });
    service.recognize = jest.fn();
    const result = await service.recognizePhoto(7, { image: Buffer.from([0xff, 0xd8, 0xff]), mimeType: 'image/jpeg', lang: 'ru', currency: 'RUB', timezone: 'UTC' });
    expect(result).toMatchObject({ error: { code: 'unreadable' }, image: null, mimeType: null, attempts: 0 });
    expect(service.recognize).not.toHaveBeenCalled();
    jest.dontMock('../services/receipt/imageWorker');
  });
});
