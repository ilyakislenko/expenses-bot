#!/usr/bin/env node

/**
 * Скрипт для ручного обновления курсов валют
 * Использует тот же механизм, что и cron-задача
 * 
 * Использование: node update-currencies.js
 */

require('dotenv').config();
const Container = require('./src/container');
const currencyConfig = require('./src/config/currencies');

async function updateCurrencies() {
  console.log('=== Обновление курсов валют ===\n');
  
  try {
    // Создаем контейнер и получаем зависимости
    const container = new Container();
    const currencyUtils = container.getHandlers().currencyUtils;
    
    console.log('📋 Валюты для обновления:');
    currencyConfig.SUPPORTED_CURRENCIES.forEach((currency, index) => {
      console.log(`${index + 1}. ${currency}`);
    });
    
    console.log(`\n💰 Базовая валюта: ${currencyConfig.BASE_CURRENCY}`);
    console.log(`🌐 Источник: ${currencyConfig.API_URL}`);
    
    // Проверяем, нужно ли обновление
    const needUpdate = await currencyUtils.needUpdateRates();
    console.log(`⏰ Требуется обновление: ${needUpdate ? 'Да' : 'Нет'}\n`);
    
    console.log('🔄 Обновляем курсы валют...');
    
    // Обновляем курсы
    await currencyUtils.updateRates(currencyConfig.SUPPORTED_CURRENCIES);
    
    console.log('✅ Курсы валют успешно обновлены!\n');
    
    // Показываем текущие курсы
    console.log('📈 Актуальные курсы (в рублях):');
    for (const currency of currencyConfig.SUPPORTED_CURRENCIES) {
      try {
        const rate = await currencyUtils.getRate(currency);
        if (rate === 1) {
          console.log(`${currency}: 1.0000 (базовая)`);
        } else {
          console.log(`${currency}: ${rate.toFixed(4)}`);
        }
      } catch (error) {
        console.log(`${currency}: ❌ Ошибка`);
      }
    }
    
    console.log('\n🎉 Готово!');
    
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении курсов:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Проверяем, что скрипт запускается напрямую
if (require.main === module) {
  updateCurrencies().catch(console.error);
}

module.exports = updateCurrencies;
