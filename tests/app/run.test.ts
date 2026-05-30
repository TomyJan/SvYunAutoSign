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
    expect(send).toHaveBeenCalledWith(expect.stringContaining('SvYun 自动签到结果：全部成功'));
  });

  it('throws when workflow has account failures after sending notification', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockResolvedValue({ ...successResult, success: false });

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/部分账号执行失败/);
    expect(send).toHaveBeenCalledOnce();
  });

  it('sends failure notification when workflow throws', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/boom/);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('SvYun 自动签到失败'));
  });

  it('fails when notification fails after a successful workflow', async () => {
    const notifier: NotificationProvider = {
      name: 'telegram',
      send: vi.fn().mockRejectedValue(new Error('tg down')),
    };
    const workflow = vi.fn().mockResolvedValue(successResult);

    await expect(runApp({ workflow, notifier })).rejects.toThrow(/tg down/);
  });

  it('sends string failure notification when workflow throws a non-error value', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier: NotificationProvider = { name: 'telegram', send };
    const workflow = vi.fn().mockRejectedValue('string boom');

    await expect(runApp({ workflow, notifier })).rejects.toBe('string boom');
    expect(send).toHaveBeenCalledWith(expect.stringContaining('string boom'));
  });
});
