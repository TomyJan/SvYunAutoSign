const SENSITIVE_ENV_KEY = /(PASSWORD|TOKEN|COOKIE|JWT|AUTHORIZATION)/i;
const GITHUB_SECRET_ENV_KEYS = ['ACTION_SECRETS_JSON'] as const;
const ALLOWED_SECRET_KEY =
  /^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|SVYUN_(DISPLAYNAME|USERNAME|PASSWORD)_[A-Za-z0-9_]+)$/;

export function collectEnvSecrets(env: NodeJS.ProcessEnv): string[] {
  return [...collectSensitiveEnvValues(env), ...collectGitHubSecretValues(env)];
}

function collectSensitiveEnvValues(env: NodeJS.ProcessEnv): string[] {
  return Object.entries(env)
    .filter(([key]) => SENSITIVE_ENV_KEY.test(key))
    .map(([, value]) => value)
    .filter((value): value is string => Boolean(value));
}

function collectGitHubSecretValues(env: NodeJS.ProcessEnv): string[] {
  return GITHUB_SECRET_ENV_KEYS.flatMap((key) => parseGitHubSecretValues(env[key]));
}

function parseGitHubSecretValues(raw: string | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

    return Object.entries(parsed as Record<string, unknown>)
      .filter(([key]) => ALLOWED_SECRET_KEY.test(key))
      .map(([, value]) => value)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}
