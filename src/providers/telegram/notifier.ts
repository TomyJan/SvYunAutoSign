import { Telegraf } from 'telegraf';
import type { NotificationProvider } from '../../core/notification.js';

interface TelegramBotLike {
  telegram: {
    sendMessage(
      chatId: string,
      text: string,
      options: { disable_web_page_preview: boolean },
    ): Promise<unknown>;
  };
}

export interface TelegramNotifierOptions {
  botToken: string;
  chatId: string;
  bot?: TelegramBotLike;
  maxMessageLength?: number;
}

export class TelegramNotifier implements NotificationProvider {
  readonly name = 'telegram';
  private readonly bot: TelegramBotLike;
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly maxMessageLength: number;

  constructor(options: TelegramNotifierOptions) {
    this.botToken = options.botToken;
    this.chatId = options.chatId;
    this.maxMessageLength = options.maxMessageLength ?? 4096;
    this.bot = options.bot ?? createTelegrafAdapter(options.botToken);
  }

  async send(message: string): Promise<void> {
    try {
      for (const chunk of splitTelegramMessage(message, this.maxMessageLength)) {
        await this.bot.telegram.sendMessage(this.chatId, chunk, { disable_web_page_preview: true });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Telegram notification failed: ${reason.split(this.botToken).join('***')}`, {
        cause: error,
      });
    }
  }
}

function splitTelegramMessage(message: string, maxLength: number): string[] {
  if (message.length <= maxLength) return [message];

  const chunks: string[] = [];
  let current = '';

  for (const line of message.split('\n')) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    for (let index = 0; index < line.length; index += maxLength) {
      chunks.push(line.slice(index, index + maxLength));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks;
}

/* v8 ignore next 12 -- telegraf network adapter is exercised through injected bot in unit tests. */
function createTelegrafAdapter(botToken: string): TelegramBotLike {
  const bot = new Telegraf(botToken);
  return {
    telegram: {
      sendMessage(chatId, text) {
        return bot.telegram.sendMessage(chatId, text, {
          link_preview_options: { is_disabled: true },
        });
      },
    },
  };
}
