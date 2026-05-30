import { createApp } from './app/createApp.js';
import { runApp } from './app/run.js';
import { redactSensitive } from './infra/redact.js';

try {
  await runApp(createApp());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redactSensitive(message, collectEnvSecrets(process.env)));
  process.exitCode = 1;
}

function collectEnvSecrets(env: NodeJS.ProcessEnv): string[] {
  return Object.entries(env)
    .filter(([key]) => /(PASSWORD|TOKEN|COOKIE|JWT|AUTHORIZATION)/i.test(key))
    .map(([, value]) => value)
    .filter((value): value is string => Boolean(value));
}
