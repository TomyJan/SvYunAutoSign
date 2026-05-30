import { describe, expect, it, vi } from 'vitest';

const telegrafMock = vi.hoisted(() => {
  const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
  const Telegraf = vi.fn(function Telegraf() {
    return { telegram: { sendMessage } };
  });
  return { Telegraf, sendMessage };
});

vi.mock('telegraf', () => ({
  Telegraf: telegrafMock.Telegraf,
}));

import {
  createTelegrafAdapter,
  TelegramNotifier,
} from '../../../src/providers/telegram/notifier.js';

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

  it('redacts non-error failures', async () => {
    const sendMessage = vi.fn().mockRejectedValue('token 123456:telegram-token failed');
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
    });

    await expect(notifier.send('hello')).rejects.not.toThrow(/123456:telegram-token/);
  });

  it('splits multiline messages on line boundaries', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
      maxMessageLength: 8,
    });

    await notifier.send('aa\nbb\ncccccccc');

    expect(sendMessage.mock.calls.map((call: unknown[]) => String(call[1]))).toEqual([
      'aa\nbb',
      'cccccccc',
    ]);
  });

  it('splits a single long line when it exceeds the limit', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
      maxMessageLength: 5,
    });

    await notifier.send('abcdefghijkl');

    expect(sendMessage.mock.calls.map((call: unknown[]) => String(call[1]))).toEqual([
      'abcde',
      'fghij',
      'kl',
    ]);
  });

  it('splits a long line after flushing the current chunk', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const notifier = new TelegramNotifier({
      botToken: '123456:telegram-token',
      chatId: '42',
      bot: { telegram: { sendMessage } },
      maxMessageLength: 5,
    });

    await notifier.send('ab\ncdefgh');

    expect(sendMessage.mock.calls.map((call: unknown[]) => String(call[1]))).toEqual([
      'ab',
      'cdefg',
      'h',
    ]);
  });

  it('creates a telegraf adapter with disabled link preview', async () => {
    const adapter = createTelegrafAdapter('123456:telegram-token');

    await adapter.telegram.sendMessage('42', 'hello', { disable_web_page_preview: true });

    expect(telegrafMock.Telegraf).toHaveBeenCalledWith('123456:telegram-token');
    expect(telegrafMock.sendMessage).toHaveBeenCalledWith('42', 'hello', {
      link_preview_options: { is_disabled: true },
    });
  });
});
