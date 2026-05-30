import { createApp } from './app/createApp.js';
import { runApp } from './app/run.js';
import { collectEnvSecrets } from './infra/envSecrets.js';
import { redactSensitive } from './infra/redact.js';

try {
  await runApp(createApp());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redactSensitive(message, collectEnvSecrets(process.env)));
  process.exitCode = 1;
}
