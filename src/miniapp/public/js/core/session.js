// Данные старта (/api/me): язык и строки, валюта, пояс, премиум, семья, контур главных экранов. После смены
// настроек (язык, валюта, семья, премиум) экран зовёт reloadMe() — строки и форматирование обновятся.
import { api } from './api.js';
import { setup, me } from './i18n.js';

export async function reloadMe() {
  const data = await api.get('/me');
  setup(data);
  return data;
}

export { me };
