import { test, expect } from '@playwright/test';

const BOT_NAME       = 'ExpensesAssistant_bot';
const TG_WEB_URL     = 'https://web.telegram.org/k/';
const SEARCH_BUTTON  = /search|поиск/i;
const SEARCH_BOX_PH  = /search|поиск/i;

test.describe('E2E: Telegram bot flows', () => {

  test('Открытие интерактивного меню', async ({ browser }) => {
    // 1️⃣ Запускаем persistent context
    const context = await browser.newContext({ 
      storageState: 'tg.auth.json',
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });
    const page = await context.newPage();

    // 2️⃣ Открываем Telegram
    await page.goto('https://web.telegram.org/k/#@ExpensesAssistant_bot');
    await page.waitForTimeout(5000); // ждём загрузки чата с ботом

    // 3️⃣ Отправляем команду /menu
    await page.keyboard.type('/menu');
    await page.keyboard.press('Enter');

    // 4️⃣ Ждём появления интерактивного меню
    await page.waitForTimeout(1000); // ждём ответа бота
    await page.keyboard.type('200 такси аэропорт ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.locator('Транспорт').click();
    await page.keyboard.type('500 еще один такси аэропорт ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.locator('Транспорт').click();
    
    // 5️⃣ Проверяем, что появилось меню (ищем кнопки или клавиатуру)
    const hasInlineKeyboard = await page.locator('.inline-keyboard, .keyboard, button').count() > 0;
    expect(hasInlineKeyboard).toBeTruthy();
  });
});
