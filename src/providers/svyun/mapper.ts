import type {
  SvyunApiResponse,
  SvyunDrawResult,
  SvyunDrawTimes,
  SvyunLoginData,
  SvyunLoginResult,
  SvyunSignInfo,
  SvyunSignResult,
} from './apiTypes.js';

export function mapLoginResult(response: SvyunApiResponse<SvyunLoginData>): SvyunLoginResult {
  const success = response.status === 200 && Boolean(response.data?.jwt);
  return {
    success,
    message: response.msg || (success ? '登录成功' : '登录失败'),
    ...(response.data?.jwt ? { jwt: response.data.jwt } : {}),
  };
}

export function mapSignInfo(response: SvyunApiResponse): SvyunSignInfo {
  const data = response.data as
    | { info?: { today_checked?: boolean; total_checkins?: number; current_streak?: number } }
    | undefined;
  const info = data?.info;
  const alreadySigned = info?.today_checked === true;

  return {
    alreadySigned,
    ...(typeof info?.total_checkins === 'number' ? { totalCheckins: info.total_checkins } : {}),
    ...(typeof info?.current_streak === 'number' ? { currentStreak: info.current_streak } : {}),
    message: alreadySigned ? '今日已签到' : '今日未签到',
  };
}

export function mapSignResult(response: SvyunApiResponse): SvyunSignResult {
  const data = response.data as { checkin_count?: number; current_streak?: number } | undefined;
  const alreadySigned = /已签/.test(response.msg ?? '');
  const success = response.status === 200 || alreadySigned;

  return {
    success,
    alreadySigned,
    message: response.msg || (success ? '签到成功' : '签到失败'),
    ...(typeof data?.checkin_count === 'number' ? { checkinCount: data.checkin_count } : {}),
    ...(typeof data?.current_streak === 'number' ? { currentStreak: data.current_streak } : {}),
  };
}

export function mapDrawTimes(response: SvyunApiResponse): SvyunDrawTimes {
  const data = response.data as
    | { available_times?: number | string; used_times?: number | string }
    | undefined;
  const availableTimes = Number(data?.available_times ?? 0);
  const usedTimes = Number(data?.used_times ?? 0);

  return {
    available: availableTimes > 0,
    availableTimes,
    usedTimes,
    message: availableTimes > 0 ? `剩余抽奖次数 ${availableTimes}` : '无可用抽奖次数',
  };
}

export function mapDrawResult(response: SvyunApiResponse): SvyunDrawResult {
  const data = response.data as { is_win?: boolean; prize?: { name?: string } } | undefined;
  const prizeName = data?.prize?.name;
  const isWin = data?.is_win === true;
  const success = response.status === 200;

  return {
    success,
    skipped: false,
    isWin,
    ...(prizeName ? { prizeName } : {}),
    message: success
      ? isWin && prizeName
        ? `恭喜您抽中：${prizeName}`
        : prizeName || response.msg || '抽奖完成'
      : response.msg || '抽奖失败',
  };
}
