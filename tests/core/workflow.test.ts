import { describe, expect, it, vi } from 'vitest';
import type { SvyunAccount } from '../../src/core/account.js';
import { runAccountsWorkflow } from '../../src/core/workflow.js';

const accounts: SvyunAccount[] = [
  {
    id: 'MAIN',
    displayName: '主号',
    username: 'main@example.com',
    password: 'main-password',
    usernameMasked: 'm***@example.com',
  },
  {
    id: 'ALT',
    displayName: '小号',
    username: 'alt@example.com',
    password: 'alt-password',
    usernameMasked: 'a***@example.com',
  },
];

describe('runAccountsWorkflow', () => {
  it('runs accounts serially and aggregates successful stage results', async () => {
    const order: string[] = [];
    const runner = {
      run: vi.fn(async (account: SvyunAccount) => {
        order.push(`start:${account.id}`);
        await Promise.resolve();
        order.push(`end:${account.id}`);
        return {
          accountId: account.id,
          accountName: account.displayName,
          usernameMasked: account.usernameMasked,
          success: true,
          stages: [
            { name: 'login', success: true, message: '登录成功' },
            { name: 'sign', success: true, message: '签到成功' },
            { name: 'draw', success: true, message: '抽奖成功' },
          ],
        };
      }),
    };

    const result = await runAccountsWorkflow(accounts, runner);

    expect(order).toEqual(['start:MAIN', 'end:MAIN', 'start:ALT', 'end:ALT']);
    expect(result.success).toBe(true);
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0]?.stages.map((stage) => stage.name)).toEqual([
      'login',
      'sign',
      'draw',
    ]);
  });

  it('continues after one account fails and marks aggregate failure', async () => {
    const runner = {
      run: vi.fn((account: SvyunAccount) => {
        if (account.id === 'MAIN') {
          throw new Error('login failed');
        }

        return Promise.resolve({
          accountId: account.id,
          accountName: account.displayName,
          usernameMasked: account.usernameMasked,
          success: true,
          stages: [{ name: 'login', success: true, message: '登录成功' }],
        });
      }),
    };

    const result = await runAccountsWorkflow(accounts, runner);

    expect(runner.run).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0]).toMatchObject({
      accountId: 'MAIN',
      success: false,
      stages: [{ name: 'account', success: false, message: 'login failed' }],
    });
    expect(result.accounts[1]).toMatchObject({ accountId: 'ALT', success: true });
  });
});
