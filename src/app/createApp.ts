import { loadConfig } from '../infra/config.js';
import { redactSensitive } from '../infra/redact.js';
import { runAccountsWorkflow } from '../core/workflow.js';
import { SvyunClient } from '../providers/svyun/client.js';
import { SvyunAccountTaskRunner } from '../providers/svyun/workflowSteps.js';
import { TelegramNotifier } from '../providers/telegram/notifier.js';
import type { NotificationProvider } from '../core/notification.js';
import type { WorkflowResult } from '../core/task.js';
import type { AppLogger } from './run.js';

const CONNECTIVITY_CHECK_RETRIES = 3;
const CONNECTIVITY_CHECK_RETRY_DELAY_MS = 3_000;

export interface AppDependencies {
  precheck(): Promise<void>;
  workflow(): Promise<WorkflowResult>;
  notifier: NotificationProvider;
  secrets: readonly string[];
  logger: AppLogger;
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
  const secrets = [
    config.telegram.botToken,
    config.telegram.chatId,
    ...config.svyun.accounts.flatMap((account) => [account.username, account.password]),
  ];
  const logger: AppLogger = {
    info(message: string): void {
      console.log(redactSensitive(message, secrets));
    },
  };

  const precheckClient = new SvyunClient({
    baseUrl: config.defaults.baseUrl,
    loginUrl: config.defaults.loginUrl,
    timeoutMs: config.defaults.requestTimeoutMs,
  });

  return {
    precheck: async () => {
      for (let attempt = 1; attempt <= CONNECTIVITY_CHECK_RETRIES; attempt += 1) {
        logger?.info(`检查网站连接（${attempt}/${CONNECTIVITY_CHECK_RETRIES}）`);
        const connected = await precheckClient.checkConnectivity();
        if (connected) {
          logger?.info('网站连接正常');
          return;
        }
        if (attempt < CONNECTIVITY_CHECK_RETRIES) {
          await delay(CONNECTIVITY_CHECK_RETRY_DELAY_MS);
        }
      }
      throw new Error(
        `无法连接到 ${config.defaults.baseUrl}（已重试 ${CONNECTIVITY_CHECK_RETRIES} 次）`,
      );
    },
    workflow: () => runAccountsWorkflow(config.svyun.accounts, runner, logger),
    notifier: new TelegramNotifier(config.telegram),
    secrets,
    logger,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
