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
      checkConnectivity() {
        return Promise.resolve(true);
      },
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
    expect(workflowMock.runAccountsWorkflow).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      app.logger,
    );
  });

  it('creates a console logger that redacts configured secrets', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const app = createApp({
        SVYUN_USERNAME_MAIN: 'main@example.com',
        SVYUN_PASSWORD_MAIN: 'main-password',
        TELEGRAM_BOT_TOKEN: '123456:telegram-token',
        TELEGRAM_CHAT_ID: '42',
      });

      app.logger.info('token=123456:telegram-token password=main-password');

      expect(log).toHaveBeenCalledWith('token=*** password=***');
    } finally {
      log.mockRestore();
    }
  });

  it('precheck succeeds when connectivity check passes', async () => {
    const app = createApp({
      SVYUN_USERNAME_MAIN: 'main@example.com',
      SVYUN_PASSWORD_MAIN: 'main-password',
      TELEGRAM_BOT_TOKEN: '123456:telegram-token',
      TELEGRAM_CHAT_ID: '42',
    });

    await expect(app.precheck()).resolves.toBeUndefined();
  });

  it('precheck throws after exhausting connectivity retries', async () => {
    const { SvyunClient } = await import('../../src/providers/svyun/client.js');
    const mockSvyunClient = vi.mocked(SvyunClient);

    mockSvyunClient.mockImplementation(function FailingClient() {
      return {
        checkConnectivity: () => Promise.resolve(false),
        login: vi.fn(),
        getSignInfo: vi.fn(),
        sign: vi.fn(),
        getPrimaryDrawActivityId: vi.fn(),
        getDrawTimes: vi.fn(),
        draw: vi.fn(),
      } as unknown as InstanceType<typeof SvyunClient>;
    });

    vi.useFakeTimers();

    try {
      const app = createApp({
        SVYUN_USERNAME_MAIN: 'main@example.com',
        SVYUN_PASSWORD_MAIN: 'main-password',
        TELEGRAM_BOT_TOKEN: '123456:telegram-token',
        TELEGRAM_CHAT_ID: '42',
      });

      let caughtError: unknown;
      const precheckPromise = app.precheck().catch((error: unknown) => {
        caughtError = error;
      });

      await vi.advanceTimersByTimeAsync(10_000);
      await precheckPromise;

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toMatch(/无法连接到.*已重试 3 次/);
    } finally {
      vi.useRealTimers();
      mockSvyunClient.mockReset();
    }
  });
});
