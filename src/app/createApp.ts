import { loadConfig } from '../infra/config.js';
import { runAccountsWorkflow } from '../core/workflow.js';
import { SvyunClient } from '../providers/svyun/client.js';
import { SvyunAccountTaskRunner } from '../providers/svyun/workflowSteps.js';
import { TelegramNotifier } from '../providers/telegram/notifier.js';
import type { NotificationProvider } from '../core/notification.js';
import type { WorkflowResult } from '../core/task.js';

export interface AppDependencies {
  workflow(): Promise<WorkflowResult>;
  notifier: NotificationProvider;
  secrets: readonly string[];
}

export function createApp(env: NodeJS.ProcessEnv = process.env): AppDependencies {
  const config = loadConfig(env);
  const runner = new SvyunAccountTaskRunner(
    () =>
      new SvyunClient({
        baseUrl: config.defaults.baseUrl,
        loginUrl: config.defaults.loginUrl,
        timeoutMs: config.defaults.requestTimeoutMs,
      }),
  );

  return {
    workflow: () => runAccountsWorkflow(config.svyun.accounts, runner),
    notifier: new TelegramNotifier(config.telegram),
    secrets: [
      config.telegram.botToken,
      config.telegram.chatId,
      ...config.svyun.accounts.flatMap((account) => [account.username, account.password]),
    ],
  };
}
