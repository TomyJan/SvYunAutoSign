import { describe, expect, it, vi } from 'vitest';
import type { NotificationProvider } from '../../src/core/notification.js';
import type { WorkflowResult } from '../../src/core/task.js';
import { runApp } from '../../src/app/run.js';

const successResult: WorkflowResult = {
  success: true,
  accounts: [
    {
      accountId: 'MAIN',
      accountName: '主号',
      usernameMasked: 'm***@example.com',
      success: true,
      stages: [{ name: 'login', success: true, message: '登录成功' }],
    },
  ],
};

describe('runApp', () => {
  it('runs workflow and sends summary notification', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue(successResult);

    await runApp({ workflow, notifier });

    expect(workflow).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(expect.stringContaining('📋 速维云自动签到结果'));
    expect(send).toHaveBeenCalledWith(expect.stringContaining('状态：✅ 全部成功'));
  });

  it('throws detailed account failure after sending notification', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue({
      success: false,
      accounts: [
        {
          accountId: 'MAIN',
          accountName: '主号',
          usernameMasked: 'm***@example.com',
          success: false,
          stages: [
            { name: 'login', success: true, message: '登录成功' },
            { name: 'sign', success: false, message: '签到失败' },
          ],
        },
      ],
    });

    await expect(runApp({ workflow, notifier })).rejects.toThrow(
      /部分账号执行失败[\s\S]*主号[\s\S]*sign：签到失败/,
    );
    expect(send).toHaveBeenCalledOnce();
  });

  it('includes unknown error when failed account has no failed stage', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue({
      success: false,
      accounts: [
        {
          accountId: 'MAIN',
          accountName: '主号',
          usernameMasked: 'm***@example.com',
          success: false,
          stages: [{ name: 'login', success: true, message: '登录成功' }],
        },
      ],
    });

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/主号[\s\S]*未知错误/);
  });

  it('sends failure notification when workflow throws', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/boom/);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('速维云自动签到失败'));
  });

  it('fails when notification fails after a successful workflow', async () => {
    const notifier: NotificationProvider = {
      name: 'telegram',
      send: vi.fn().mockRejectedValue(new Error('tg down')),
    };
    const workflow = vi.fn().mockResolvedValue(successResult);

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/tg down/);
  });

  it('redacts configured secrets before sending notifications', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue({
      success: false,
      accounts: [
        {
          accountId: 'MAIN',
          accountName: '主号',
          usernameMasked: 'm***@example.com',
          success: false,
          stages: [{ name: 'login', success: false, message: 'password=qwer123456' }],
        },
      ],
    });

    await expect(runApp({ workflow, notifier, secrets: ['qwer123456'] })).rejects.toThrow(
      /部分账号执行失败/,
    );

    expect(send).toHaveBeenCalledWith(expect.stringContaining('password=***'));
  });

  it('sends string failure notification when workflow throws a non-error value', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockRejectedValue('string boom');

    await expect(runApp({ workflow, notifier })).rejects.toBe('string boom');
    expect(send).toHaveBeenCalledWith(expect.stringContaining('string boom'));
  });

  it('logs redacted formatted workflow result before sending notification', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const info = vi.fn();
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue({
      success: false,
      accounts: [
        {
          accountId: 'MAIN',
          accountName: '主号',
          usernameMasked: 'm***@example.com',
          success: false,
          stages: [{ name: 'sign', success: false, message: 'password=qwer123456' }],
        },
      ],
    });

    await expect(
      runApp({ workflow, notifier, secrets: ['qwer123456'], logger: { info } }),
    ).rejects.toThrow(/部分账号执行失败/);

    expect(info).toHaveBeenCalledWith(expect.stringContaining('📋 速维云自动签到结果'));
    expect(info).toHaveBeenCalledWith(expect.stringContaining('password=***'));
    expect(info).not.toHaveBeenCalledWith(expect.stringContaining('qwer123456'));
    expect(send).toHaveBeenCalledWith(expect.stringContaining('password=***'));
  });

  it('logs redacted failure message when workflow throws before producing a result', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const info = vi.fn();
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockRejectedValue(new Error('password=qwer123456'));

    await expect(
      runApp({ workflow, notifier, secrets: ['qwer123456'], logger: { info } }),
    ).rejects.toThrow(/password=qwer123456/);

    expect(info).toHaveBeenCalledWith(expect.stringContaining('速维云自动签到失败'));
    expect(info).toHaveBeenCalledWith(expect.stringContaining('password=***'));
  });
});
