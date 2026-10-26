const NotificationService = require('../services/NotificationService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

// Сообщения о семье уходят с parse_mode Markdown: имя семьи и username — пользовательский ввод.
// Неэкранированный "_" или "*" Telegram отклоняет ("can't parse entities"), и человек ничего не получает.
describe('NotificationService family messages', () => {
  let service;
  let sendMessage;

  beforeEach(() => {
    sendMessage = jest.fn().mockResolvedValue({});
    service = new NotificationService(
      new LocalizationService(),
      { getUserLanguage: jest.fn().mockResolvedValue('ru') },
      new Formatter({})
    );
    service.setBot({ telegram: { sendMessage } });
  });

  test('invitation escapes Markdown in family name and inviter username, names outside bold', async () => {
    await service.sendFamilyInvitation(42, 'Дом_*1*', 'smoke_owner', 'AB12CD34');

    const [chatId, text, extra] = sendMessage.mock.calls[0];
    expect(chatId).toBe(42);
    expect(extra.parse_mode).toBe('Markdown');
    // Внутри *жирного* Telegram не понимает экранирование, поэтому имя — снаружи, в кавычках
    expect(text).toContain('«Дом\\_\\*1\\*»');
    expect(text).toContain('smoke\\_owner');
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data))
      .toEqual(['accept_invitation|AB12CD34', 'reject_invitation|AB12CD34']);
  });

  test('removal and cancellation notices escape names too', async () => {
    await service.sendFamilyMemberRemoved(42, 'Семья_1', 'owner_name');
    await service.sendInvitationCancelled(42, 'Семья_1', 'owner_name');

    for (const [, text] of sendMessage.mock.calls) {
      expect(text).toContain('Семья\\_1');
      expect(text).not.toMatch(/[^\\]_/);
    }
  });
});
