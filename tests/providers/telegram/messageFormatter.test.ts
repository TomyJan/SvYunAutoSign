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

  it('formats sign details and highlights non-empty draw prizes', () => {
    expect(
      formatTelegramMessage({
        success: true,
        accounts: [
          {
            accountId: 'MAIN',
            accountName: '主号',
            usernameMasked: 'm***@example.com',
            success: true,
            stages: [
              { name: 'login', success: true, message: '登录成功' },
              {
                name: 'sign',
                success: true,
                message: '签到成功',
                details: { currentStreak: 2, drawBonusTimes: 1 },
              },
              {
                name: 'draw',
                success: true,
                message: '共抽奖 3 次：谢谢参与 ×2，10元无门槛优惠码 ×1',
                details: {
                  totalDraws: 3,
                  prizes: [
                    { name: '谢谢参与', count: 2, isWin: false },
                    { name: '10元无门槛优惠码', count: 1, isWin: true },
                  ],
                  hasPrizeWin: true,
                },
              },
            ],
          },
        ],
      }),
    ).toBe(
      [
        '📋 速维云自动签到结果',
        '',
        '状态：✅ 全部成功',
        '',
        '👤 主号（m***@example.com）',
        '├ ✅ 登录：登录成功',
        '├ ✅ 签到：签到成功，连签 2 天，抽奖次数 +1',
        '└ 🎉 抽奖：共抽奖 3 次：谢谢参与 ×2，⭐ 10元无门槛优惠码 ×1 ⭐',
      ].join('\n'),
    );
  });

  it('shows missed days when sign details report a broken streak', () => {
    expect(
      formatTelegramMessage({
        success: true,
        accounts: [
          {
            accountId: 'MAIN',
            accountName: '主号',
            usernameMasked: 'm***@example.com',
            success: true,
            stages: [
              {
                name: 'sign',
                success: true,
                message: '今日已签到',
                skipped: true,
                details: { currentStreak: 1, missedDays: 3 },
              },
            ],
          },
        ],
      }),
    ).toContain('└ ⏭️ 签到：今日已签到，断签 3 天');
  });

  it('falls back to original draw message for incomplete draw details', () => {
    expect(
      formatTelegramMessage({
        success: true,
        accounts: [
          {
            accountId: 'MAIN',
            accountName: '主号',
            usernameMasked: 'm***@example.com',
            success: true,
            stages: [
              {
                name: 'draw',
                success: true,
                message: '抽奖完成',
                details: { totalDraws: 1, prizes: [] },
              },
              {
                name: 'draw',
                success: true,
                message: '原始抽奖消息',
                details: { totalDraws: 1, prizes: [null, { name: '坏数据' }] },
              },
              {
                name: 'draw',
                success: true,
                message: '没有详情',
                details: { prizes: [{ name: '谢谢参与', count: 1, isWin: false }] },
              },
            ],
          },
        ],
      }),
    ).toContain(
      ['├ ✅ 抽奖：抽奖完成', '├ ✅ 抽奖：原始抽奖消息', '└ ✅ 抽奖：没有详情'].join('\n'),
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
