import { describe, expect, it } from 'vitest';
import { maskAccount } from '../../src/core/account.js';

describe('maskAccount', () => {
  it('masks email accounts', () => {
    expect(maskAccount('tomyjan6@gmail.com')).toBe('t***@gmail.com');
  });

  it('masks phone accounts', () => {
    expect(maskAccount('13812345678')).toBe('138****5678');
  });

  it('masks plain usernames', () => {
    expect(maskAccount('tom')).toBe('t***m');
    expect(maskAccount('ab')).toBe('**');
  });
});
