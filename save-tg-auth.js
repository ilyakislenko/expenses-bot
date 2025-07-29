const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://web.telegram.org/k/');
  console.log('Пожалуйста, залогиньтесь в Telegram вручную...');
  await page.waitForTimeout(60000); // 60 секунд на ручной вход
  await context.storageState({ path: 'tg.auth.json' });
  await browser.close();
  console.log('Сессия сохранена в tg.auth.json');
})(); 