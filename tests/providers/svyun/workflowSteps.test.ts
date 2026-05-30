import { describe, expect, it, vi } from 'vitest';
import type { SvyunAccount } from '../../../src/core/account.js';
import { SvyunAccountTaskRunner } from '../../../src/providers/svyun/workflowSteps.js';

const account: SvyunAccount = {
  id: 'MAIN',
  displayName: '主号',
  username: 'main@example.com',
  password: 'main-password',
  usernameMasked: 'm***@example.com',
};

describe('SvyunAccountTaskRunner', () => {
  it('runs login, sign and draw stages', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: false, message: '未签' }),
      sign: vi.fn().mockResolvedValue({
        success: true,
        alreadySigned: false,
        message: '签到成功',
        checkinCount: 18,
        currentStreak: 1,
      }),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(2),
      getDrawTimes: vi.fn().mockResolvedValue({
        available: true,
        availableTimes: 1,
        usedTimes: 0,
        message: '剩余抽奖次数 1',
      }),
      draw: vi.fn().mockResolvedValue({
        success: true,
        skipped: false,
        isWin: true,
        prizeName: '优惠码',
        message: '恭喜您抽中：优惠码',
      }),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(true);
    expect(result.stages.map((stage) => stage.name)).toEqual(['login', 'sign', 'draw']);
    expect(client.draw).toHaveBeenCalledWith(2);
  });

  it('treats already signed and no draw times as successful skipped states', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: true, message: '今日已签到' }),
      sign: vi.fn(),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(2),
      getDrawTimes: vi.fn().mockResolvedValue({
        available: false,
        availableTimes: 0,
        usedTimes: 3,
        message: '无可用抽奖次数',
      }),
      draw: vi.fn(),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(true);
    expect(client.sign).not.toHaveBeenCalled();
    expect(client.draw).not.toHaveBeenCalled();
    expect(result.stages).toEqual([
      { name: 'login', success: true, message: '登录成功' },
      { name: 'sign', success: true, message: '今日已签到', skipped: true },
      { name: 'draw', success: true, message: '无可用抽奖次数', skipped: true },
    ]);
  });

  it('stops after login failure', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: false, message: '账号或密码错误' }),
      getSignInfo: vi.fn(),
      sign: vi.fn(),
      getPrimaryDrawActivityId: vi.fn(),
      getDrawTimes: vi.fn(),
      draw: vi.fn(),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(false);
    expect(client.getSignInfo).not.toHaveBeenCalled();
    expect(result.stages).toEqual([{ name: 'login', success: false, message: '账号或密码错误' }]);
  });
});
