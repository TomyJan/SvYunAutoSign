import { describe, expect, it } from 'vitest';
import { redactSensitive } from '../../src/infra/redact.js';

describe('redactSensitive', () => {
  it('redacts password token cookie and authorization values', () => {
    const text = 'password=qwer123456 token=abc cookie=sid=secret authorization=Bearer xyz';

    expect(redactSensitive(text)).toBe('password=*** token=*** cookie=*** authorization=***');
  });

  it('redacts known secret values from arbitrary text', () => {
    const text = 'login failed for qwer123456 with token 123456:telegram-token';

    expect(redactSensitive(text, ['qwer123456', '123456:telegram-token'])).toBe(
      'login failed for *** with token ***',
    );
  });
});
