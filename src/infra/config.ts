import { z } from 'zod';
import { maskAccount, type SvyunAccount } from '../core/account.js';

export interface AppConfig {
  svyun: {
    accounts: SvyunAccount[];
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  defaults: {
    baseUrl: string;
    loginUrl: string;
    requestTimeoutMs: number;
    signEnabled: boolean;
    drawEnabled: boolean;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  };
}

const requiredEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
});

const USERNAME_PREFIX = 'SVYUN_USERNAME_';
const PASSWORD_PREFIX = 'SVYUN_PASSWORD_';
const DISPLAY_NAME_PREFIX = 'SVYUN_DISPLAYNAME_';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = requiredEnvSchema.safeParse(env);
  if (!required.success) {
    const missing = required.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment variables: ${missing}`);
  }

  const accounts = loadAccounts(env);

  return {
    svyun: { accounts },
    telegram: {
      botToken: required.data.TELEGRAM_BOT_TOKEN,
      chatId: required.data.TELEGRAM_CHAT_ID,
    },
    defaults: {
      baseUrl: 'https://www.svyun.com',
      loginUrl: 'https://www.svyun.com/login.htm',
      requestTimeoutMs: 30_000,
      signEnabled: true,
      drawEnabled: true,
      notifyOnSuccess: true,
      notifyOnFailure: true,
    },
  };
}

function loadAccounts(env: NodeJS.ProcessEnv): SvyunAccount[] {
  const ids = Object.keys(env)
    .filter((key) => key.startsWith(USERNAME_PREFIX))
    .map((key) => key.slice(USERNAME_PREFIX.length))
    .filter(Boolean)
    .sort();

  if (ids.length === 0) {
    throw new Error('At least one SVYUN_USERNAME_<ID> environment variable is required');
  }

  return ids.map((id) => {
    const username = env[`${USERNAME_PREFIX}${id}`];
    const password = env[`${PASSWORD_PREFIX}${id}`];
    const displayName = env[`${DISPLAY_NAME_PREFIX}${id}`];

    if (!username) {
      throw new Error(`${USERNAME_PREFIX}${id} is required`);
    }

    if (!password) {
      throw new Error(`${PASSWORD_PREFIX}${id} is required`);
    }

    return {
      id,
      displayName: displayName || id,
      username,
      password,
      usernameMasked: maskAccount(username),
    };
  });
}
