import { describe, expect, it, vi } from 'vitest';
import { TelegramNotifier } from '../../../src/providers/telegram/notifier.js';

describe('TelegramNotifier', () => {
  it('sends message through telegraf telegram API', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
    });

    await notifier.send('hello');

    expect(sendMessage).toHaveBeenCalledWith('42', 'hello', { disable_web_page_preview: true });
  });

  it('does not leak bot token when sending fails', async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValue(new Error('network 123456:telegram-token failed'));
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
    });

    await expect(notifier.send('hello')).rejects.not.toThrow(/123456:telegram-token/);
  });
});
