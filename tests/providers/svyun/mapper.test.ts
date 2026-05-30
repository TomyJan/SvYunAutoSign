import { describe, expect, it } from 'vitest';
import {
  mapDrawResult,
  mapDrawTimes,
  mapLoginResult,
  mapSignInfo,
  mapSignResult,
} from '../../../src/providers/svyun/mapper.js';

describe('svyun mapper', () => {
  it('maps login response with jwt', () => {
    expect(mapLoginResult({ status: 200, msg: '登录成功', data: { jwt: 'token' } })).toEqual({
      success: true,
      message: '登录成功',
      jwt: 'token',
    });
  });

  it('maps failed login response', () => {
    expect(mapLoginResult({ status: 400, msg: '账号或密码错误' })).toEqual({
      success: false,
      message: '账号或密码错误',
    });
  });

  it('maps sign info as already signed or not signed', () => {
    expect(
      mapSignInfo({
        status: 200,
        msg: '成功',
        data: { info: { today_checked: true, total_checkins: 18, current_streak: 1 } },
      }),
    ).toEqual({
      alreadySigned: true,
      totalCheckins: 18,
      currentStreak: 1,
      message: '今日已签到',
    });
  });

  it('maps checkin response', () => {
    expect(
      mapSignResult({
        status: 200,
        msg: '签到成功',
        data: { checkin_count: 18, current_streak: 1 },
      }),
    ).toEqual({
      success: true,
      alreadySigned: false,
      message: '签到成功',
      checkinCount: 18,
      currentStreak: 1,
    });
  });

  it('maps draw times info', () => {
    expect(
      mapDrawTimes({
        status: 200,
        msg: '成功',
        data: { available_times: 2, used_times: 3 },
      }),
    ).toEqual({ available: true, availableTimes: 2, usedTimes: 3, message: '剩余抽奖次数 2' });

    expect(
      mapDrawTimes({
        status: 200,
        msg: '成功',
        data: { available_times: 0, used_times: 3 },
      }),
    ).toEqual({ available: false, availableTimes: 0, usedTimes: 3, message: '无可用抽奖次数' });
  });

  it('maps draw result', () => {
    expect(
      mapDrawResult({
        status: 200,
        msg: '成功',
        data: { is_win: true, prize: { name: '10元无门槛优惠码' } },
      }),
    ).toEqual({
      success: true,
      skipped: false,
      isWin: true,
      prizeName: '10元无门槛优惠码',
      message: '恭喜您抽中：10元无门槛优惠码',
    });
  });

  it('maps fallback messages and non-winning draw responses', () => {
    expect(mapLoginResult({ status: 200, data: {} })).toEqual({
      success: false,
      message: '登录失败',
    });
    expect(mapSignInfo({ status: 200, data: { info: { today_checked: false } } })).toEqual({
      alreadySigned: false,
      message: '今日未签到',
    });
    expect(mapSignResult({ status: 409, msg: '今日已签到' })).toEqual({
      success: true,
      alreadySigned: true,
      message: '今日已签到',
    });
    expect(mapDrawResult({ status: 200, msg: '成功', data: { is_win: false } })).toEqual({
      success: true,
      skipped: false,
      isWin: false,
      message: '成功',
    });
    expect(mapDrawResult({ status: 400 })).toEqual({
      success: false,
      skipped: false,
      isWin: false,
      message: '抽奖失败',
    });
    expect(
      mapDrawResult({ status: 200, data: { is_win: false, prize: { name: '谢谢参与' } } }),
    ).toEqual({
      success: true,
      skipped: false,
      isWin: false,
      prizeName: '谢谢参与',
      message: '谢谢参与',
    });
    expect(mapDrawTimes({ status: 200 })).toEqual({
      available: false,
      availableTimes: 0,
      usedTimes: 0,
      message: '无可用抽奖次数',
    });
    expect(mapLoginResult({ status: 200, data: { jwt: 'token' } })).toEqual({
      success: true,
      message: '登录成功',
      jwt: 'token',
    });
    expect(mapSignResult({ status: 200 })).toEqual({
      success: true,
      alreadySigned: false,
      message: '签到成功',
    });
    expect(mapSignResult({ status: 500 })).toEqual({
      success: false,
      alreadySigned: false,
      message: '签到失败',
    });
    expect(mapDrawResult({ status: 200, data: { is_win: false } })).toEqual({
      success: true,
      skipped: false,
      isWin: false,
      message: '抽奖完成',
    });
  });
});
