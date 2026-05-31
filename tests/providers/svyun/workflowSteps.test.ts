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
      {
        name: 'sign',
        success: true,
        message: '今日已签到',
        skipped: true,
        details: { alreadySigned: true, message: '今日已签到' },
      },
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

  it('stops when sign fails', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: false, message: '未签' }),
      sign: vi
        .fn()
        .mockResolvedValue({ success: false, alreadySigned: false, message: '签到失败' }),
      getPrimaryDrawActivityId: vi.fn(),
      getDrawTimes: vi.fn(),
      draw: vi.fn(),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(false);
    expect(client.getPrimaryDrawActivityId).not.toHaveBeenCalled();
    expect(result.stages).toEqual([
      { name: 'login', success: true, message: '登录成功' },
      {
        name: 'sign',
        success: false,
        message: '签到失败',
        skipped: false,
        details: { success: false, alreadySigned: false, message: '签到失败' },
      },
    ]);
  });

  it('draws until all available draw times are consumed and records prizes', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: true, message: '今日已签到' }),
      sign: vi.fn(),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(2),
      getDrawTimes: vi.fn().mockResolvedValue({
        available: true,
        availableTimes: 3,
        usedTimes: 0,
        message: '剩余抽奖次数 3',
      }),
      draw: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          skipped: false,
          isWin: false,
          prizeName: '谢谢参与',
          message: '谢谢参与',
        })
        .mockResolvedValueOnce({
          success: true,
          skipped: false,
          isWin: true,
          prizeName: '10元无门槛优惠码',
          message: '恭喜您抽中：10元无门槛优惠码',
        })
        .mockResolvedValueOnce({
          success: true,
          skipped: false,
          isWin: false,
          prizeName: '谢谢参与',
          message: '谢谢参与',
        }),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(true);
    expect(client.draw).toHaveBeenCalledTimes(3);
    expect(result.stages.at(-1)).toEqual({
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
    });
  });

  it('stops drawing and records partial summary when a draw fails', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: true, message: '今日已签到' }),
      sign: vi.fn(),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(2),
      getDrawTimes: vi.fn().mockResolvedValue({
        available: true,
        availableTimes: 3,
        usedTimes: 0,
        message: '剩余抽奖次数 3',
      }),
      draw: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          skipped: false,
          isWin: false,
          prizeName: '谢谢参与',
          message: '谢谢参与',
        })
        .mockResolvedValueOnce({
          success: false,
          skipped: false,
          isWin: false,
          message: '抽奖失败',
        }),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(false);
    expect(client.draw).toHaveBeenCalledTimes(2);
    expect(result.stages.at(-1)).toEqual({
      name: 'draw',
      success: false,
      message: '抽奖失败',
      skipped: false,
      details: {
        totalDraws: 2,
        prizes: [
          { name: '谢谢参与', count: 1, isWin: false },
          { name: '抽奖失败', count: 1, isWin: false },
        ],
        hasPrizeWin: false,
      },
    });
  });

  it('uses an unknown prize label when draw result has no prize name or message', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: true, message: '今日已签到' }),
      sign: vi.fn(),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(2),
      getDrawTimes: vi.fn().mockResolvedValue({
        available: true,
        availableTimes: 1,
        usedTimes: 0,
        message: '剩余抽奖次数 1',
      }),
      draw: vi.fn().mockResolvedValue({ success: true, skipped: false, isWin: false }),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.stages.at(-1)).toMatchObject({
      name: 'draw',
      success: true,
      message: '共抽奖 1 次：未知奖品 ×1',
      details: {
        prizes: [{ name: '未知奖品', count: 1, isWin: false }],
      },
    });
  });

  it('skips draw when no activity is available', async () => {
    const client = {
      login: vi.fn().mockResolvedValue({ success: true, message: '登录成功', jwt: 'token' }),
      getSignInfo: vi.fn().mockResolvedValue({ alreadySigned: false, message: '未签' }),
      sign: vi.fn().mockResolvedValue({ success: true, alreadySigned: false, message: '签到成功' }),
      getPrimaryDrawActivityId: vi.fn().mockResolvedValue(undefined),
      getDrawTimes: vi.fn(),
      draw: vi.fn(),
    };

    const result = await new SvyunAccountTaskRunner(() => client).run(account);

    expect(result.success).toBe(true);
    expect(client.getDrawTimes).not.toHaveBeenCalled();
    expect(result.stages.at(-1)).toEqual({
      name: 'draw',
      success: true,
      message: '没有可参与的抽奖活动',
      skipped: true,
    });
  });
});
