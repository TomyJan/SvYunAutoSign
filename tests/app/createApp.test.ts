import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';

describe('createApp', () => {
  it('creates workflow and notifier dependencies from environment', () => {
    const app = createApp({
      SVYUN_USERNAME_MAIN: 'main@example.com',
      SVYUN_PASSWORD_MAIN: 'main-password',
      TELEGRAM_BOT_TOKEN: '123456:telegram-token',
      TELEGRAM_CHAT_ID: '42',
    });

    expect(typeof app.workflow).toBe('function');
    expect(app.notifier.name).toBe('telegram');
  });
});
