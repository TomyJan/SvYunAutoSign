import type { NotificationProvider } from '../core/notification.js';
import type { WorkflowResult } from '../core/task.js';
import { redactSensitive } from '../infra/redact.js';
import { formatTelegramMessage } from '../providers/telegram/messageFormatter.js';

export interface RunAppDependencies {
  workflow(): Promise<WorkflowResult>;
  notifier: NotificationProvider;
  secrets?: readonly string[];
}

export async function runApp(dependencies: RunAppDependencies): Promise<void> {
  try {
    const result = await dependencies.workflow();
    await dependencies.notifier.send(
      redactSensitive(formatTelegramMessage(result), dependencies.secrets),
    );

    if (!result.success) {
      throw new Error(formatWorkflowFailureMessage(result));
    }
  } catch (error) {
    if (isWorkflowFailureBeforeNotification(error)) {
      await dependencies.notifier.send(
        redactSensitive(formatFailureMessage(error), dependencies.secrets),
      );
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
  return ['SvYun 自动签到失败', '', `原因：${message}`].join('\n');
}
