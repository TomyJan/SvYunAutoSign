import { describe, expect, it } from 'vitest';
import {
  encryptPassword,
  SvyunClient,
  type SvyunHttpLike,
} from '../../../src/providers/svyun/client.js';

describe('SvyunClient', () => {
  it('encrypts password the same way as SvYun frontend', () => {
    expect(encryptPassword('qwer123456')).toBe('N1YMQY9Oe8isyuMGiEENDQ==');
  });

  it('maps all HTTP methods through injected transport', async () => {
    const calls: Array<{ method: string; path: string; options?: unknown }> = [];
    const http: SvyunHttpLike = {
      post(path: string, options?: unknown) {
        calls.push({ method: 'POST', path, options });
        return {
          async json<T>() {
            await Promise.resolve();
            if (path === 'login')
              return { status: 200, msg: '登录成功', data: { jwt: 'jwt-token' } } as T;
            if (path === 'daily_checkin/checkin') {
              return { status: 200, msg: '签到成功', data: { checkin_count: 1 } } as T;
            }
            return {
              status: 200,
              msg: '成功',
              data: { is_win: false, prize: { name: '谢谢参与' } },
            } as T;
          },
        };
      },
      get(path: string) {
        calls.push({ method: 'GET', path });
        return {
          async json<T>() {
            await Promise.resolve();
            if (path === 'daily_checkin/info') {
              return { status: 200, msg: '成功', data: { info: { today_checked: false } } } as T;
            }
            if (path === 'lucky_draw/activity/list') {
              return {
                status: 200,
                data: { list: [{ id: 2, user_info: { can_join: true } }] },
              } as T;
            }
            return { status: 200, data: { available_times: 1, used_times: 0 } } as T;
          },
        };
      },
    };

    const client = new SvyunClient({
      baseUrl: 'https://www.svyun.com',
      loginUrl: 'https://www.svyun.com/login.htm',
      timeoutMs: 30_000,
      http,
    });

    await expect(client.login('user@example.com', 'qwer123456')).resolves.toMatchObject({
      success: true,
    });
    await expect(client.getSignInfo()).resolves.toMatchObject({ alreadySigned: false });
    await expect(client.sign()).resolves.toMatchObject({ success: true });
    await expect(client.getPrimaryDrawActivityId()).resolves.toBe(2);
    await expect(client.getDrawTimes(2)).resolves.toMatchObject({ available: true });
    await expect(client.draw(2)).resolves.toMatchObject({ success: true, prizeName: '谢谢参与' });

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST login',
      'GET daily_checkin/info',
      'POST daily_checkin/checkin',
      'GET lucky_draw/activity/list',
      'GET lucky_draw/getDrawTimesInfo',
      'POST lucky_draw/draw',
    ]);
  });

  it('returns undefined when no draw activity can be joined', async () => {
    const client = new SvyunClient({
      baseUrl: 'https://www.svyun.com',
      loginUrl: 'https://www.svyun.com/login.htm',
      timeoutMs: 30_000,
      http: {
        get: () => ({
          async json<T>() {
            await Promise.resolve();
            return {
              status: 200,
              data: { list: [{ id: 2, user_info: { can_join: false } }] },
            } as T;
          },
        }),
        post: () => ({
          async json<T>() {
            await Promise.resolve();
            return { status: 200 } as T;
          },
        }),
      },
    });

    await expect(client.getPrimaryDrawActivityId()).resolves.toBeUndefined();
  });
});
