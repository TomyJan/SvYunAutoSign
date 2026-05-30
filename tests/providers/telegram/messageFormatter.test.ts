import { describe, expect, it } from 'vitest';
import type { WorkflowResult } from '../../../src/core/task.js';
import { formatTelegramMessage } from '../../../src/providers/telegram/messageFormatter.js';

const result: WorkflowResult = {
  success: false,
  accounts: [
    {
      accountId: 'MAIN',
      accountName: '主号',
      usernameMasked: 'm***@example.com',
      success: true,
      stages: [
        { name: 'login', success: true, message: '登录成功' },
        { name: 'sign', success: true, message: '签到成功' },
        { name: 'draw', success: true, message: '无可用抽奖次数', skipped: true },
      ],
    },
    {
      accountId: 'ALT',
      accountName: '小号',
      usernameMasked: 'a***@example.com',
      success: false,
      stages: [{ name: 'login', success: false, message: '账号或密码错误' }],
    },
  ],
};

describe('formatTelegramMessage', () => {
  it('formats all account results as plain text', () => {
    const message = formatTelegramMessage(result);

    expect(message).toContain('速维云自动签到结果：部分失败');
    expect(message).toContain('主号（m***@example.com）');
    expect(message).toContain('✅ login：登录成功');
    expect(message).toContain('⏭️ draw：无可用抽奖次数');
    expect(message).toContain('小号（a***@example.com）');
    expect(message).toContain('❌ login：账号或密码错误');
  });
});
