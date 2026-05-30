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

export interface SvyunHttpResponse {
  json<T>(): Promise<T>;
}

export interface SvyunHttpLike {
  get(path: string, options?: unknown): SvyunHttpResponse;
  post(path: string, options?: unknown): SvyunHttpResponse;
}

export interface SvyunClientOptions {
  baseUrl: string;
  loginUrl: string;
  timeoutMs: number;
  http?: SvyunHttpLike;
}

const AES_KEY = 'idcsmart.finance';
const AES_IV = '9311019310287172';
const SSL_DOT_COM_TLS_ISSUING_RSA_CA_R1 = `-----BEGIN CERTIFICATE-----
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
iTZinEPk
-----END CERTIFICATE-----`;
const SSL_DOT_COM_TLS_RSA_ROOT_CA_2022 = `-----BEGIN CERTIFICATE-----
MIIFiTCCA3GgAwIBAgIQb77arXO9CEDii02+1PdbkTANBgkqhkiG9w0BAQsFADBO
MQswCQYDVQQGEwJVUzEYMBYGA1UECgwPU1NMIENvcnBvcmF0aW9uMSUwIwYDVQQD
DBxTU0wuY29tIFRMUyBSU0EgUm9vdCBDQSAyMDIyMB4XDTIyMDgyNTE2MzQyMloX
DTQ2MDgxOTE2MzQyMVowTjELMAkGA1UEBhMCVVMxGDAWBgNVBAoMD1NTTCBDb3Jw
b3JhdGlvbjElMCMGA1UEAwwcU1NMLmNvbSBUTFMgUlNBIFJvb3QgQ0EgMjAyMjCC
AiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBANCkCXJPQIgSYT41I57u9nTP
L3tYPc48DRAokC+X94xI2KDYJbFMsBFMF3NQ0CJKY7uB0ylu1bUJPiYYf7ISf5OY
t6/wNr/y7hienDtSxUcZXXTzZGbVXcdotL8bHAajvI9AI7YexoS9UcQbOcGV0ins
S657Lb85/bRi3pZ7QcacoOAGcvvwB5cJOYF0r/c0WRFXCsJbwST0MXMwgsadugL3
PnxEX4MN8/HdIGkWCVDi1FW24IBydm5MR7d1VVm0U3TZlMZBrViKMWYPHqIbKUBO
L9975hYsLfy/7PO0+r4Y9ptJ1O4Fbtk085zx7AGL0SDGD6C1vBdOSHtRwvzpXGk3
R2azaPgVKPC506QVzFpPulJwoxJF3ca6TvvC0PeoUidtbnm1jPx7jMEWTO6Af77w
dr5BUxIzrlo4QqvXDz5BjXYHMtWrifZOZ9mxQnUjbvPNQrL8VfVThxc7wDNY8VLS
+YCk8OjwO4s4zKTGkH8PnP2L0aPP2oOnaclQNtVcBdIKQXTbYxE3waWglksejBYS
d66UNHsef8JmAOSqg+qKkK3ONkRN0VHpvB/zagX9wHQfJRlAUW7qglFA35u5CCoG
AtUjHBPW6dvbxrB6y3snm/vg1UYk7RBLY0ulBY+6uB0rpvqR4pJSvezrZ5dtmi2f
gTIFZzL7SAg/2SW4BCUvAgMBAAGjYzBhMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0j
BBgwFoAU+y437uOEeicuzRk1sTN8/9REQrkwHQYDVR0OBBYEFPsuN+7jhHonLs0Z
NbEzfP/UREK5MA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsFAAOCAgEAjYlt
hEUY8U+zoO9opMAdrDC8Z2awms22qyIZZtM7QbUQnRC6cm4pJCAcAZli05bg4vsM
QtfhWsSWTVTNj8pDU/0quOr4ZcoBwq1gaAafORpR2eCNJvkLTqVTJXojpBzOCBvf
R4iyrT7gJ4eLSYwfqUdYe5byiB0YrrPRpgqU+tvT5TgKa3kSM/tKWTcWQA673vWJ
DPFs0/dRa1419dvAJuoSc06pkZCmF8NsLzjUo3KUQyxi4U5cMj29TH0ZR6LDSeeW
P4+a0zvkEdiLA9z2tmBVGKaBUfPhqBVq6+AL8BQx1rmMRTqoENjwuSfr98t67wVy
lrXEj5ZzxOhWc5y8aVFjvO9nHEMaX3cZHxj4HCUp+UmZKbaSPaKDN7EgkaibMOlq
bLQjk2UEqxHzDh1TJElTHaE/nUiSEeJ9DU/1172iWD54nR4fK/4huxoTtrEoZP2w
AgDHbICivRZQIA9ygV/MlP+7mea6kMvq+cYMwq7FGc4zoWtcu358NFcXrfA/rs3q
r5nsLFR+jM4uElZI7xc7P0peYNLcdDa8pUNjyw9bowJWCZ4kLOGGgYz+qxcs+sji
Mho6/4UIyYOf8kpIEFR3N+2ivEC+5BB09+Rbu7nzifmPQdjH5FCQNYA+HLhNkNPU
98OwoX6EyneSMSy4kLGCenROmxMmtNVQZlR4rmA=
-----END CERTIFICATE-----`;
const SSL_DOT_COM_CA_CHAIN = [SSL_DOT_COM_TLS_ISSUING_RSA_CA_R1, SSL_DOT_COM_TLS_RSA_ROOT_CA_2022];

export class SvyunClient implements SvyunClientLike {
  private readonly http: SvyunHttpLike;
  private jwt: string | undefined;

  constructor(options: SvyunClientOptions) {
    this.http = options.http ?? createGotClient(options, () => this.jwt);
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

export function createGotClient(
  options: SvyunClientOptions,
  getJwt: () => string | undefined,
): Got {
  return got.extend({
    prefixUrl: `${options.baseUrl.replace(/\/$/, '')}/console/v1`,
    cookieJar: new CookieJar(),
    timeout: { request: options.timeoutMs },
    retry: { limit: 0 },
    responseType: 'json',
    https: {
      certificateAuthority: SSL_DOT_COM_CA_CHAIN,
    },
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
          const jwt = getJwt();
          if (jwt) {
            request.headers.authorization = `Bearer ${jwt}`;
          }
        },
      ],
    },
  });
}

function createDeviceId(): string {
  return `node-${process.platform}-${process.arch}`;
}
