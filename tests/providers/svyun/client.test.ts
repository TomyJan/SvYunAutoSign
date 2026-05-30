import { X509Certificate } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

interface GotExtendOptions {
  https?: {
    certificateAuthority?: string[];
  };
  hooks: {
    beforeRequest: Array<(request: { headers: Record<string, string> }) => void>;
  };
}

const gotMock = vi.hoisted(() => {
  let options: GotExtendOptions | undefined;
  const extend = vi.fn((nextOptions: GotExtendOptions) => {
    options = nextOptions;
    return { get: vi.fn(), post: vi.fn() };
  });

  return {
    extend,
    get options() {
      if (!options) throw new Error('got.extend was not called');
      return options;
    },
  };
});

vi.mock('got', () => ({
  default: { extend: gotMock.extend },
}));

import {
  createGotClient,
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

  it('creates a got client when no HTTP transport is injected', () => {
    new SvyunClient({
      baseUrl: 'https://www.svyun.com',
      loginUrl: 'https://www.svyun.com/login.htm',
      timeoutMs: 30_000,
    });

    const request = { headers: {} as Record<string, string> };
    gotMock.options.hooks.beforeRequest[0]!(request);

    expect(gotMock.extend).toHaveBeenCalled();
    expect(request.headers.authorization).toBeUndefined();
  });

  it('configures got client defaults and authorization hook', () => {
    createGotClient(
      {
        baseUrl: 'https://www.svyun.com/',
        loginUrl: 'https://www.svyun.com/login.htm',
        timeoutMs: 30_000,
      },
      () => 'jwt-token',
    );

    expect(gotMock.extend).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixUrl: 'https://www.svyun.com/console/v1',
        timeout: { request: 30_000 },
        retry: { limit: 0 },
        responseType: 'json',
      }),
    );
    const certificateAuthority = gotMock.options.https?.certificateAuthority;
    expect(certificateAuthority).toHaveLength(2);
    expect(new X509Certificate(certificateAuthority![0]!).subject).toContain(
      'CN=SSL.com TLS Issuing RSA CA R1',
    );
    expect(new X509Certificate(certificateAuthority![1]!).subject).toContain(
      'CN=SSL.com TLS RSA Root CA 2022',
    );

    const options = gotMock.options;
    const request = { headers: {} as Record<string, string> };
    options.hooks.beforeRequest[0]!(request);

    expect(request.headers.authorization).toBe('Bearer jwt-token');
  });

  it('does not set authorization header before login jwt exists', () => {
    createGotClient(
      {
        baseUrl: 'https://www.svyun.com',
        loginUrl: 'https://www.svyun.com/login.htm',
        timeoutMs: 30_000,
      },
      () => undefined,
    );

    const options = gotMock.options;
    const request = { headers: {} as Record<string, string> };
    options.hooks.beforeRequest[0]!(request);

    expect(request.headers.authorization).toBeUndefined();
  });
});
