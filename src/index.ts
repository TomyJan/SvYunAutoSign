import { createApp } from './app/createApp.js';
import { runApp } from './app/run.js';

try {
  await runApp(createApp());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
