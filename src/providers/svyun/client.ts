import { createCipheriv } from 'node:crypto';
import got, { type Got } from 'got';
import { CookieJar } from 'tough-cookie';
import type {
  SvyunApiResponse,
  SvyunClientLike,
  SvyunDrawResult,
  SvyunDrawTimes,
  SvyunLoginData,
  SvyunLoginResult,
  SvyunSignInfo,
  SvyunSignResult,
} from './apiTypes.js';
import {
  mapDrawResult,
  mapDrawTimes,
  mapLoginResult,
  mapSignInfo,
  mapSignResult,
} from './mapper.js';

export interface SvyunClientOptions {
  baseUrl: string;
  loginUrl: string;
  timeoutMs: number;
}

const AES_KEY = 'idcsmart.finance';
const AES_IV = '9311019310287172';

export class SvyunClient implements SvyunClientLike {
  private readonly http: Got;
  private jwt: string | undefined;

  constructor(options: SvyunClientOptions) {
    this.http = got.extend({
      prefixUrl: `${options.baseUrl.replace(/\/$/, '')}/console/v1`,
      cookieJar: new CookieJar(),
      timeout: { request: options.timeoutMs },
      retry: { limit: 0 },
      responseType: 'json',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'content-type': 'application/json',
        language: 'zh-cn',
        origin: options.baseUrl,
        referer: options.loginUrl,
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      },
      hooks: {
        beforeRequest: [
          (request) => {
            if (this.jwt) {
              request.headers.authorization = `Bearer ${this.jwt}`;
            }
          },
        ],
      },
    });
  }

  async login(username: string, password: string): Promise<SvyunLoginResult> {
    const response = await this.http
      .post('login', {
        json: {
          type: 'password',
          account: username,
          phone_code: '86',
          code: '',
          password: encryptPassword(password),
          remember_password: '0',
          captcha: '',
          token: '',
          security_verify_method: '',
          security_verify_value: '',
          certify_id: '',
          security_verify_token: '',
        },
      })
      .json<SvyunApiResponse<SvyunLoginData>>();

    const result = mapLoginResult(response);
    this.jwt = result.jwt;
    return result;
  }

  async getSignInfo(): Promise<SvyunSignInfo> {
    const response = await this.http.get('daily_checkin/info').json<SvyunApiResponse>();
    return mapSignInfo(response);
  }

  async sign(): Promise<SvyunSignResult> {
    const response = await this.http
      .post('daily_checkin/checkin', { json: {} })
      .json<SvyunApiResponse>();
    return mapSignResult(response);
  }

  async getPrimaryDrawActivityId(): Promise<number | undefined> {
    const response = await this.http
      .get('lucky_draw/activity/list')
      .json<
        SvyunApiResponse<{ list?: Array<{ id?: number; user_info?: { can_join?: boolean } }> }>
      >();
    return response.data?.list?.find((item) => item.user_info?.can_join !== false)?.id;
  }

  async getDrawTimes(activityId: number): Promise<SvyunDrawTimes> {
    const response = await this.http
      .get('lucky_draw/getDrawTimesInfo', { searchParams: { activity_id: activityId } })
      .json<SvyunApiResponse>();
    return mapDrawTimes(response);
  }

  async draw(activityId: number): Promise<SvyunDrawResult> {
    const response = await this.http
      .post('lucky_draw/draw', {
        json: {
          activity_id: activityId,
          device_id: createDeviceId(),
        },
      })
      .json<SvyunApiResponse>();
    return mapDrawResult(response);
  }
}

export function encryptPassword(password: string): string {
  const cipher = createCipheriv('aes-128-cbc', Buffer.from(AES_KEY), Buffer.from(AES_IV));
  return Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]).toString('base64');
}

function createDeviceId(): string {
  return `node-${process.platform}-${process.arch}`;
}
