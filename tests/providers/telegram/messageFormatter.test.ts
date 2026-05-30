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
  it('formats all account results with Chinese labels and readable layout', () => {
    expect(formatTelegramMessage(result)).toBe(
      [
        '📋 速维云自动签到结果',
        '',
        '状态：❌ 部分失败',
        '',
        '👤 主号（m***@example.com）',
        '├ ✅ 登录：登录成功',
        '├ ✅ 签到：签到成功',
        '└ ⏭️ 抽奖：无可用抽奖次数',
        '',
        '👤 小号（a***@example.com）',
        '└ ❌ 登录：账号或密码错误',
      ].join('\n'),
    );
  });

  it('keeps unknown stage names unchanged', () => {
    expect(
      formatTelegramMessage({
        success: true,
        accounts: [
          {
            accountId: 'MAIN',
            accountName: '主号',
            usernameMasked: 'm***@example.com',
            success: true,
            stages: [{ name: 'custom', success: true, message: '自定义阶段完成' }],
          },
        ],
      }),
    ).toContain('└ ✅ custom：自定义阶段完成');
  });
});
