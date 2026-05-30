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
}

export class TelegramNotifier implements NotificationProvider {
  readonly name = 'telegram';
  private readonly bot: TelegramBotLike;
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(options: TelegramNotifierOptions) {
    this.botToken = options.botToken;
    this.chatId = options.chatId;
    this.bot = options.bot ?? createTelegrafAdapter(options.botToken);
  }

  async send(message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { disable_web_page_preview: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Telegram notification failed: ${reason.split(this.botToken).join('***')}`, {
        cause: error,
      });
    }
  }
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
