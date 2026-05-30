import { describe, expect, it, vi } from 'vitest';
import type { SvyunAccount } from '../../src/core/account.js';
import type { AccountRunResult } from '../../src/core/task.js';
import type { AccountTaskRunner } from '../../src/core/workflow.js';

const workflowMock = vi.hoisted(() => ({
  runAccountsWorkflow: vi.fn(
    async (
      accounts: readonly SvyunAccount[],
      runner: AccountTaskRunner,
    ): Promise<AccountRunResult> => {
      return runner.run(accounts[0]!);
    },
  ),
}));

vi.mock('../../src/core/workflow.js', () => ({
  runAccountsWorkflow: workflowMock.runAccountsWorkflow,
}));

vi.mock('../../src/providers/svyun/client.js', () => ({
  SvyunClient: vi.fn(function SvyunClient() {
    return {
      login() {
        return Promise.resolve({ success: true, message: '登录成功', jwt: 'jwt-token' });
      },
      getSignInfo() {
        return Promise.resolve({ alreadySigned: true, message: '今日已签到' });
      },
      getPrimaryDrawActivityId() {
        return Promise.resolve(undefined);
      },
    };
  }),
}));

import { createApp } from '../../src/app/createApp.js';

describe('createApp', () => {
  it('creates workflow and notifier dependencies from environment', async () => {
    const app = createApp({
      SVYUN_USERNAME_MAIN: 'main@example.com',
      SVYUN_PASSWORD_MAIN: 'main-password',
      TELEGRAM_BOT_TOKEN: '123456:telegram-token',
      TELEGRAM_CHAT_ID: '42',
    });

    expect(typeof app.workflow).toBe('function');
    expect(app.notifier.name).toBe('telegram');
    expect(app.secrets).toEqual([
      '123456:telegram-token',
      '42',
      'main@example.com',
      'main-password',
    ]);

    await expect(app.workflow()).resolves.toMatchObject({ accountId: 'MAIN', success: true });
    expect(workflowMock.runAccountsWorkflow).toHaveBeenCalledTimes(1);
  });
});
