import { describe, expect, it } from 'vitest';
import { collectEnvSecrets } from '../../src/infra/envSecrets.js';

describe('collectEnvSecrets', () => {
  it('collects sensitive environment values by key name', () => {
    expect(
      collectEnvSecrets({
        PASSWORD: 'password-value',
        API_TOKEN: 'token-value',
        COOKIE: 'cookie-value',
        JWT: 'jwt-value',
        AUTHORIZATION: 'Bearer auth-value',
        NORMAL: 'public-value',
      }),
    ).toEqual(['password-value', 'token-value', 'cookie-value', 'jwt-value', 'Bearer auth-value']);
  });

  it('collects values from GitHub secrets JSON bridge when present', () => {
    expect(
      collectEnvSecrets({
        ACTION_SECRETS_JSON: JSON.stringify({
          SVYUN_USERNAME_MAIN: 'main@example.com',
          SVYUN_PASSWORD_MAIN: 'main-password',
          TELEGRAM_BOT_TOKEN: 'telegram-token',
          NORMAL_SECRET: 'ignored',
        }),
      }),
    ).toEqual(['main@example.com', 'main-password', 'telegram-token']);
  });

  it('ignores invalid GitHub secrets JSON without leaking it', () => {
    expect(collectEnvSecrets({ ACTION_SECRETS_JSON: '{not-json' })).toEqual([]);
  });

  it('ignores non-object GitHub secrets JSON values', () => {
    expect(collectEnvSecrets({ ACTION_SECRETS_JSON: 'null' })).toEqual([]);
  });
});
