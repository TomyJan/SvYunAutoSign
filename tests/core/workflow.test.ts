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

  it('records non-error thrown values as failed account messages', async () => {
    const runner = {
      run: vi.fn(async () => {
        await Promise.resolve();
        const plainFailure = 'plain failure' as unknown as Error;
        throw plainFailure;
      }),
    };

    const result = await runAccountsWorkflow([accounts[0]!], runner);

    expect(result.accounts[0]?.stages[0]?.message).toBe('plain failure');
  });

  it('logs account progress while running accounts serially', async () => {
    const info = vi.fn<(message: string) => void>();
    const runner = {
      run: vi.fn((account: SvyunAccount) =>
        Promise.resolve({
          accountId: account.id,
          accountName: account.displayName,
          usernameMasked: account.usernameMasked,
          success: account.id !== 'ALT',
          stages: [
            {
              name: 'sign',
              success: account.id !== 'ALT',
              message: account.id === 'ALT' ? '签到失败' : '签到成功',
            },
          ],
        }),
      ),
    };

    await runAccountsWorkflow(accounts, runner, { info });

    expect(info.mock.calls.map(([message]) => message)).toEqual([
      '开始执行速维云自动签到，共 2 个账号',
      '开始执行账号 1/2：主号（m***@example.com）',
      '账号执行成功：主号（m***@example.com）',
      '开始执行账号 2/2：小号（a***@example.com）',
      '账号执行失败：小号（a***@example.com）：sign：签到失败',
      '速维云自动签到执行完成：1/2 成功',
    ]);
  });

  it('logs unknown error when a failed account has no failed stages', async () => {
    const info = vi.fn<(message: string) => void>();
    const runner = {
      run: vi.fn((account: SvyunAccount) =>
        Promise.resolve({
          accountId: account.id,
          accountName: account.displayName,
          usernameMasked: account.usernameMasked,
          success: false,
          stages: [{ name: 'login', success: true, message: '登录成功' }],
        }),
      ),
    };

    await runAccountsWorkflow([accounts[0]!], runner, { info });

    expect(info).toHaveBeenCalledWith('账号执行失败：主号（m***@example.com）：未知错误');
  });
});
