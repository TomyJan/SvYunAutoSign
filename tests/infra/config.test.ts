import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/infra/config.js';

const telegramEnv = {
  TELEGRAM_BOT_TOKEN: '123456:telegram-token',
  TELEGRAM_CHAT_ID: '10086',
};

describe('loadConfig', () => {
  it('loads multiple accounts from matching secret suffixes', () => {
    const config = loadConfig({
      ...telegramEnv,
      SVYUN_DISPLAYNAME_MAIN: '主号',
      SVYUN_USERNAME_MAIN: 'main@example.com',
      SVYUN_PASSWORD_MAIN: 'main-password',
      SVYUN_USERNAME_ALT_01: 'alt@example.com',
      SVYUN_PASSWORD_ALT_01: 'alt-password',
    });

    expect(config.svyun.accounts).toEqual([
      {
        id: 'ALT_01',
        displayName: 'ALT_01',
        username: 'alt@example.com',
        password: 'alt-password',
        usernameMasked: 'a***@example.com',
      },
      {
        id: 'MAIN',
        displayName: '主号',
        username: 'main@example.com',
        password: 'main-password',
        usernameMasked: 'm***@example.com',
      },
    ]);
    expect(config.telegram.chatId).toBe('10086');
    expect(config.defaults.baseUrl).toBe('https://www.svyun.com');
    expect(config.defaults.drawEnabled).toBe(true);
  });

  it('fails when no accounts are configured', () => {
    expect(() => loadConfig(telegramEnv)).toThrow(/SVYUN_USERNAME_<ID>/);
  });

  it('fails when a password is missing without leaking configured secrets', () => {
    expect(() =>
      loadConfig({
        ...telegramEnv,
        SVYUN_USERNAME_MAIN: 'main@example.com',
        SVYUN_PASSWORD_OTHER: 'other-password',
      }),
    ).toThrow(/SVYUN_PASSWORD_MAIN/);

    try {
      loadConfig({
        ...telegramEnv,
        SVYUN_USERNAME_MAIN: 'main@example.com',
        SVYUN_PASSWORD_OTHER: 'other-password',
      });
    } catch (error) {
      expect(String(error)).not.toContain('other-password');
      expect(String(error)).not.toContain('123456:telegram-token');
    }
  });
});
