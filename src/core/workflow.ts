import type { SvyunAccount } from './account.js';
import type { AccountRunResult, WorkflowResult } from './task.js';

export interface AccountTaskRunner {
  run(account: SvyunAccount): Promise<AccountRunResult>;
}

export interface WorkflowLogger {
  info(message: string): void;
}

export async function runAccountsWorkflow(
  accounts: readonly SvyunAccount[],
  runner: AccountTaskRunner,
  logger?: WorkflowLogger,
): Promise<WorkflowResult> {
  const results: AccountRunResult[] = [];

  logger?.info(`开始执行速维云自动签到，共 ${accounts.length} 个账号`);

  for (const [index, account] of accounts.entries()) {
    const accountLabel = `${account.displayName}（${account.usernameMasked}）`;
    logger?.info(`开始执行账号 ${index + 1}/${accounts.length}：${accountLabel}`);

    try {
      const result = await runner.run(account);
      results.push(result);
      if (result.success) {
        logger?.info(`账号执行成功：${accountLabel}`);
      } else {
        logger?.info(`账号执行失败：${accountLabel}：${formatFailedStages(result)}`);
      }
    } catch (error) {
      const result = {
        accountId: account.id,
        accountName: account.displayName,
        usernameMasked: account.usernameMasked,
        success: false,
        stages: [
          {
            name: 'account',
            success: false,
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      } satisfies AccountRunResult;
      results.push(result);
      logger?.info(`账号执行失败：${accountLabel}：${formatFailedStages(result)}`);
    }
  }

  const successCount = results.filter((result) => result.success).length;
  logger?.info(`速维云自动签到执行完成：${successCount}/${accounts.length} 成功`);

  return {
    success: results.every((result) => result.success),
    accounts: results,
  };
}

function formatFailedStages(result: AccountRunResult): string {
  const failedStages = result.stages
    .filter((stage) => !stage.success)
    .map((stage) => `${stage.name}：${stage.message}`)
    .join('；');

  return failedStages || '未知错误';
}
