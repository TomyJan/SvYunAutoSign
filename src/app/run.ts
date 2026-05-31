import type { NotificationProvider } from '../core/notification.js';
import type { WorkflowResult } from '../core/task.js';
import { redactSensitive } from '../infra/redact.js';
import { formatTelegramMessage } from '../providers/telegram/messageFormatter.js';

export interface AppLogger {
  info(message: string): void;
}

export interface RunAppDependencies {
  workflow(): Promise<WorkflowResult>;
  notifier: NotificationProvider;
  secrets?: readonly string[];
  logger?: AppLogger;
}

export async function runApp(dependencies: RunAppDependencies): Promise<void> {
  try {
    const result = await dependencies.workflow();
    const message = redactSensitive(formatTelegramMessage(result), dependencies.secrets);
    dependencies.logger?.info(message);
    await dependencies.notifier.send(message);

    if (!result.success) {
      throw new Error(formatWorkflowFailureMessage(result));
    }
  } catch (error) {
    if (isWorkflowFailureBeforeNotification(error)) {
      const message = redactSensitive(formatFailureMessage(error), dependencies.secrets);
      dependencies.logger?.info(message);
      await dependencies.notifier.send(message);
    }
    throw error;
  }
}

function isWorkflowFailureBeforeNotification(error: unknown): boolean {
  return !(error instanceof Error && error.message.startsWith('部分账号执行失败'));
}

function formatWorkflowFailureMessage(result: WorkflowResult): string {
  const failures = result.accounts
    .filter((account) => !account.success)
    .map((account) => {
      const failedStages = account.stages
        .filter((stage) => !stage.success)
        .map((stage) => `${stage.name}：${stage.message}`)
        .join('；');
      return `- ${account.accountName}（${account.usernameMasked}）：${failedStages || '未知错误'}`;
    });

  return ['部分账号执行失败', ...failures].join('\n');
}

function formatFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return ['速维云自动签到失败', '', `原因：${message}`].join('\n');
}
